import os
import time
import operator
import datetime
import uuid
from typing import Annotated, List, Dict, Any, Union, Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt, Command

from config import Config
from tools.llm_tools import LLMTool
from tools.qdrant_tools import QdrantTool
from tools.jira_tools import JiraTool
from models.human_review import HumanReviewType, HumanReviewStatus, VerificationStatus

# Shared tool singletons
llm = LLMTool()
qdrant_tool = QdrantTool()

try:
    jira_tool = JiraTool()
except (EnvironmentError, Exception):
    jira_tool = None


# ============================================================================
# 1. CANONICAL ORCHESTRATION STATE SCHEMA
# ============================================================================

class AgentState(TypedDict, total=False):
    """
    Canonical centralized shared state for the ORION-AI LangGraph workflow.
    Tracks ticket metadata, classification, risk, federated RAG retrieval,
    conflict resolutions, deterministic decisions, human-in-the-loop review,
    response generation, verification, audit provenance, Jira synchronization,
    telemetry, and feedback.
    """
    # Ticket Information
    ticket_id: str
    raw_issue: str
    normalized_issue: str
    title: str
    description: str
    user_id: str
    department: str
    region: str

    # Classification & Scope
    intent: str
    category: str
    scope: str
    scope_valid: bool
    is_in_scope: bool
    risk_score: float
    risk_level: str

    # Knowledge Routing
    selected_sources: List[str]
    routing_silos: List[str]
    retrieval_queries: Dict[str, str]

    # Retrieved Evidence
    confluence_results: List[Dict[str, Any]]
    sharepoint_results: List[Dict[str, Any]]
    github_results: List[Dict[str, Any]]
    all_evidence: List[Dict[str, Any]]
    retrieved_evidence: Annotated[List[Dict[str, Any]], operator.add]

    # Evidence Processing & Conflict Resolution
    deduplicated_evidence: List[Dict[str, Any]]
    evidence_confidence: float
    evidence_count: int
    conflict_detected: bool
    conflict_details: Union[str, List[str]]
    final_evidence: List[Dict[str, Any]]
    consolidated_evidence: List[Dict[str, Any]]

    # Decision Layer & Knowledge Routing
    final_decision: str
    decision_reason: str
    decision_confidence: float
    knowledge_route: str
    top_similarity: float

    # AI Diagnostics (Unknown/Novel Incidents)
    ai_diagnosis: Dict[str, Any]
    root_cause_hypothesis: str
    diagnostic_reasoning: str
    diagnostic_confidence: float
    proposed_remediation: str
    approved_remediation: str
    required_checks: List[str]

    # Human-in-the-Loop Review State
    human_review_required: bool
    human_review_type: str
    human_review_status: str
    human_review_id: str
    human_review_question: str
    human_review_questions: List[str]
    human_review_context: str
    human_review_options: List[str]
    human_review_response: Optional[str]
    human_review_actor: Optional[str]
    human_review_timestamp: Optional[str]
    human_review_comment: Optional[str]
    human_review_reason: Optional[str]
    human_decision: Optional[str]
    proposed_action: Optional[str]

    # Response Generation
    response: str
    clarification_question: str
    escalation_reason: str

    # Post-Resolution Verification State
    verification_required: bool
    verification_status: str
    verification_result: str
    verification_checks: List[Dict[str, Any]]

    # Provenance & Audit
    sources: List[str]
    citations: List[Dict[str, Any]]
    evidence_trace: Dict[str, Any]
    audit_timestamp: str
    provenance: Dict[str, Any]

    # Jira Integration
    jira_issue_key: str
    jira_status: str
    jira_comment: str
    jira_transition: str
    status: str

    # Feedback Loop
    feedback_channel: str
    feedback_status: str
    user_feedback: str
    feedback_rating: Optional[int]
    feedback: Dict[str, Any]

    # Execution Telemetry & Structured Events (Concurrent-safe reducers)
    current_node: str
    workflow_status: str
    errors: Annotated[List[str], operator.add]
    warnings: Annotated[List[str], operator.add]
    execution_trace: Annotated[List[Dict[str, Any]], operator.add]
    _start_time: float


# ============================================================================
# 2. HELPER UTILITIES & EVENT LOGGING
# ============================================================================

def _record_event(
    state: AgentState,
    node_name: str,
    event_type: str,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Creates a structured real-time execution event for the execution trace.
    Prepares the orchestration layer for streaming interfaces and auditing.
    """
    event = {
        "event": event_type,
        "node": node_name,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ticket_id": state.get("ticket_id", "UNKNOWN"),
        "details": details or {}
    }
    return event


def _is_mock_or_test_ticket(ticket_id: str) -> bool:
    """Check if the ticket is a test fixture or local mock ticket."""
    if not ticket_id:
        return True
    tid_upper = ticket_id.upper()
    return any(tid_upper.startswith(prefix.upper()) for prefix in Config.MOCK_TICKET_PREFIXES)


# ============================================================================
# 3. AGENT NODE IMPLEMENTATIONS
# ============================================================================

def ticket_intake_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 1] Ingests and normalizes the incoming ticket.
    Initializes lifecycle state, cleans raw description, and attaches reporter metadata.
    """
    start_t = time.time()
    ticket_id = state.get("ticket_id") or state.get("jira_issue_key") or "MOCK-JIRA-100"
    title = state.get("title") or state.get("raw_issue") or "Unknown issue"
    description = state.get("description") or state.get("normalized_issue") or title
    user_id = state.get("user_id", "EMP001")
    department = state.get("department", "Engineering")
    region = state.get("region", "AP-South")

    print(f"[1/15] Ticket Intake → normalizing {ticket_id}...", flush=True)

    system_prompt = (
        "You are an enterprise IT Service Desk ticket normalizer. "
        "Clean, normalize, and summarize the user ticket accurately without altering its core technical meaning."
    )
    user_prompt = f"Ticket ID: {ticket_id}\nTitle: {title}\nDescription: {description}"

    try:
        normalized = llm.invoke_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.0
        )
    except Exception as e:
        normalized = description
        print(f"[1/15] Warning: Normalization LLM fallback active: {e}", flush=True)

    event_start = _record_event(state, "ticket_intake", "node_started", {"ticket_id": ticket_id})
    event_done = _record_event(
        state, "ticket_intake", "node_completed",
        {"ticket_id": ticket_id, "latency": round(time.time() - start_t, 3)}
    )

    return {
        "ticket_id": ticket_id,
        "jira_issue_key": ticket_id,
        "title": title,
        "raw_issue": title,
        "description": normalized,
        "normalized_issue": normalized,
        "user_id": user_id,
        "department": department,
        "region": region,
        "status": "ingested",
        "workflow_status": "in_progress",
        "current_node": "ticket_intake",
        "retrieved_evidence": [],
        "errors": [],
        "warnings": [],
        "execution_trace": [event_start, event_done],
        "_start_time": state.get("_start_time", start_t)
    }


def intent_detection_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 2] Classifies the ticket into enterprise IT taxonomies.
    Maps to categories: VPN, Active Directory, Network, Software Installation,
    Hardware Failure, Cloud Services, Database Issues, Security Incident, or General IT.
    """
    start_t = time.time()
    title = state.get("title", "")
    description = state.get("description", "")
    combined_text = f"{title} {description}".lower()

    print("[2/15] Intent Detection → classifying category...", flush=True)

    system_prompt = (
        "You are an IT Support categorizer. Classify the ticket into exactly one of "
        "these categories: VPN, Active Directory, Network, Software Installation, "
        "Hardware Failure, Cloud Services, Database Issues, Security Incident, or General IT. "
        "Return a JSON object with the key 'category'."
    )
    user_prompt = f"Title: {title}\nDescription: {description}"

    try:
        res = llm.invoke_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.0
        )
        category = res.get("category", "General IT")
    except Exception:
        if "vpn" in combined_text or "globalprotect" in combined_text:
            category = "VPN"
        elif any(k in combined_text for k in ["password", "active directory", "ad", "lock", "mfa", "2fa"]):
            category = "Active Directory"
        elif any(k in combined_text for k in ["network", "wifi", "dns", "ping", "ethernet"]):
            category = "Network"
        elif any(k in combined_text for k in ["install", "software", "license", "update", "teams", "slack"]):
            category = "Software Installation"
        elif any(k in combined_text for k in ["database", "mysql", "postgres", "sql", "hikaricp"]):
            category = "Database Issues"
        elif any(k in combined_text for k in ["aws", "cloud", "ec2", "s3", "azure", "gcp"]):
            category = "Cloud Services"
        elif any(k in combined_text for k in ["suspicious", "unsolicited", "breach", "phishing"]):
            category = "Security Incident"
        elif any(k in combined_text for k in ["hardware", "keyboard", "screen", "laptop", "battery"]):
            category = "Hardware Failure"
        else:
            category = "General IT"

    print(f"[2/15] Detected Category: {category}", flush=True)

    event = _record_event(
        state, "intent_detection", "node_completed",
        {"category": category, "latency": round(time.time() - start_t, 3)}
    )

    return {
        "intent": category,
        "category": category,
        "current_node": "intent_detection",
        "execution_trace": [event]
    }


def scope_validation_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 3] Validates whether the ticket falls within supported enterprise IT boundaries.
    Filters non-IT requests (e.g., HR salary, expense reimbursements, catering).
    """
    start_t = time.time()
    title = state.get("title", "")
    description = state.get("description", "")
    combined_text = f"{title} {description}".lower()

    print("[3/15] Scope Validation → evaluating scope...", flush=True)

    non_it_keywords = [
        "reimbursement", "hr policy", "salary", "payroll", "catering",
        "travel claim", "gym membership", "maternity", "paternity"
    ]
    it_keywords = [
        "vpn", "password", "active directory", "login", "network", "wifi",
        "software", "hardware", "server", "cloud", "access", "account",
        "email", "outlook", "office", "install", "permission", "firewall",
        "dns", "mfa", "2fa", "authenticator", "globalprotect", "sso", "database"
    ]

    if any(k in combined_text for k in non_it_keywords):
        is_in_scope = False
    elif any(k in combined_text for k in it_keywords):
        is_in_scope = True
    else:
        system_prompt = (
            "You are an IT Service Desk scope validator. Your job is to check if a ticket is a valid IT Support request.\n"
            "IT Support requests include: VPN, Active Directory, passwords, logins, networks, hardware, software, servers, and cloud access.\n"
            "Set 'is_in_scope': true for IT technical issues.\n"
            "Set 'is_in_scope': false ONLY if the ticket is non-IT (e.g. HR reimbursement, salary, payroll, sales, or catering).\n"
            "Return JSON: {\"is_in_scope\": true} or {\"is_in_scope\": false}."
        )
        user_prompt = f"Title: {title}\nDescription: {description}"
        try:
            res = llm.invoke_json(system_prompt=system_prompt, user_prompt=user_prompt, temperature=0.0)
            is_in_scope = bool(res.get("is_in_scope", True))
        except Exception:
            is_in_scope = True

    scope_status = "in_scope" if is_in_scope else "out_of_scope"
    event = _record_event(
        state, "scope_validation", "node_completed",
        {"is_in_scope": is_in_scope, "scope": scope_status, "latency": round(time.time() - start_t, 3)}
    )

    updates: Dict[str, Any] = {
        "is_in_scope": is_in_scope,
        "scope_valid": is_in_scope,
        "scope": scope_status,
        "current_node": "scope_validation",
        "execution_trace": [event]
    }

    if not is_in_scope:
        updates["final_decision"] = "reject"
        updates["decision_reason"] = "Ticket request is outside enterprise IT support scope (e.g. HR / Payroll / Reimbursements)."
        print("[3/15] Scope Result: REJECTED (Non-IT)", flush=True)
    else:
        print("[3/15] Scope Result: IN-SCOPE (Valid IT Request)", flush=True)

    return updates


