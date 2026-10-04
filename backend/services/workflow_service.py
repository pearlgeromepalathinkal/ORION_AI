"""
Workflow Service executing the LangGraph multi-agent pipeline and managing in-memory execution state.
"""

import asyncio
import time
import uuid
import threading
from typing import Optional, Dict, Any, List

from config import Config
from Agents import workflow, AgentState
from tools.jira_tools import JiraTool
from backend.services.event_service import event_service
from backend.schemas import (
    WorkflowStatusResponse,
    ClassificationSchema,
    RiskSchema,
    KnowledgeSchema,
    KnowledgeDocument,
    DecisionSchema,
    ProvenanceSchema,
    CitationItem,
    JiraSchema,
)


class WorkflowService:
    """
    In-memory workflow execution and state manager.
    Coordinates between FastAPI routes and the LangGraph multi-agent brain.
    """

    def __init__(self) -> None:
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        try:
            self.jira_tool = JiraTool()
        except Exception:
            self.jira_tool = None

    def get_workflow(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve stored workflow execution entry."""
        with self._lock:
            entry = self._store.get(ticket_id)
            if entry:
                return dict(entry)
            return None

    def list_workflows_for_user(self, user_id: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        """List workflows matching the user or all if admin."""
        with self._lock:
            if is_admin:
                return [dict(v) for v in self._store.values()]
            return [dict(v) for v in self._store.values() if v.get("owner_id") == user_id]

    def create_ticket_record(
        self,
        issue: str,
        title: Optional[str] = None,
        user_id: Optional[str] = None,
        department: Optional[str] = None,
        region: Optional[str] = None,
        force_ticket_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates or binds a ticket ID, sets up initial Jira entry or local mock ID,
        and initializes the workflow store entry in 'processing' state.
        """
        user_id = user_id or "EMP001"
        department = department or "Engineering"
        region = region or "AP-South"
        title = title or (issue[:60] + "..." if len(issue) > 60 else issue)

        jira_url = None
        ticket_id = force_ticket_id

        if not ticket_id:
            # Check if live Jira ticket can be created
            if self.jira_tool:
                try:
                    jira_res = self.jira_tool.create_ticket(
                        summary=title,
                        description=f"{issue}\n\nSubmitted by: {user_id} ({department} - {region})",
                        priority="Medium"
                    )
                    ticket_id = jira_res.get("key")
                    jira_url = jira_res.get("url")
                except Exception as e:
                    print(f"[WorkflowService] Jira ticket creation bypassed: {e}", flush=True)

            if not ticket_id:
                # Generate unique enterprise mock ticket ID
                ticket_id = f"INC-{uuid.uuid4().hex[:6].upper()}"

        initial_state: AgentState = {
            "ticket_id": ticket_id,
            "jira_issue_key": ticket_id,
            "title": title,
            "raw_issue": title,
            "description": issue,
            "normalized_issue": issue,
            "user_id": user_id,
            "department": department,
            "region": region,
            "status": "processing",
            "workflow_status": "processing",
            "current_node": "ticket_intake",
            "retrieved_evidence": [],
            "errors": [],
            "warnings": [],
            "execution_trace": [],
            "_start_time": time.time()
        }

        entry = {
            "ticket_id": ticket_id,
            "owner_id": user_id,
            "workflow_status": "processing",
            "current_node": "ticket_intake",
            "jira_url": jira_url,
            "state": initial_state,
            "start_time": time.time(),
            "end_time": None,
            "error": None
        }

        with self._lock:
            self._store[ticket_id] = entry

        return {
            "ticket_id": ticket_id,
            "jira_url": jira_url,
            "initial_state": initial_state
        }

    def run_workflow_sync(
        self,
        issue: str,
        title: Optional[str] = None,
        user_id: Optional[str] = None,
        department: Optional[str] = None,
        region: Optional[str] = None,
        ticket_id: Optional[str] = None
    ) -> WorkflowStatusResponse:
        """
        Executes the LangGraph multi-agent pipeline synchronously and returns the structured schema.
        """
        ticket_info = self.create_ticket_record(
            issue=issue,
            title=title,
            user_id=user_id,
            department=department,
            region=region,
            force_ticket_id=ticket_id
        )
        tid = ticket_info["ticket_id"]
        initial_state = ticket_info["initial_state"]

        try:
            # Invoke LangGraph
            final_state = workflow.invoke(initial_state)
            status = final_state.get("workflow_status") or "completed"

            with self._lock:
                if tid in self._store:
                    self._store[tid]["workflow_status"] = status
                    self._store[tid]["current_node"] = final_state.get("current_node", "feedback")
                    self._store[tid]["state"] = final_state
                    self._store[tid]["end_time"] = time.time()

            return self.format_workflow_response(final_state, status)

        except Exception as e:
            with self._lock:
                if tid in self._store:
                    self._store[tid]["workflow_status"] = "failed"
                    self._store[tid]["error"] = str(e)
                    self._store[tid]["end_time"] = time.time()

            return WorkflowStatusResponse(
                ticket_id=tid,
                workflow_status="failed",
                errors=[f"Workflow execution failed: {str(e)}"]
            )

    def resume_workflow(
        self,
        ticket_id: str,
        resume_value: Any
    ) -> Dict[str, Any]:
        """
        Resumes a LangGraph workflow that was paused at a human checkpoint (interrupt).
        The resume_value is passed back to the interrupt() call site via Command(resume=...).
        Returns the final accumulated state after the workflow completes or re-pauses.
        """
        from langgraph.types import Command
        from Agents import base_workflow

        config = {"configurable": {"thread_id": ticket_id}}

        with self._lock:
            if ticket_id not in self._store:
                raise ValueError(f"No workflow found for ticket_id: {ticket_id}")

        try:
            print(f"[WorkflowService] Resuming workflow {ticket_id} ...", flush=True)
            final_state = base_workflow.invoke(
                Command(resume=resume_value),
                config=config
            )

            # Detect re-interrupt (nested human checkpoint)
            if isinstance(final_state, dict) and "__interrupt__" in final_state:
                paused_status = final_state.get("workflow_status", "awaiting_human_review")
                with self._lock:
                    if ticket_id in self._store:
                        self._store[ticket_id]["workflow_status"] = paused_status
                        stored_state = self._store[ticket_id].get("state", {})
                        stored_state.update(final_state)
                        self._store[ticket_id]["state"] = stored_state
                return final_state

            status = final_state.get("workflow_status") or "completed"
            with self._lock:
                if ticket_id in self._store:
                    self._store[ticket_id]["workflow_status"] = status
                    self._store[ticket_id]["current_node"] = final_state.get("current_node", "feedback")
                    self._store[ticket_id]["state"] = final_state
                    self._store[ticket_id]["end_time"] = time.time()

            return final_state

        except Exception as e:
            with self._lock:
                if ticket_id in self._store:
                    self._store[ticket_id]["workflow_status"] = "failed"
                    self._store[ticket_id]["error"] = str(e)
                    self._store[ticket_id]["end_time"] = time.time()
            raise


    def start_workflow_async(
        self,
        issue: str,

        title: Optional[str] = None,
        user_id: Optional[str] = None,
        department: Optional[str] = None,
        region: Optional[str] = None,
        ticket_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Starts the LangGraph workflow in the background and streams execution events.
        """
        ticket_info = self.create_ticket_record(
            issue=issue,
            title=title,
            user_id=user_id,
            department=department,
            region=region,
            force_ticket_id=ticket_id
        )
        tid = ticket_info["ticket_id"]
        initial_state = ticket_info["initial_state"]

        # Launch background executor
        threading.Thread(
            target=self._run_async_worker,
            args=(tid, initial_state),
            daemon=True
        ).start()

        return {
            "ticket_id": tid,
            "status": "processing",
            "message": "Ticket accepted",
            "jira_url": ticket_info["jira_url"]
        }

    def _run_async_worker(self, ticket_id: str, state: AgentState) -> None:
        """
        Background worker that streams each LangGraph step and publishes WebSocket events.
        """
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            # Emit start event
            loop.run_until_complete(
                event_service.publish(ticket_id, {
                    "event": "node_started",
                    "ticket_id": ticket_id,
                    "node": "ticket_intake"
                })
            )

            accumulated_state = dict(state)

            # Stream LangGraph execution node by node
            for step in workflow.stream(state):
                for node_name, state_update in step.items():
                    accumulated_state.update(state_update)

                    with self._lock:
                        if ticket_id in self._store:
                            self._store[ticket_id]["current_node"] = node_name
                            self._store[ticket_id]["state"] = accumulated_state

                    # Construct meaningful event payload
                    data_payload = {}
                    if node_name == "intent_detection":
                        data_payload["category"] = state_update.get("category")
                    elif node_name == "risk_assessment":
                        data_payload["risk_score"] = state_update.get("risk_score")
                        data_payload["risk_level"] = state_update.get("risk_level")
                    elif node_name in ("confluence_retrieval", "sharepoint_retrieval", "github_retrieval"):
                        data_payload["documents"] = len(state_update.get("retrieved_evidence", []))
                    elif node_name == "evidence_aggregation":
                        data_payload["confidence"] = state_update.get("evidence_confidence")
                        data_payload["count"] = state_update.get("evidence_count")
                    elif node_name == "decision":
                        data_payload["decision"] = state_update.get("final_decision")
                        data_payload["reason"] = state_update.get("decision_reason")
                        data_payload["knowledge_route"] = state_update.get("knowledge_route")
                        data_payload["top_similarity"] = state_update.get("top_similarity")
                    elif node_name == "ai_diagnostics":
                        data_payload["root_cause_hypothesis"] = state_update.get("root_cause_hypothesis")
                        data_payload["proposed_remediation"] = state_update.get("proposed_remediation")
                        data_payload["diagnostic_confidence"] = state_update.get("diagnostic_confidence")
                        data_payload["diagnostic_reasoning"] = state_update.get("diagnostic_reasoning")

                    if node_name == "decision":
                        event_type = "decision_made"
                    elif node_name == "ai_diagnostics":
                        event_type = "ai_diagnostics_completed"
                    elif node_name in ("confluence_retrieval", "sharepoint_retrieval", "github_retrieval"):
                        event_type = "retrieval_completed"
                    else:
                        event_type = "node_completed"

                    loop.run_until_complete(
                        event_service.publish(ticket_id, {
                            "event": event_type,
                            "ticket_id": ticket_id,
                            "node": node_name,
                            "data": data_payload
                        })
                    )

            final_status = accumulated_state.get("workflow_status") or "completed"
            with self._lock:
                if ticket_id in self._store:
                    self._store[ticket_id]["workflow_status"] = final_status
                    self._store[ticket_id]["current_node"] = accumulated_state.get("current_node", "feedback")
                    self._store[ticket_id]["state"] = accumulated_state
                    self._store[ticket_id]["end_time"] = time.time()

            # Emit workflow completion event
            loop.run_until_complete(
                event_service.publish(ticket_id, {
                    "event": "workflow_completed",
                    "ticket_id": ticket_id,
                    "status": final_status,
                    "final_decision": accumulated_state.get("final_decision"),
                    "response": accumulated_state.get("response")
                })
            )

        except Exception as e:
            with self._lock:
                if ticket_id in self._store:
                    self._store[ticket_id]["workflow_status"] = "failed"
                    self._store[ticket_id]["error"] = str(e)
                    self._store[ticket_id]["end_time"] = time.time()

            loop.run_until_complete(
                event_service.publish(ticket_id, {
                    "event": "workflow_failed",
                    "ticket_id": ticket_id,
                    "error": str(e)
                })
            )
        finally:
            loop.close()

    def format_workflow_response(self, state: Dict[str, Any], status: str) -> WorkflowStatusResponse:
        """
        Transforms internal AgentState into clean Pydantic response schema.
        """
        ticket_id = state.get("ticket_id") or state.get("jira_issue_key") or "UNKNOWN"
        category = state.get("category", "General IT")
        intent = state.get("intent", category)
        is_in_scope = state.get("is_in_scope", True)
        scope_valid = state.get("scope_valid", is_in_scope)
        scope = state.get("scope", "in_scope" if is_in_scope else "out_of_scope")

        classification = ClassificationSchema(
            intent=intent,
            category=category,
            scope=scope,
            scope_valid=scope_valid
        )

        risk_score = float(state.get("risk_score", 0.0))
        risk_level = state.get("risk_level", "LOW")
        risk = RiskSchema(score=risk_score, level=risk_level)

        # Knowledge docs
        docs_raw = state.get("final_evidence") or state.get("consolidated_evidence") or []
        docs = [
            KnowledgeDocument(
                source=d.get("source", "unknown"),
                title=d.get("title", "Untitled Document"),
                content=d.get("content"),
                similarity=d.get("similarity") or d.get("score"),
                composite_score=d.get("composite_score")
            )
            for d in docs_raw
        ]
        silos = state.get("selected_sources") or state.get("routing_silos") or []
        knowledge = KnowledgeSchema(
            selected_sources=silos,
            evidence_confidence=float(state.get("evidence_confidence", 0.0)),
            documents=docs
        )

        # Decision
        final_decision = (state.get("final_decision") or "pending").upper()
        decision_reason = state.get("decision_reason", "")
        decision_conf = state.get("decision_confidence")
        decision = DecisionSchema(
            decision=final_decision,
            reason=decision_reason,
            confidence=decision_conf,
            knowledge_route=state.get("knowledge_route"),
            top_similarity=state.get("top_similarity")
        )

        # Provenance citations
        citations_raw = state.get("provenance", {}).get("citations") or state.get("citations") or []
        citations = [
            CitationItem(
                source=c.get("source", "unknown"),
                title=c.get("title", "Untitled"),
                similarity=c.get("similarity"),
                composite_score=c.get("composite_score")
            )
            for c in citations_raw
        ]
        provenance = ProvenanceSchema(
            citations=citations,
            timestamp=state.get("audit_timestamp"),
            policies_applied=state.get("provenance", {}).get("policies_applied", [])
        )

        # Jira — look up stored jira_url from the workflow store
        jira_url = None
        with self._lock:
            store_entry = self._store.get(ticket_id, {})
            jira_url = store_entry.get("jira_url") or state.get("jira_url")

        # Build jira_url from base_url if not stored but ticket is a real KAN ticket
        if not jira_url and self.jira_tool and ticket_id and not ticket_id.startswith(("INC-", "MOCK-", "TEST-")):
            try:
                jira_url = f"{self.jira_tool.base_url}/browse/{ticket_id}"
            except Exception:
                pass

        jira = JiraSchema(
            issue_key=ticket_id,
            status=state.get("jira_status") or state.get("status") or "completed",
            jira_url=jira_url
        )

        return WorkflowStatusResponse(
            ticket_id=ticket_id,
            workflow_status=status,
            current_node=state.get("current_node"),
            classification=classification,
            risk=risk,
            knowledge=knowledge,
            decision=decision,
            response=state.get("response"),
            provenance=provenance,
            jira=jira,
            warnings=list(state.get("warnings", [])),
            errors=list(state.get("errors", [])),
            execution_trace=list(state.get("execution_trace", []))
        )


# Global singleton workflow service
workflow_service = WorkflowService()