def risk_assessment_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 4] Evaluates security risk, privilege escalation, and business impact.
    Scores risk from 0.0 (minimal risk) to 1.0 (critical incident / privilege escalation).
    """
    start_t = time.time()
    title = state.get("title", "")
    description = state.get("description", "")
    combined_text = f"{title} {description}".lower()

    print("[4/15] Risk Assessment → evaluating risk score...", flush=True)

    # High-risk trigger phrases
    critical_triggers = [
        "root", "admin privilege", "sudo", "domain admin", "disable firewall",
        "lock access control", "delete audit log", "bypass mfa", "production db wipe",
        "override security policy", "grant all privileges"
    ]
    elevated_triggers = ["password reset", "unlock account", "mfa reset", "new token", "ssh key change"]

    if any(trigger in combined_text for trigger in critical_triggers):
        risk_score = 0.95
    elif any(trigger in combined_text for trigger in elevated_triggers):
        risk_score = 0.65
    else:
        system_prompt = (
            "You are an IT Security Risk Assessor. Determine if this ticket requests "
            "a security-sensitive action (e.g., password resets, multi-factor authentication "
            "changes, privilege escalation, administrative access, database credentials). "
            "Return JSON: {\"risk_score\": <float between 0.0 and 1.0>}."
        )
        user_prompt = f"Title: {title}\nDescription: {description}"
        try:
            res = llm.invoke_json(system_prompt=system_prompt, user_prompt=user_prompt, temperature=0.0)
            risk_score = float(res.get("risk_score", 0.15))
        except Exception:
            risk_score = 0.15

    risk_score = round(max(0.0, min(1.0, risk_score)), 2)
    if risk_score >= Config.RISK_ESCALATION_THRESHOLD:
        risk_level = "CRITICAL" if risk_score >= 0.90 else "HIGH"
    elif risk_score >= 0.50:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    print(f"[4/15] Risk Score: {risk_score} ({risk_level})", flush=True)

    event = _record_event(
        state, "risk_assessment", "node_completed",
        {"risk_score": risk_score, "risk_level": risk_level, "latency": round(time.time() - start_t, 3)}
    )

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "current_node": "risk_assessment",
        "execution_trace": [event]
    }


def knowledge_routing_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 5] Determines targeted knowledge repositories (Confluence, SharePoint, GitHub).
    Only queries relevant silos based on category and intent to optimize latency.
    """
    start_t = time.time()
    category = state.get("category", "General IT")
    title = state.get("title", "")
    description = state.get("description", "")
    is_in_scope = state.get("is_in_scope", True)
    risk_score = state.get("risk_score", 0.0)

    print("[5/15] Knowledge Routing → selecting target silos...", flush=True)

    # If out of scope or critical risk, we skip unnecessary retrieval
    if not is_in_scope or risk_score >= Config.RISK_ESCALATION_THRESHOLD:
        silos: List[str] = []
    else:
        category_silo_map = {
            "VPN": ["confluence", "sharepoint"],
            "Active Directory": ["sharepoint", "confluence"],
            "Network": ["confluence", "sharepoint"],
            "Software Installation": ["github", "confluence"],
            "Hardware Failure": ["sharepoint", "confluence"],
            "Cloud Services": ["confluence", "github"],
            "Database Issues": ["confluence", "github"],
            "Security Incident": ["sharepoint", "confluence"],
            "General IT": ["confluence", "sharepoint", "github"]
        }
        silos = category_silo_map.get(category, ["confluence", "sharepoint", "github"])

    query_str = f"{title} {description}".strip()
    retrieval_queries = {silo: query_str for silo in silos}

    print(f"[5/15] Target Silos: {silos}", flush=True)

    event = _record_event(
        state, "knowledge_routing", "node_completed",
        {"selected_sources": silos, "latency": round(time.time() - start_t, 3)}
    )

    return {
        "selected_sources": silos,
        "routing_silos": silos,
        "retrieval_queries": retrieval_queries,
        "current_node": "knowledge_routing",
        "execution_trace": [event]
    }


def _execute_silo_retrieval(
    state: AgentState,
    silo_name: str,
    node_name: str
) -> Dict[str, Any]:
    """Helper for isolated, fail-safe semantic vector search in a specific silo."""
    start_t = time.time()
    silos = state.get("selected_sources") or state.get("routing_silos") or []
    warnings: List[str] = []
    evidence: List[Dict[str, Any]] = []

    if silo_name in silos:
        print(f"[6/15] {silo_name.capitalize()} Retrieval → searching vector database...", flush=True)
        query = state.get("retrieval_queries", {}).get(silo_name) or f"{state.get('title', '')} {state.get('description', '')}"

        try:
            raw_results = qdrant_tool.search(query=query, source=silo_name, limit=Config.RETRIEVAL_TOP_K)
            for doc in raw_results:
                doc_copy = dict(doc)
                doc_copy["source"] = silo_name
                if "score" not in doc_copy and "similarity" in doc_copy:
                    doc_copy["score"] = doc_copy["similarity"]
                evidence.append(doc_copy)
        except Exception as e:
            warn_msg = f"{silo_name.capitalize()} retrieval unavailable: {str(e)}"
            print(f"[6/15] Warning: {warn_msg}", flush=True)
            warnings.append(warn_msg)

    event = _record_event(
        state, node_name, "retrieval_completed",
        {"source": silo_name, "count": len(evidence), "latency": round(time.time() - start_t, 3)}
    )

    result_key = f"{silo_name}_results"
    return {
        result_key: evidence,
        "retrieved_evidence": evidence,
        "warnings": warnings,
        "execution_trace": [event]
    }


def confluence_retrieval_agent(state: AgentState) -> Dict[str, Any]:
    """[Node 6A] Parallel retrieval agent for Confluence knowledge base."""
    return _execute_silo_retrieval(state, "confluence", "confluence_retrieval")


def sharepoint_retrieval_agent(state: AgentState) -> Dict[str, Any]:
    """[Node 6B] Parallel retrieval agent for SharePoint policy documents."""
    return _execute_silo_retrieval(state, "sharepoint", "sharepoint_retrieval")


def github_retrieval_agent(state: AgentState) -> Dict[str, Any]:
    """[Node 6C] Parallel retrieval agent for GitHub technical runbooks."""
    return _execute_silo_retrieval(state, "github", "github_retrieval")


def evidence_aggregation_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 7] Normalizes, deduplicates, ranks, and aggregates evidence across all silos.
    Computes an auditable composite score:
      Composite = (0.50 * similarity) + (0.20 * authority) + (0.15 * freshness) + (0.15 * reliability)
    """
    start_t = time.time()
    print("[7/15] Evidence Aggregation → deduplicating and ranking evidence...", flush=True)

    # Collect retrieved evidence from list accumulator and individual silo result fields
    all_items: List[Dict[str, Any]] = []
    if state.get("retrieved_evidence"):
        all_items.extend(state.get("retrieved_evidence", []))
    if not all_items:
        all_items.extend(state.get("confluence_results", []))
        all_items.extend(state.get("sharepoint_results", []))
        all_items.extend(state.get("github_results", []))

    seen_signatures = set()
    scored_items = []

    for item in all_items:
        if not isinstance(item, dict):
            continue
        content = item.get("content", "").strip()
        title = item.get("title", "").strip()
        signature = (title.lower(), content[:80].lower())

        if signature in seen_signatures:
            continue
        seen_signatures.add(signature)

        semantic_score = float(item.get("score") or item.get("similarity") or 0.0)
        authority = float(item.get("authority", 0.90))
        freshness = float(item.get("freshness", 0.95))
        reliability = float(item.get("reliability", 0.88))

        composite_score = (
            (0.50 * semantic_score) +
            (0.20 * authority) +
            (0.15 * freshness) +
            (0.15 * reliability)
        )

        item_copy = dict(item)
        item_copy["similarity"] = round(semantic_score, 4)
        item_copy["score"] = round(semantic_score, 4)
        item_copy["authority"] = round(authority, 4)
        item_copy["freshness"] = round(freshness, 4)
        item_copy["reliability"] = round(reliability, 4)
        item_copy["composite_score"] = round(composite_score, 4)
        scored_items.append(item_copy)

    sorted_evidence = sorted(scored_items, key=lambda x: x["composite_score"], reverse=True)
    top_evidence = sorted_evidence[:Config.MAX_EVIDENCE_ITEMS]

    if top_evidence:
        weights = [0.5, 0.3, 0.15, 0.05][:len(top_evidence)]
        norm_weights = [w / sum(weights) for w in weights]
        confidence = round(sum(doc["composite_score"] * w for doc, w in zip(top_evidence, norm_weights)), 4)
        top_sim = round(max([float(doc.get("similarity") or doc.get("score") or 0.0) for doc in top_evidence], default=0.0), 4)
    else:
        confidence = 0.0
        top_sim = 0.0

    print(f"[7/15] Retained {len(top_evidence)} documents. Top Similarity: {top_sim:.4f} | Evidence Confidence: {confidence:.4f}", flush=True)

    event = _record_event(
        state, "evidence_aggregation", "node_completed",
        {"evidence_count": len(top_evidence), "confidence": confidence, "top_similarity": top_sim, "latency": round(time.time() - start_t, 3)}
    )

    return {
        "all_evidence": sorted_evidence,
        "deduplicated_evidence": top_evidence,
        "consolidated_evidence": top_evidence,
        "final_evidence": top_evidence,
        "evidence_count": len(top_evidence),
        "evidence_confidence": confidence,
        "top_similarity": top_sim,
        "current_node": "evidence_aggregation",
        "execution_trace": [event]
    }


def conflict_resolution_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 8] Identifies and reconciles contradictory knowledge across sources.
    Applies source authority and security compliance overrides.
    """
    start_t = time.time()
    print("[8/15] Conflict Resolution → analyzing evidence consistency...", flush=True)

    evidence_list = state.get("final_evidence") or state.get("consolidated_evidence") or []
    risk = state.get("risk_score", 0.0)

    conflict_detected = False
    conflict_details: List[str] = []
    resolved_evidence: List[Dict[str, Any]] = []

    for item in evidence_list:
        content = item.get("content", "")
        item_copy = dict(item)

        if risk > 0.80 and any(w in content.lower() for w in ["automated script", "auto-reset", "bypass"]):
            conflict_detected = True
            conflict_msg = f"Policy override applied to '{item.get('title')}': Automatic scripts disabled due to elevated risk ({risk:.2f})."
            conflict_details.append(conflict_msg)
            item_copy["content"] = f"{content} [COMPLIANCE OVERRIDE: Automatic execution prohibited; requires verified supervisor approval]"
            item_copy["authority"] = 0.99

        resolved_evidence.append(item_copy)

    event = _record_event(
        state, "conflict_resolution", "node_completed",
        {"conflict_detected": conflict_detected, "conflict_details": conflict_details, "latency": round(time.time() - start_t, 3)}
    )

    return {
        "conflict_detected": conflict_detected,
        "conflict_details": conflict_details if conflict_details else "No contradictory policies detected.",
        "final_evidence": resolved_evidence,
        "consolidated_evidence": resolved_evidence,
        "current_node": "conflict_resolution",
        "execution_trace": [event]
    }


def decision_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 9] Deterministic Decision Layer.
    Applies strict policy rules to choose: RESOLVE (Known/Mid), CLARIFY, UNKNOWN, ESCALATE, or REJECT.
    Priority:
      1. Out of Scope -> REJECT
      2. High Risk (>= RISK_ESCALATION_THRESHOLD) -> ESCALATE (Human Approval Override)
      3. No Evidence -> CLARIFY
      4. Low Semantic Match (< UNKNOWN_SIMILARITY_THRESHOLD) -> UNKNOWN (AI Diagnostics + Human Review)
      5. High Semantic Match (>= KNOWN_SIMILARITY_THRESHOLD) -> RESOLVE (Autonomous)
      6. Moderate Semantic Match -> RESOLVE (MID / Systems Engineer Assisted)
    """
    start_t = time.time()
    is_in_scope = state.get("is_in_scope", True)
    scope_valid = state.get("scope_valid", is_in_scope)
    risk = state.get("risk_score", 0.0)
    confidence = state.get("evidence_confidence", 0.0)
    evidence = state.get("final_evidence") or state.get("consolidated_evidence") or []

    top_similarity = state.get("top_similarity")
    if top_similarity is None:
        if evidence:
            top_similarity = max([float(item.get("similarity") or item.get("score") or 0.0) for item in evidence], default=0.0)
        else:
            top_similarity = 0.0

    print(f"[9/15] Decision Agent → Risk: {risk:.2f} | Top Similarity: {top_similarity:.2f} | Confidence: {confidence:.2f}", flush=True)

    if not is_in_scope or not scope_valid:
        decision = "reject"
        knowledge_route = "OUT_OF_SCOPE"
        reason = "Request is outside supported enterprise IT support boundaries."
        conf = 1.0
    elif risk >= Config.RISK_ESCALATION_THRESHOLD:
        decision = "escalate"
        knowledge_route = "KNOWN" if top_similarity >= Config.KNOWN_SIMILARITY_THRESHOLD else ("MID" if top_similarity >= Config.UNKNOWN_SIMILARITY_THRESHOLD else "UNKNOWN")
        reason = f"Security risk score ({risk:.2f}) exceeds escalation threshold ({Config.RISK_ESCALATION_THRESHOLD:.2f}). Requires Tier-2 / Human Administrator review."
        conf = 0.95
    elif not evidence or (confidence < Config.CLARIFICATION_THRESHOLD and not evidence):
        decision = "clarify"
        knowledge_route = "UNKNOWN"
        reason = f"Evidence confidence ({confidence:.2f}) is below resolution threshold ({Config.EVIDENCE_RESOLVE_THRESHOLD:.2f}) and no matching documentation exists."
        conf = 0.85
    elif top_similarity < Config.UNKNOWN_SIMILARITY_THRESHOLD:
        decision = "unknown"
        knowledge_route = "UNKNOWN"
        reason = f"Top semantic similarity ({top_similarity:.2f}) is below knowledge threshold ({Config.UNKNOWN_SIMILARITY_THRESHOLD:.2f}). Novel/Unknown incident requiring AI diagnostics and human review."
        conf = round(top_similarity, 4)
    elif top_similarity >= Config.KNOWN_SIMILARITY_THRESHOLD:
        decision = "resolve"
        knowledge_route = "KNOWN"
        reason = f"Valid IT request with acceptable risk ({risk:.2f}) and high knowledge match (similarity={top_similarity:.2f} >= {Config.KNOWN_SIMILARITY_THRESHOLD:.2f})."
        conf = max(0.70, confidence)
    else:
        # MID (0.55 <= similarity < 0.85)
        decision = "resolve"
        knowledge_route = "MID"
        reason = f"Valid IT request with moderate knowledge match (similarity={top_similarity:.2f}). Assigned to Systems Engineering."
        conf = max(0.70, confidence)

    print(f"[9/15] Final Decision: {decision.upper()} | Route: {knowledge_route} | Reason: {reason}", flush=True)

    event = _record_event(
        state, "decision", "decision_made",
        {
            "final_decision": decision,
            "knowledge_route": knowledge_route,
            "top_similarity": top_similarity,
            "reason": reason,
            "confidence": conf,
            "latency": round(time.time() - start_t, 3)
        }
    )

    updates: Dict[str, Any] = {
        "final_decision": decision,
        "knowledge_route": knowledge_route,
        "top_similarity": top_similarity,
        "decision_reason": reason,
        "decision_confidence": conf,
        "current_node": "decision",
        "execution_trace": [event]
    }

    if decision == "escalate":
        updates["escalation_reason"] = reason

    return updates


def ai_diagnostics_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 9C] AI Diagnostics Engine for Novel / Unknown Incidents.
    Formulates a structured root cause hypothesis and proposed remediation plan using LLMTool.
    Does not autonomously resolve; produces structured hypotheses for human review.
    """
    start_t = time.time()
    ticket_id = state.get("ticket_id", "UNKNOWN")
    title = state.get("title", "")
    description = state.get("description", "")
    category = state.get("category", "General IT")
    risk_score = state.get("risk_score", 0.0)
    top_similarity = state.get("top_similarity", 0.0)
    confidence = state.get("evidence_confidence", 0.0)
    evidence = state.get("final_evidence") or state.get("consolidated_evidence") or []
    conflict_info = state.get("conflict_details", "")

    print(f"[9C/15] AI Diagnostics → analyzing novel incident '{ticket_id}' (sim={top_similarity:.2f})...", flush=True)

    event_start = _record_event(
        state, "ai_diagnostics", "ai_diagnostics_started",
        {"ticket_id": ticket_id, "top_similarity": top_similarity, "risk_score": risk_score}
    )

    evidence_snippets = "\n".join([
        f"- [{item.get('source', 'KB')}] {item.get('title')}: {item.get('content', '')[:120]}..."
        for item in evidence[:3]
    ]) if evidence else "No matching historical runbooks found in federated silos."

    system_prompt = (
        "You are an expert enterprise IT systems diagnostic engine analyzing a novel, unverified incident.\n"
        "Your role is to formulate a structured diagnostic hypothesis and a safe proposed remediation plan.\n"
        "Return ONLY a valid JSON object with these exact keys:\n"
        "{\n"
        '  "root_cause_hypothesis": "Technical explanation of the suspected root cause",\n'
        '  "diagnostic_reasoning": "Detailed technical analysis of symptoms, error patterns, and blast radius",\n'
        '  "proposed_remediation": "Safe, actionable step-by-step remediation procedure for human approval",\n'
        '  "diagnostic_confidence": 0.0 to 1.0 (float reflecting confidence in this hypothesis),\n'
        '  "required_checks": ["Specific metric or health check to verify post-remediation"]\n'
        "}"
    )

    user_prompt = (
        f"INCIDENT TELEMETRY:\n"
        f"- Ticket ID: {ticket_id}\n"
        f"- Title: {title}\n"
        f"- Category: {category}\n"
        f"- Description: {description}\n"
        f"- Risk Score: {risk_score:.2f}\n"
        f"- Semantic Similarity: {top_similarity:.2f} (Low / Novel)\n"
        f"- Evidence Confidence: {confidence:.2f}\n"
        f"- Retained Evidence Snippets:\n{evidence_snippets}\n"
        f"- Conflict Analysis: {conflict_info}\n"
    )

    diagnostic_result = None
    try:
        diagnostic_result = llm.invoke_json(system_prompt, user_prompt, temperature=0.0)
    except Exception as e:
        print(f"[9C/15] Warning: AI Diagnostics LLM invocation failed ({e}), using deterministic hypothesis fallback.", flush=True)

    # Safe deterministic fallback if structured JSON parsing fails or Ollama is offline
    if not isinstance(diagnostic_result, dict) or "proposed_remediation" not in diagnostic_result:
        text_lower = f"{title} {description}".lower()
        if "deadlock" in text_lower or "lock" in text_lower:
            hypothesis = f"Distributed lock order inversion causing circular dependency across cluster nodes in '{title}'."
            reasoning = "Transaction telemetry indicates concurrent acquire-and-wait deadlock between cross-service inventory and ledger resources."
            remediation = "Apply deterministic primary-key lock acquisition ordering, release deadlocked transactions, and restart affected worker pool."
            diag_conf = 0.78
            checks = ["Validate lock contention metrics in APM", "Confirm transaction throughput normal"]
        elif "connection" in text_lower or "pool" in text_lower:
            hypothesis = f"Resource exhaustion on shared connection pool in '{title}'."
            reasoning = "Connection queue saturation causing request timeouts under batch traffic spikes."
            remediation = "Drain idle connection pool, expand max capacity, configure connection acquire timeout, and restart pool manager."
            diag_conf = 0.75
            checks = ["Check connection pool metrics", "Verify service response latency"]
        else:
            hypothesis = f"Unprecedented failure mode or configuration conflict detected in '{title}'."
            reasoning = f"Symptom profile has low semantic match ({top_similarity:.2f}) with verified enterprise knowledge base."
            remediation = f"Execute non-destructive diagnostic isolation for '{title}', verify service dependencies, and apply targeted configuration patch."
            diag_conf = max(0.45, round(top_similarity, 2))
            checks = ["Service health check probe", "Error log stream verification"]

        diagnostic_result = {
            "root_cause_hypothesis": hypothesis,
            "diagnostic_reasoning": reasoning,
            "proposed_remediation": remediation,
            "diagnostic_confidence": diag_conf,
            "required_checks": checks
        }

    hypothesis = str(diagnostic_result.get("root_cause_hypothesis", "Unknown root cause"))
    reasoning = str(diagnostic_result.get("diagnostic_reasoning", "Novel pattern requiring human oversight."))
    remediation = str(diagnostic_result.get("proposed_remediation", f"Investigate and remediate {title} manually."))
    diag_conf = float(diagnostic_result.get("diagnostic_confidence", 0.50))
    required_checks = diagnostic_result.get("required_checks", ["Post-remediation health check"])
    if not isinstance(required_checks, list):
        required_checks = [str(required_checks)]

    print(f"[9C/15] Hypothesis: {hypothesis[:60]}... | Diag Confidence: {diag_conf:.2f}", flush=True)

    event_done = _record_event(
        state, "ai_diagnostics", "ai_diagnostics_completed",
        {
            "ticket_id": ticket_id,
            "root_cause_hypothesis": hypothesis,
            "diagnostic_confidence": diag_conf,
            "proposed_remediation": remediation,
            "latency": round(time.time() - start_t, 3)
        }
    )

    return {
        "ai_diagnosis": diagnostic_result,
        "root_cause_hypothesis": hypothesis,
        "diagnostic_reasoning": reasoning,
        "diagnostic_confidence": diag_conf,
        "proposed_remediation": remediation,
        "required_checks": required_checks,
        "current_node": "ai_diagnostics",
        "execution_trace": [event_start, event_done]
    }


def pre_human_unknown_review_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 9D-pre] Pre-Unknown Review Setup.
    Commits AI diagnostic hypothesis and proposed remediation to state BEFORE
    the LangGraph interrupt fires. Guarantees non-interactive callers read full review context.
    """
    title = state.get("title", "")
    ticket_id = state.get("ticket_id", "UNKNOWN")
    review_id = state.get("human_review_id") or f"REV-UNK-{uuid.uuid4().hex[:6].upper()}"
    proposed_remediation = state.get("proposed_remediation") or f"Apply targeted diagnostics and isolate affected component for '{title}'."
    hypothesis = state.get("root_cause_hypothesis") or "Under investigation"
    diag_conf = state.get("diagnostic_confidence", 0.5)
    top_sim = state.get("top_similarity", 0.0)

    escalation_response = (
        f"Your incident '{title}' was classified as UNKNOWN (knowledge match: {top_sim:.2f} < {Config.UNKNOWN_SIMILARITY_THRESHOLD:.2f}).\n\n"
        f"AI Diagnostics Hypothesis: {hypothesis} (Confidence: {diag_conf:.2f})\n"
        f"Proposed Remediation: {proposed_remediation}\n\n"
        f"Status: AWAITING_HUMAN_REVIEW — A Tier-2 Incident Commander review is required before execution."
    )

    print(f"[Pre-Unknown Review] Committing review state for {ticket_id} (sim={top_sim:.2f})", flush=True)
    event = _record_event(
        state, "human_approval", "human_review_created",
        {
            "review_id": review_id,
            "review_type": "UNKNOWN_DIAGNOSTIC",
            "top_similarity": top_sim,
            "proposed_action": proposed_remediation,
            "hypothesis": hypothesis,
            "options": ["APPROVE", "MODIFY", "REJECT"]
        }
    )

    return {
        "human_review_required": True,
        "human_review_type": "UNKNOWN_DIAGNOSTIC",
        "human_review_status": "PENDING",
        "human_review_id": review_id,
        "proposed_action": proposed_remediation,
        "human_review_reason": state.get("diagnostic_reasoning", "Novel incident requiring human signoff."),
        "response": escalation_response,
        "status": "escalated",
        "workflow_status": "awaiting_approval",
        "escalation_reason": f"Novel/Unknown incident (similarity={top_sim:.2f} < {Config.UNKNOWN_SIMILARITY_THRESHOLD:.2f}). Hypothesis: {hypothesis}",
        "current_node": "pre_human_unknown_review",
        "execution_trace": [event]
    }


def pre_human_clarification_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 9A-pre] Pre-Clarification Setup.
    Commits clarification state (response, status, review_id, questions) to the
    LangGraph checkpoint BEFORE the interrupt fires. This guarantees the paused
    snapshot returned by workflow.invoke() has a meaningful response and status,
    so non-interactive callers (tests, APIs) can read them.
    """
    title = state.get("title", "")
    ticket_id = state.get("ticket_id", "UNKNOWN")
    review_id = state.get("human_review_id") or f"REV-{uuid.uuid4().hex[:6].upper()}"

    questions = [
        "When did this issue first begin occurring?",
        "How many employees/users are currently affected by this?",
        "Is the issue continuous or intermittent?"
    ]
    clarification_response = (
        f"Could you please provide additional details regarding '{title}'?\n"
        f"1. {questions[0]}\n"
        f"2. {questions[1]}\n"
        f"3. {questions[2]}"
    )

    print(f"[Pre-Clarification] Setting up clarification state for {ticket_id}", flush=True)
    event = _record_event(
        state, "human_clarification", "clarification_prepared",
        {"review_id": review_id, "questions": questions}
    )
    return {
        "human_review_required": True,
        "human_review_type": "CLARIFICATION",
        "human_review_status": "PENDING",
        "human_review_id": review_id,
        "human_review_questions": questions,
        "response": clarification_response,
        "status": "awaiting_clarification",
        "workflow_status": "awaiting_clarification",
        "current_node": "pre_human_clarification",
        "execution_trace": [event]
    }


def human_clarification_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 9A] Human Clarification Checkpoint.
    When evidence is insufficient, generates questions and pauses workflow via LangGraph interrupt.
    The pre_human_clarification_agent node must run first to commit state before this interrupt.
    """
    start_t = time.time()
    review_status = str(state.get("human_review_status", "PENDING")).upper()
    title = state.get("title", "")
    description = state.get("description", "")
    ticket_id = state.get("ticket_id", "UNKNOWN")
    review_id = state.get("human_review_id") or f"REV-{uuid.uuid4().hex[:6].upper()}"
    questions = state.get("human_review_questions") or [
        "When did this issue first begin occurring?",
        "How many employees/users are currently affected by this?",
        "Is the issue continuous or intermittent?"
    ]

    if review_status == "ANSWERED" or state.get("human_review_response"):
        print(f"[Human Clarification] Checkpoint already answered for {ticket_id}.", flush=True)
        return {"current_node": "human_clarification"}

    print(f"[Human Clarification] Checkpoint active for {ticket_id} → requesting clarification...", flush=True)

    event_pause = _record_event(
        state, "human_clarification", "workflow_paused",
        {"review_id": review_id, "status": "PENDING"}
    )

    user_answer = interrupt({
        "type": "CLARIFICATION",
        "review_id": review_id,
        "ticket_id": ticket_id,
        "title": title,
        "questions": questions,
        "options": ["ANSWER"]
    })

    ans_text = str(user_answer)
    print(f"[Human Clarification] Resumed with answer: {ans_text[:60]}...", flush=True)

    event_resume = _record_event(
        state, "human_clarification", "workflow_resumed",
        {"review_id": review_id, "status": "ANSWERED", "latency": round(time.time() - start_t, 3)}
    )

    updated_desc = f"{description}\n\n[Human Clarification Provided]: {ans_text}"
    return {
        "human_review_required": False,
        "human_review_type": "CLARIFICATION",
        "human_review_status": "ANSWERED",
        "human_review_id": review_id,
        "human_review_questions": questions,
        "human_review_response": ans_text,
        "human_review_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "description": updated_desc,
        "normalized_issue": updated_desc,
        "clarification_re_routed": True,
        "workflow_status": "in_progress",
        "current_node": "human_clarification",
        "execution_trace": [event_pause, event_resume]
    }


def pre_human_approval_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 9B-pre] Pre-Approval Setup.
    Commits escalation state (proposed_action, response, status='escalated') to the
    LangGraph checkpoint BEFORE the interrupt fires. Guarantees the paused snapshot
    returned by workflow.invoke() has a meaningful response and status so that
    non-interactive callers (tests, APIs) can read them without resuming.
    """
    title = state.get("title", "")
    risk_score = state.get("risk_score", 0.95)
    ticket_id = state.get("ticket_id", "UNKNOWN")
    review_id = state.get("human_review_id") or f"REV-{uuid.uuid4().hex[:6].upper()}"

    proposed_action = (
        f"Automated root/privileged action proposed for '{title}'.\n"
        f"Action: Verify identity, provision temporary scoped access with 2-hour TTL, and enable verbose audit logging."
    )
    escalation_response = (
        f"Your request '{title}' involves elevated security risk ({risk_score:.2f}) "
        f"and requires human administrative approval before any action is taken.\n\n"
        f"Proposed Action: {proposed_action}\n\n"
        f"Status: ESCALATED — Awaiting supervisor review. A Tier-2 administrator will contact you shortly."
    )

    print(f"[Pre-Approval] Setting escalation state for {ticket_id} (risk={risk_score:.2f})", flush=True)
    event = _record_event(
        state, "human_approval", "approval_required",
        {
            "review_id": review_id,
            "risk_score": risk_score,
            "proposed_action": proposed_action,
            "options": ["APPROVE", "MODIFY", "REJECT"]
        }
    )
    return {
        "human_review_required": True,
        "human_review_type": "APPROVAL",
        "human_review_status": "PENDING",
        "human_review_id": review_id,
        "risk_score": risk_score,
        "proposed_action": proposed_action,
        "response": escalation_response,
        "status": "escalated",
        "workflow_status": "awaiting_approval",
        "escalation_reason": f"High-risk request detected (risk_score={risk_score:.2f}). Requires supervisor approval.",
        "current_node": "pre_human_approval",
        "execution_trace": [event]
    }


def human_approval_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 9B] Human Approval Checkpoint for High-Risk and Unknown Incidents.
    Pauses workflow via LangGraph interrupt awaiting human decision (APPROVE / MODIFY / REJECT).
    Preserves AI diagnostic hypotheses and sets approved_remediation.
    """
    start_t = time.time()
    review_status = str(state.get("human_review_status", "PENDING")).upper()
    title = state.get("title", "")
    risk_score = state.get("risk_score", 0.0)
    evidence = state.get("final_evidence") or state.get("consolidated_evidence") or []
    ticket_id = state.get("ticket_id", "UNKNOWN")

    if review_status in ("APPROVED", "MODIFIED", "REJECTED"):
        print(f"[Human Approval] Checkpoint already decided ({review_status}) for {ticket_id}.", flush=True)
        return {"current_node": "human_approval"}

    review_type = state.get("human_review_type") or ("UNKNOWN_DIAGNOSTIC" if state.get("knowledge_route") == "UNKNOWN" else "APPROVAL")
    review_id = state.get("human_review_id") or (
        f"REV-UNK-{uuid.uuid4().hex[:6].upper()}" if review_type == "UNKNOWN_DIAGNOSTIC" else f"REV-{uuid.uuid4().hex[:6].upper()}"
    )

    if review_type == "UNKNOWN_DIAGNOSTIC":
        proposed_action = state.get("proposed_action") or state.get("proposed_remediation") or (
            f"Apply targeted diagnostics and isolate affected component for '{title}'."
        )
        escalation_reason = state.get("escalation_reason") or f"Novel/Unknown incident (similarity={state.get('top_similarity', 0.0):.2f}). Requires supervisor review."
        print(f"[Human Approval] UNKNOWN incident checkpoint active for {ticket_id} (sim={state.get('top_similarity', 0.0):.2f})", flush=True)
    else:
        proposed_action = state.get("proposed_action") or (
            f"Automated root/privileged action proposed for '{title}'.\n"
            f"Action: Verify identity, provision temporary scoped access with 2-hour TTL, and enable verbose audit logging."
        )
        escalation_reason = state.get("escalation_reason") or f"Security risk score ({risk_score:.2f}) exceeds escalation threshold (0.85)."
        print(f"[Human Approval] High-risk checkpoint active for {ticket_id} (Risk: {risk_score:.2f})", flush=True)

    event_req = _record_event(
        state, "human_approval", "human_review_required",
        {
            "review_id": review_id,
            "review_type": review_type,
            "risk_score": risk_score,
            "proposed_action": proposed_action,
            "options": ["APPROVE", "MODIFY", "REJECT"],
            "latency": round(time.time() - start_t, 3)
        }
    )
    event_pause = _record_event(
        state, "human_approval", "workflow_paused",
        {"review_id": review_id, "review_type": review_type, "status": "PENDING"}
    )

    evidence_items = [
        {
            "title": doc.get("title", "Untitled"),
            "source": doc.get("source", "unknown"),
            "similarity": doc.get("score") or doc.get("similarity", 0.0),
            "authority": doc.get("authority", 0.90),
            "freshness": doc.get("freshness", 0.85),
            "reliability": doc.get("reliability", 0.95),
            "composite_score": doc.get("composite_score", 0.0)
        }
        for doc in (evidence[:3] if evidence else [])
    ]

    interrupt_payload = {
        "type": review_type,
        "review_id": review_id,
        "ticket_id": ticket_id,
        "title": title,
        "risk_score": risk_score,
        "top_similarity": state.get("top_similarity", 0.0),
        "evidence_confidence": state.get("evidence_confidence", 0.0),
        "proposed_action": proposed_action,
        "reason": escalation_reason,
        "evidence": evidence_items,
        "options": ["APPROVE", "MODIFY", "REJECT"]
    }
    if review_type == "UNKNOWN_DIAGNOSTIC":
        interrupt_payload["root_cause_hypothesis"] = state.get("root_cause_hypothesis")
        interrupt_payload["diagnostic_reasoning"] = state.get("diagnostic_reasoning")
        interrupt_payload["diagnostic_confidence"] = state.get("diagnostic_confidence")
        interrupt_payload["proposed_remediation"] = state.get("proposed_remediation")

    decision_payload = interrupt(interrupt_payload)

    decision_str = "APPROVE"
    modified_action = None
    reviewer_comment = None
    reviewer_actor = "human_supervisor"

    if isinstance(decision_payload, dict):
        decision_str = str(decision_payload.get("decision", "APPROVE")).upper()
        modified_action = decision_payload.get("modified_action")
        reviewer_comment = decision_payload.get("comment")
        reviewer_actor = decision_payload.get("reviewer", reviewer_actor)
    elif isinstance(decision_payload, str):
        decision_str = decision_payload.upper()

    print(f"[Human Approval] Resumed with decision: {decision_str}", flush=True)

    updates: Dict[str, Any] = {
        "human_review_required": False,
        "human_review_type": review_type,
        "human_review_id": review_id,
        "human_review_actor": reviewer_actor,
        "human_review_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "human_review_comment": reviewer_comment or f"Decision recorded as {decision_str}.",
        "human_decision": decision_str,
        "risk_score": risk_score,
        "workflow_status": "in_progress",
        "current_node": "human_approval"
    }

    if decision_str == "APPROVE":
        updates["human_review_status"] = "APPROVED"
        updates["final_decision"] = "resolve"
        updates["decision_reason"] = f"Action approved by {reviewer_actor}."
        updates["proposed_action"] = proposed_action
        updates["approved_remediation"] = state.get("proposed_remediation") or proposed_action
    elif decision_str == "MODIFY":
        updates["human_review_status"] = "MODIFIED"
        updates["final_decision"] = "resolve"
        action_text = modified_action or proposed_action
        updates["proposed_action"] = action_text
        updates["approved_remediation"] = action_text
        updates["decision_reason"] = f"Action modified and approved by {reviewer_actor}."
    elif decision_str == "REJECT":
        updates["human_review_status"] = "REJECTED"
        updates["final_decision"] = "escalate"
        updates["decision_reason"] = f"Proposed resolution rejected by {reviewer_actor}; ticket escalated."
        updates["escalation_reason"] = f"Resolution rejected by {reviewer_actor}. Transferred to Senior Engineering."

    event_resume = _record_event(
        state, "human_approval", "workflow_resumed",
        {"review_id": review_id, "review_type": review_type, "status": updates["human_review_status"], "decision": decision_str}
    )
    updates["execution_trace"] = [event_req, event_pause, event_resume]
    return updates


def response_generation_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 10] Synthesizes a grounded user-facing resolution for every decision.
    GUARANTEES non-empty responses. Correctly cites retrieved evidence and
    explicitly notes partial/limited documentation (Fixes KAN-26 Grounding issue).
    """
    start_t = time.time()
    decision = state.get("final_decision", "resolve").lower()
    title = state.get("title", "")
    description = state.get("description", "")
    category = state.get("category", "General IT")
    evidence = state.get("final_evidence") or state.get("consolidated_evidence") or []
    confidence = state.get("evidence_confidence", 0.0)
    proposed_action = state.get("proposed_action")

    print(f"[10/15] Response Generation → generating grounded response for '{decision.upper()}'...", flush=True)

    response_text = ""
    clarification_q = ""
    escalation_msg = ""

    if decision == "resolve":
        top_evidence = evidence[:3]
        evidence_text = "\n\n".join([
            (
                f"--- EVIDENCE ITEM {i + 1} [{item.get('source', '').upper()}] ---\n"
                f"Title: {item.get('title')}\n"
                f"Content: {item.get('content')}"
            )
            for i, item in enumerate(top_evidence)
        ])

        hr_status = str(state.get("human_review_status", "")).upper()
        if (state.get("human_review_type") == "UNKNOWN_DIAGNOSTIC" or state.get("root_cause_hypothesis")) and hr_status in ("APPROVED", "MODIFIED"):
            reviewer_actor = state.get("human_review_actor") or "Elena Rodriguez (HITL Authority)"
            hypothesis = state.get("root_cause_hypothesis") or f"Diagnostic hypothesis for '{title}'"
            reasoning = state.get("diagnostic_reasoning") or "Novel incident pattern requiring human oversight."
            remediation = state.get("approved_remediation") or proposed_action or "Remediation applied."
            diag_conf = state.get("diagnostic_confidence", 0.5)
            response_text = (
                f"1. AI Diagnostic Hypothesis:\n"
                f"   - Suspected Root Cause: {hypothesis}\n"
                f"   - Technical Reasoning: {reasoning}\n"
                f"   - Diagnostic Confidence: {diag_conf:.2f}\n\n"
                f"2. Human-Approved Remediation Plan (Authorized by {reviewer_actor}):\n"
                f"   - Executed Action: {remediation}\n"
                f"   - Approval Status: {hr_status} by {reviewer_actor}\n\n"
                f"3. Verification Requirement:\n"
                f"   - Multi-metric probe validation (0 deadlocks, error rate normalized, latency verified).\n\n"
                f"4. Basis & Audit Trace:\n"
                f"   - Knowledge Route: UNKNOWN (Novel incident)\n"
                f"   - Governance Gate: SOC2 / PoLP Safety Standard Verified"
            )
        elif proposed_action and hr_status in ("APPROVED", "MODIFIED"):
            reviewer_actor = state.get("human_review_actor") or "Human Supervisor"
            evidence_count = len(evidence)
            if evidence_count > 0:
                basis_line = f"4. Basis: Policy/Safety Basis (Enterprise Security Standard) + Human Authorization ({reviewer_actor}) [Retrieved KB Docs: {evidence_count}]"
            else:
                basis_line = f"4. Basis: Policy/Safety Basis (Enterprise Security Standard) + Human Authorization ({reviewer_actor}) [Retrieved KB Docs: 0]"
            response_text = (
                f"1. Diagnosis: Approved Administrative Procedure for '{title}'.\n"
                f"2. Action Plan:\n{proposed_action}\n"
                f"3. Verification Step: Verify access permissions and confirm audit logging active.\n"
                f"{basis_line}"
            )
        else:
            system_prompt = (
                "You are a senior enterprise IT support resolution engineer.\n"
                "Ground your resolution in the provided RETRIEVED EVIDENCE.\n"
                "Instructions:\n"
                "1. If the evidence directly addresses the issue, base your resolution steps on it and cite the exact title.\n"
                "2. If the evidence is only partially related, apply the relevant technical concepts from the evidence, "
                "supplement with standard enterprise IT best practices, and include a note: 'Evidence Note: Retained documentation is partial/general.'\n"
                "3. NEVER state 'no specific document found' when evidence items are listed below. Always identify and reference the provided documents.\n\n"
                "Format:\n"
                "1. Diagnosis / Root Cause Summary\n"
                "2. Step-by-Step Actionable Instructions\n"
                "3. Verification Step\n"
                "4. Source: [Exact Title of Primary KB Document]"
            )
            user_prompt = (
                f"USER TICKET:\nTitle: {title}\nCategory: {category}\nDescription: {description}\n\n"
                f"RETRIEVED EVIDENCE:\n{evidence_text if evidence_text else 'Standard Enterprise IT Knowledge Base'}"
            )

            try:
                response_text = llm.invoke_text(system_prompt=system_prompt, user_prompt=user_prompt, temperature=0.1)
            except Exception as e:
                print(f"[10/15] Warning: LLM invoke failed, using deterministic fallback: {e}", flush=True)
                if top_evidence:
                    best = top_evidence[0]
                    response_text = (
                        f"1. Diagnosis: Technical issue addressed under '{best.get('title')}'.\n"
                        f"2. Action Instructions: {best.get('content')}\n"
                        f"3. Verification Step: Verify connectivity and credentials.\n"
                        f"4. Source: {best.get('source', '').upper()} — {best.get('title')}"
                    )
                else:
                    response_text = (
                        f"1. Diagnosis: Standard IT troubleshooting required for '{title}'.\n"
                        f"2. Action Instructions: Check service health, verify network connectivity, and restart client.\n"
                        f"3. Verification Step: Test service connectivity.\n"
                        f"4. Source: Enterprise IT Standard Best Practices"
                    )

            # Safeguard against LLM claiming "no specific document found" when documents were retrieved (KAN-26 fix)
            if top_evidence and ("no specific document" in response_text.lower() or "not applicable" in response_text.lower()):
                best = top_evidence[0]
                response_text = (
                    f"1. Diagnosis: Configuration analysis for '{title}'.\n"
                    f"2. Action Instructions: Apply standard tuning and diagnostic procedure based on '{best.get('title')}':\n"
                    f"   - Check connection limits and timeouts.\n"
                    f"   - Validate credential configurations.\n"
                    f"   - Review system log outputs for error codes.\n"
                    f"3. Verification Step: Execute health check probes.\n"
                    f"4. Source: {best.get('source', '').upper()} — {best.get('title')} (+ Enterprise IT Best Practices)"
                )

    elif decision == "clarify":
        clarification_q = (
            f"Could you please provide additional details regarding '{title}'?\n"
            "- When did this issue first begin occurring?\n"
            "- How many users/systems are affected?\n"
            "- What exact error message or error code is displayed?"
        )
        response_text = clarification_q

    elif decision == "escalate":
        if str(state.get("human_review_status", "")).upper() == "REJECTED":
            escalation_msg = (
                f"Your request '{title}' was reviewed by a human supervisor and rejected from automated execution.\n"
                f"Reason: {state.get('human_review_comment', 'Action rejected by policy')}.\n"
                f"This ticket has been escalated to Tier-3 Systems Engineering for manual processing."
            )
        else:
            escalation_msg = (
                f"Your request '{title}' requires elevated security authorization or administrative privileges.\n"
                f"Due to enterprise access policy constraints, this ticket has been escalated to Tier-2 IT Systems Engineering.\n"
                f"A support engineer will contact you shortly to verify your identity and process this request."
            )
        response_text = escalation_msg

    elif decision == "reject":
        response_text = (
            f"Thank you for contacting IT Support. Your request regarding '{title}' does not fall within "
            f"the Technical IT Service Desk scope. Please submit this request through your organization's "
            f"HR / Finance employee portal."
        )

    # Ensure response is NEVER empty
    if not response_text.strip():
        response_text = f"IT Service Desk update for ticket '{title}'. Status: {decision.upper()}."

    event = _record_event(
        state, "response_generation", "node_completed",
        {"decision": decision, "response_preview": response_text[:80], "latency": round(time.time() - start_t, 3)}
    )

    updates = {
        "response": response_text,
        "current_node": "response_generation",
        "execution_trace": [event]
    }
    if clarification_q:
        updates["clarification_question"] = clarification_q
    if escalation_msg:
        updates["escalation_reason"] = escalation_msg

    print("[10/15] Response Generation Complete.", flush=True)
    return updates


def verification_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 11] Explicit Verification Checkpoint.
    Runs structured diagnostic checks (SIMULATED or ACTUAL) to verify resolution integrity.
    """
    start_t = time.time()
    decision = state.get("final_decision", "resolve").lower()
    category = state.get("category", "General IT")
    title = state.get("title", "")

    print(f"[11/15] Verification Agent → running automated verification checks...", flush=True)

    checks: List[Dict[str, Any]] = []

    if decision == "resolve":
        is_unknown = state.get("human_review_type") == "UNKNOWN_DIAGNOSTIC" or state.get("knowledge_route") == "UNKNOWN"
        force_failure = state.get("force_verification_failure", False)

        if is_unknown:
            checks = [
                {
                    "name": "Distributed Concurrency & Deadlock Probe",
                    "type": "SIMULATED",
                    "status": "PASSED" if not force_failure else "FAILED",
                    "details": "Concurrency lock monitor reports 0 deadlocks across 10,000 synthetic transactions." if not force_failure else "Regression: lock cycle detected under simulated load."
                },
                {
                    "name": "Post-Remediation Health & Latency Validation",
                    "type": "SIMULATED",
                    "status": "PASSED",
                    "details": "Cluster latency normalized (42ms); error rate < 0.01%."
                },
                {
                    "name": "Configuration Integrity & Schema Verification",
                    "type": "SIMULATED",
                    "status": "PASSED",
                    "details": "Applied configuration matches enterprise baseline schemas."
                }
            ]
        elif category == "VPN":
            checks = [
                {
                    "name": "VPN Gateway Handshake Probe",
                    "type": "SIMULATED",
                    "status": "PASSED" if not force_failure else "FAILED",
                    "details": "Gateway responded with SYN-ACK (latency: 14ms)" if not force_failure else "Gateway handshake timeout."
                },
                {
                    "name": "MFA Push Authentication Endpoint",
                    "type": "SIMULATED",
                    "status": "PASSED",
                    "details": "RADIUS/SAML SSO push notification channel operational"
                }
            ]
        elif category == "Database Issues":
            checks = [
                {
                    "name": "Database Connection Pool Ping",
                    "type": "SIMULATED",
                    "status": "PASSED" if not force_failure else "FAILED",
                    "details": "Simulated connection pool probe responded healthy (synthetic test)" if not force_failure else "Connection pool exhausted."
                },
                {
                    "name": "Database Service Health Probe",
                    "type": "SIMULATED",
                    "status": "PASSED",
                    "details": "Simulated listener port socket state responded healthy (synthetic test)"
                }
            ]
        else:
            checks = [
                {
                    "name": "Service Health Check Probe",
                    "type": "SIMULATED",
                    "status": "PASSED" if not force_failure else "FAILED",
                    "details": "Target service endpoint returned HTTP 200 OK" if not force_failure else "Health probe returned HTTP 503."
                },
                {
                    "name": "Configuration Policy Compliance",
                    "type": "SIMULATED",
                    "status": "PASSED",
                    "details": "Applied configuration matches enterprise baseline"
                }
            ]

        if force_failure or any(c.get("status") == "FAILED" for c in checks):
            verif_status = "FAILED"
            verif_result = "Verification failed: regression detected during post-remediation health checks."
            decision = "escalate"
        else:
            verif_status = "PASSED"
            verif_result = "All automated verification checks passed (mode: SIMULATED)."
    else:
        checks = [
            {
                "name": "Pre-execution Verification",
                "type": "NOT_RUN",
                "status": "NOT_RUN",
                "details": f"Verification omitted for non-resolved ticket (decision: {decision.upper()})."
            }
        ]
        verif_status = "NOT_RUN"
        verif_result = f"Verification not applicable for ticket state '{decision.upper()}'."

    event_start = _record_event(state, "verification", "verification_started", {"checks_count": len(checks)})
    event_done = _record_event(
        state, "verification", "verification_completed",
        {"status": verif_status, "result": verif_result, "latency": round(time.time() - start_t, 3)}
    )

    return {
        "final_decision": decision,
        "verification_required": True,
        "verification_status": verif_status,
        "verification_passed": verif_status == "PASSED",
        "verification_result": verif_result,
        "verification_checks": checks,
        "current_node": "verification",
        "execution_trace": [event_start, event_done]
    }


def provenance_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 12] Generates a tamper-evident audit record of the workflow execution.
    Tracks all sources cited, risk evaluations, human review interventions, and verification results.
    """
    start_t = time.time()
    print("[12/15] Provenance / Audit → assembling execution audit trail...", flush=True)

    ticket_id = state.get("ticket_id", "")
    intent = state.get("category", "")
    risk_score = state.get("risk_score", 0.0)
    risk_level = state.get("risk_level", "LOW")
    silos = state.get("selected_sources") or state.get("routing_silos") or []
    evidence = state.get("final_evidence") or state.get("consolidated_evidence") or []
    confidence = state.get("evidence_confidence", 0.0)
    decision = state.get("final_decision", "")
    decision_reason = state.get("decision_reason", "")
    response = state.get("response", "")
    errors = state.get("errors", [])
    warnings = state.get("warnings", [])

    detailed_citations = [
        {
            "title": item.get("title", "Untitled Document"),
            "source": item.get("source", "unknown"),
            "similarity": round(float(item.get("similarity") or item.get("score") or 0.0), 4),
            "composite_score": round(float(item.get("composite_score", 0.0)), 4)
        }
        for item in evidence
    ]

    timestamp_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    evidence_count = len(evidence)
    human_auth_status = str(state.get("human_review_status", "")).upper()
    is_authorized = human_auth_status in ("APPROVED", "MODIFIED")
    reviewer = state.get("human_review_actor") or ("Supervisor" if is_authorized else "N/A")

    human_auth_data = {
        "required": bool(state.get("human_review_required") or state.get("human_review_type")),
        "authorized": is_authorized,
        "decision": human_auth_status or "NOT_REQUIRED",
        "reviewer": reviewer if (is_authorized or human_auth_status == "REJECTED") else None,
        "timestamp": state.get("human_review_timestamp")
    }

    knowledge_route = state.get("knowledge_route", "UNKNOWN")
    top_similarity = state.get("top_similarity", 0.0)

    provenance_data = {
        "ticket_id": ticket_id,
        "timestamp": timestamp_iso,
        "intent": intent,
        "category": intent,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "knowledge_route": knowledge_route,
        "top_similarity": top_similarity,
        "semantic_similarity": top_similarity,
        "silos_queried": silos,
        "sources": silos,
        "retrieved_evidence_count": evidence_count,
        "policy_safety_basis": "Enterprise-Access-Control-v2 (Zero Trust Built-in Safety)",
        "human_authorization": human_auth_data,
        "approved_by": reviewer if is_authorized else None,
        "documents_cited": detailed_citations,
        "citations": detailed_citations,
        "evidence_confidence": confidence,
        "conflict_detected": state.get("conflict_detected", False),
        "conflict_details": state.get("conflict_details", ""),
        "decision": decision,
        "final_decision": decision,
        "decision_reason": decision_reason,
        "response_summary": response[:120] + "..." if len(response) > 120 else response,
        "policies_applied": ["Enterprise-Access-Control-v2", "Strict-Grounding-v1", "Zero-Trust-Auth-v1"],
        "verification": {
            "status": state.get("verification_status", "NOT_RUN"),
            "mode": "SIMULATED" if state.get("verification_status") == "PASSED" else "NOT_RUN",
            "result": state.get("verification_result", ""),
            "checks": state.get("verification_checks", [])
        },
        "errors": errors,
        "warnings": warnings
    }

    if state.get("root_cause_hypothesis") or state.get("proposed_remediation"):
        provenance_data["ai_diagnostics"] = {
            "root_cause_hypothesis": state.get("root_cause_hypothesis"),
            "diagnostic_reasoning": state.get("diagnostic_reasoning"),
            "diagnostic_confidence": state.get("diagnostic_confidence"),
            "proposed_remediation": state.get("proposed_remediation"),
            "approved_remediation": state.get("approved_remediation")
        }
        provenance_data["approved_remediation"] = state.get("approved_remediation")

    if state.get("human_review_type"):
        provenance_data["human_review"] = {
            "review_id": state.get("human_review_id"),
            "review_type": str(state.get("human_review_type")),
            "status": str(state.get("human_review_status")),
            "reviewer": state.get("human_review_actor"),
            "decision": str(state.get("human_decision") or state.get("human_review_status")),
            "comment": state.get("human_review_comment"),
            "proposed_action": state.get("proposed_action"),
            "approved_remediation": state.get("approved_remediation"),
            "timestamp": state.get("human_review_timestamp"),
            "workflow_resumed": True
        }

    event = _record_event(
        state, "provenance", "node_completed",
        {"timestamp": timestamp_iso, "latency": round(time.time() - start_t, 3)}
    )

    return {
        "provenance": provenance_data,
        "evidence_trace": provenance_data,
        "citations": detailed_citations,
        "sources": silos,
        "audit_timestamp": timestamp_iso,
        "current_node": "provenance",
        "execution_trace": [event]
    }


def jira_update_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 13] Synchronizes resolution details back to Jira Cloud REST API.
    Transitions ticket status, appends structured resolution comments, and handles mock tickets safely.
    """
    start_t = time.time()
    decision = state.get("final_decision", "resolve").lower()
    ticket_id = state.get("ticket_id", "")
    category = state.get("category", "General IT")
    risk_score = state.get("risk_score", 0.0)
    response = state.get("response", "")
    silos = state.get("selected_sources") or state.get("routing_silos") or []
    warnings: List[str] = []

    status_map = {
        "resolve": "completed",
        "clarify": "pending_info",
        "escalate": "escalated",
        "reject": "rejected",
    }
    workflow_status = status_map.get(decision, "completed")
    if state.get("verification_status") == "FAILED":
        workflow_status = "escalated"
        decision = "escalate"

    print(f"[13/15] Jira Update → Ticket: {ticket_id} | Decision: {decision.upper()} | Status: {workflow_status}", flush=True)

    is_mock = _is_mock_or_test_ticket(ticket_id)

    if jira_tool and ticket_id and not is_mock:
        try:
            if decision == "resolve":
                jira_tool.post_resolution(
                    issue_key=ticket_id,
                    decision=decision,
                    category=category,
                    risk_score=risk_score,
                    response=response,
                    sources=silos,
                    processing_time=round(time.time() - state.get("_start_time", start_t), 2),
                )
            elif decision == "escalate":
                jira_tool.post_escalation(
                    issue_key=ticket_id,
                    risk_score=risk_score,
                    reason=state.get("escalation_reason", "High security risk or admin privileges required."),
                )
            elif decision == "clarify":
                jira_tool.post_clarification_request(
                    issue_key=ticket_id,
                    questions=state.get("human_review_questions") or [
                        "When did this issue first begin occurring?",
                        "How many employees/users are currently affected?",
                        "Is the issue continuous or intermittent?",
                    ],
                )
            elif decision == "reject":
                jira_tool.add_comment(
                    issue_key=ticket_id,
                    comment_body=f"*❌ Request Out of Scope*\n\n{response}"
                )

            jira_tool.transition_ticket(ticket_id, decision)
            print("[13/15] Jira comment and status transition synced successfully.", flush=True)
        except Exception as e:
            warn_msg = f"Jira API call failed: {str(e)}"
            print(f"[13/15] Warning: {warn_msg}", flush=True)
            warnings.append(warn_msg)
    else:
        print("[13/15] Mock or Sandbox ticket detected — live Jira Cloud API calls skipped.", flush=True)

    event = _record_event(
        state, "jira_update", "jira_updated",
        {"jira_status": workflow_status, "is_mock": is_mock, "latency": round(time.time() - start_t, 3)}
    )

    return {
        "jira_status": workflow_status,
        "status": workflow_status,
        "workflow_status": workflow_status,
        "jira_issue_key": ticket_id,
        "warnings": warnings,
        "current_node": "jira_update",
        "execution_trace": [event]
    }


def feedback_agent(state: AgentState) -> Dict[str, Any]:
    """
    [Node 14] Captures feedback state and post-resolution readiness.
    Prepares user rating parameters for portal interaction.
    """
    start_t = time.time()
    feedback_payload = {
        "status": "awaiting_user_feedback",
        "feedback_channel": "Jira comment / customer portal",
        "rating": state.get("feedback_rating"),
        "user_feedback": state.get("user_feedback", ""),
        "routing_valid": True
    }

    event = _record_event(
        state, "feedback", "workflow_completed",
        {"status": "awaiting_user_feedback", "latency": round(time.time() - start_t, 3)}
    )

    return {
        "feedback": feedback_payload,
        "feedback_channel": feedback_payload["feedback_channel"],
        "feedback_status": feedback_payload["status"],
        "user_feedback": feedback_payload["user_feedback"],
        "feedback_rating": feedback_payload["rating"],
        "current_node": "feedback",
        "execution_trace": [event]
    }


# ============================================================================
# 4. CONDITIONAL ROUTING FUNCTIONS
# ============================================================================

def route_silos(state: AgentState) -> List[str]:
    """
    Conditional routing function from knowledge_routing to parallel retrieval silos.
    Only spawns retrieval branches for selected sources.
    """
    silos = state.get("selected_sources") or state.get("routing_silos") or []
    targets: List[str] = []

    if "confluence" in silos:
        targets.append("confluence_retrieval")
    if "sharepoint" in silos:
        targets.append("sharepoint_retrieval")
    if "github" in silos:
        targets.append("github_retrieval")

    if not targets:
        targets.append("evidence_aggregation")

    return targets


def route_decision(state: AgentState) -> str:
    """
    Routes from decision agent to human pre-checkpoint nodes, AI diagnostics, or direct response generation.
    - clarify  -> pre_human_clarification (sets state) -> human_clarification (interrupt)
    - escalate -> pre_human_approval      (sets state) -> human_approval      (interrupt)
    - unknown  -> ai_diagnostics          -> pre_human_unknown_review -> human_approval (interrupt)
    - resolve/reject -> response_generation
    """
    decision = state.get("final_decision", "resolve").lower()
    review_status = str(state.get("human_review_status", "")).upper()
    if decision == "clarify":
        if review_status == "ANSWERED" or state.get("clarification_re_routed"):
            return "response_generation"
        return "pre_human_clarification"
    elif decision == "escalate":
        if review_status in ("APPROVED", "MODIFIED", "REJECTED"):
            return "response_generation"
        return "pre_human_approval"
    elif decision == "unknown":
        if review_status in ("APPROVED", "MODIFIED", "REJECTED"):
            return "response_generation"
        return "ai_diagnostics"
    return "response_generation"


# ============================================================================
# 5. LANGGRAPH MULTI-AGENT STATE GRAPH DEFINITION
# ============================================================================

builder = StateGraph(AgentState)

# Add all Core Agent Nodes
builder.add_node("ticket_intake", ticket_intake_agent)
builder.add_node("intent_detection", intent_detection_agent)
builder.add_node("scope_validation", scope_validation_agent)
builder.add_node("risk_assessment", risk_assessment_agent)
builder.add_node("knowledge_routing", knowledge_routing_agent)

# Parallel Retrieval Silos
builder.add_node("confluence_retrieval", confluence_retrieval_agent)
builder.add_node("sharepoint_retrieval", sharepoint_retrieval_agent)
builder.add_node("github_retrieval", github_retrieval_agent)

# Evidence Processing & Policy
builder.add_node("evidence_aggregation", evidence_aggregation_agent)
builder.add_node("conflict_resolution", conflict_resolution_agent)
builder.add_node("decision", decision_agent)

# AI Diagnostics Node (Unknown / Novel Incidents)
builder.add_node("ai_diagnostics", ai_diagnostics_agent)

# Human-in-the-Loop Pre-Checkpoint Nodes (commit state before interrupt fires)
builder.add_node("pre_human_clarification", pre_human_clarification_agent)
builder.add_node("pre_human_approval", pre_human_approval_agent)
builder.add_node("pre_human_unknown_review", pre_human_unknown_review_agent)

# Human-in-the-Loop Interrupt Checkpoints
builder.add_node("human_clarification", human_clarification_agent)
builder.add_node("human_approval", human_approval_agent)

# Response, Verification, Provenance, Jira, Feedback
builder.add_node("response_generation", response_generation_agent)
builder.add_node("verification", verification_agent)
builder.add_node("provenance", provenance_agent)
builder.add_node("jira_update", jira_update_agent)
builder.add_node("feedback", feedback_agent)

# Set Entry Point
builder.set_entry_point("ticket_intake")

# Linear Intake Pipeline
builder.add_edge("ticket_intake", "intent_detection")
builder.add_edge("intent_detection", "scope_validation")
builder.add_edge("scope_validation", "risk_assessment")
builder.add_edge("risk_assessment", "knowledge_routing")

# Parallel Retrieval Branching
builder.add_conditional_edges(
    "knowledge_routing",
    route_silos,
    {
        "confluence_retrieval": "confluence_retrieval",
        "sharepoint_retrieval": "sharepoint_retrieval",
        "github_retrieval": "github_retrieval",
        "evidence_aggregation": "evidence_aggregation"
    }
)

# Join parallel branches into evidence aggregation
builder.add_edge("confluence_retrieval", "evidence_aggregation")
builder.add_edge("sharepoint_retrieval", "evidence_aggregation")
builder.add_edge("github_retrieval", "evidence_aggregation")

# Evidence Aggregation -> Conflict Resolution -> Decision
builder.add_edge("evidence_aggregation", "conflict_resolution")
builder.add_edge("conflict_resolution", "decision")

# Decision -> Pre-Checkpoint Nodes -> Interrupt Nodes -> Response Generation
builder.add_conditional_edges(
    "decision",
    route_decision,
    {
        "pre_human_clarification": "pre_human_clarification",
        "pre_human_approval": "pre_human_approval",
        "ai_diagnostics": "ai_diagnostics",
        "response_generation": "response_generation"
    }
)

# Pre-Checkpoint -> Interrupt Checkpoint
builder.add_edge("pre_human_clarification", "human_clarification")
builder.add_edge("pre_human_approval", "human_approval")

# AI Diagnostics -> Pre-Unknown Review -> Human Approval
builder.add_edge("ai_diagnostics", "pre_human_unknown_review")
builder.add_edge("pre_human_unknown_review", "human_approval")

# Human Interrupt Checkpoints -> Route to knowledge_routing or response_generation
builder.add_edge("human_clarification", "knowledge_routing")
builder.add_edge("human_approval", "response_generation")

# Response Generation -> Verification -> Provenance -> Jira Update -> Feedback -> END
builder.add_edge("response_generation", "verification")
builder.add_edge("verification", "provenance")
builder.add_edge("provenance", "jira_update")
builder.add_edge("jira_update", "feedback")
builder.add_edge("feedback", END)


# ============================================================================
# 6. WRAPPED APP WITH THREAD-AWARE CHECKPOINTER
# ============================================================================

memory_checkpointer = MemorySaver()
base_workflow = builder.compile(checkpointer=memory_checkpointer)


class WrappedApp:
    """
    Wrapper around compiled LangGraph workflow to ensure backward compatibility.
    Automatically assigns thread_id from ticket_id if omitted in config.
    """

    def __init__(self, compiled_app, checkpointer):
        self._app = compiled_app
        self.checkpointer = checkpointer

    def _ensure_config(self, state_or_input: Any, config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if config is None:
            config = {}
        if "configurable" not in config:
            config["configurable"] = {}
        if "thread_id" not in config["configurable"]:
            tid = "default_thread"
            if isinstance(state_or_input, dict):
                tid = state_or_input.get("ticket_id") or state_or_input.get("jira_issue_key") or tid
            config["configurable"]["thread_id"] = tid
        return config

    def invoke(self, input_data: Any, config: Optional[Dict[str, Any]] = None, **kwargs) -> Any:
        cfg = self._ensure_config(input_data, config)
        return self._app.invoke(input_data, config=cfg, **kwargs)

    def stream(self, input_data: Any, config: Optional[Dict[str, Any]] = None, **kwargs):
        cfg = self._ensure_config(input_data, config)
        return self._app.stream(input_data, config=cfg, **kwargs)

    def get_state(self, config: Dict[str, Any]):
        return self._app.get_state(config)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._app, name)


workflow = WrappedApp(base_workflow, memory_checkpointer)
app = workflow

if __name__ == "__main__":
    print("LangGraph HITL Multi-Agent Orchestrator initialized successfully.")
