import time
import threading
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.rule import Rule
from rich.live import Live
from rich.spinner import Spinner
from rich.columns import Columns
from rich.markup import escape
from rich import box

from langgraph.types import Command

from chatbot.auth import AuthManager
from chatbot.session import UserSession
from tools.jira_tools import JiraTool
from Agents import app, llm, base_workflow

console = Console()

MAX_CLARIFY_ROUNDS = 2

CLARIFY_QUESTIONS = [
    "What is your operating system and version?",
    "What exact error message are you seeing?",
    "When did this issue first occur?",
]

ISSUE_TEMPLATES = {
    "1": {
        "label": "VPN — Cannot connect after password reset",
        "summary": "Unable to connect to VPN after Active Directory password reset",
        "description": "GlobalProtect keeps requesting credentials after my AD password change. Cannot connect to corporate VPN.\n\nOS: macOS 14.5\nVPN Client: GlobalProtect 6.1\nError: Authentication failed — invalid credentials",
    },
    "2": {
        "label": "Database — MySQL connection timeout during peak hours",
        "summary": "MySQL database connection timeout during peak business hours",
        "description": "HR Portal fails to connect to MySQL during peak hours (10 AM-12 PM).\n\nError: Communications link failure.\nDatabase: MySQL 8.0 on Ubuntu 22.04\nPool: HikariCP max-pool-size=10\nImpact: 20-30 users affected.",
    },
    "3": {
        "label": "Server — Production disk usage at 95% (critical)",
        "summary": "Production Linux server disk usage at 95% — critical storage alert",
        "description": "Production server /dev/sda1 is at 95% disk capacity.\n\nSize: 500G | Used: 475G | Avail: 25G\nLog files growing rapidly.",
    },
    "4": {
        "label": "Cloud — AWS EC2 failing load balancer health checks",
        "summary": "AWS EC2 instance failing ALB health checks after deployment",
        "description": "After deploying new application version, EC2 instance started failing ALB health checks.\n\nHealth check path: /api/health\nStatus: 503 Service Unavailable\nInstance: t3.medium, Region: ap-south-1",
    },
    "5": {
        "label": "Software — Microsoft Teams crashes on startup",
        "summary": "Microsoft Teams crashes immediately on startup — Windows 11",
        "description": "Teams crashes within 5 seconds of opening.\n\nOS: Windows 11 Pro 23H2\nTeams Version: 1.6.00.33959\nStarted after Windows Update KB5034123.",
    },
    "6": {
        "label": "Hardware — Laptop keyboard intermittently stops working",
        "summary": "Laptop keyboard keys intermittently stop responding during work",
        "description": "Dell XPS 15 keyboard randomly stops responding mid-typing for 30-60 seconds.\n\nDevice: Dell XPS 15 9530\nOS: Windows 11\nDriver up to date. Issue persists after restart.",
    },
    "7": {
        "label": "Security — Suspicious login activity on corporate account",
        "summary": "Suspicious login attempts detected from unknown IP on corporate account",
        "description": "Received unsolicited MFA push from IP 185.234.219.44 (Eastern Europe).\n\nAccount: employee@company.com\nTime: 02:34 AM IST\nPush was denied but concerned about compromise.",
    },
    "8": {
        "label": "Network — Office Wi-Fi extremely slow (<1 Mbps)",
        "summary": "Office Wi-Fi performance degraded — download speed below 1 Mbps",
        "description": "Building B, Floor 3 Wi-Fi extremely slow since morning.\n\nSpeed: Download 0.8 Mbps (expected 100+), Upload 0.3 Mbps\nAffected: ~40 employees. Wired connections are fine.",
    },
    "9": {
        "label": "Custom — Describe your own IT issue",
        "summary": None,
        "description": None,
    },
}

NODE_META = {
    "ticket_intake": {
        "icon": "🎫",
        "label": "Ticket Intake Agent",
        "thinking": [
            "Reading ticket fields...",
            "Normalizing title and description...",
            "Extracting metadata from employee profile...",
        ],
    },
    "intent_detection": {
        "icon": "🔍",
        "label": "Intent Detection Agent",
        "thinking": [
            "Analyzing keywords and context...",
            "Invoking LLM to classify issue category...",
            "Mapping to enterprise IT taxonomy...",
        ],
    },
    "scope_validation": {
        "icon": "✅",
        "label": "Scope Validation Agent",
        "thinking": [
            "Checking enterprise IT scope boundaries...",
            "Validating ticket against support policy...",
            "Determining if issue is serviceable...",
        ],
    },
    "risk_assessment": {
        "icon": "⚠️",
        "label": "Risk Assessment Agent",
        "thinking": [
            "Scanning for security-related signals...",
            "Evaluating business impact and urgency...",
            "Computing risk score (0.0 → 1.0)...",
        ],
    },
    "knowledge_routing": {
        "icon": "🗺️",
        "label": "Knowledge Routing Agent",
        "thinking": [
            "Identifying relevant knowledge repositories...",
            "Evaluating Confluence, SharePoint, GitHub silos...",
            "Selecting optimal retrieval targets...",
        ],
    },
    "confluence_retrieval": {
        "icon": "📚",
        "label": "Confluence Retrieval Agent",
        "thinking": [
            "Generating semantic query vector...",
            "Searching Qdrant vector database (Confluence silo)...",
            "Ranking documents by cosine similarity...",
        ],
    },
    "sharepoint_retrieval": {
        "icon": "📂",
        "label": "SharePoint Retrieval Agent",
        "thinking": [
            "Generating semantic query vector...",
            "Searching Qdrant vector database (SharePoint silo)...",
            "Ranking documents by cosine similarity...",
        ],
    },
    "github_retrieval": {
        "icon": "💻",
        "label": "GitHub Retrieval Agent",
        "thinking": [
            "Generating semantic query vector...",
            "Searching Qdrant vector database (GitHub silo)...",
            "Ranking documents by cosine similarity...",
        ],
    },
    "evidence_aggregation": {
        "icon": "🔬",
        "label": "Evidence Aggregation Agent",
        "thinking": [
            "Collecting results from all retrieval agents...",
            "Deduplicating overlapping documents...",
            "Computing composite relevance scores...",
            "Filtering top-ranked evidence...",
        ],
    },
    "conflict_resolution": {
        "icon": "⚖️",
        "label": "Conflict Resolution Agent",
        "thinking": [
            "Checking for contradictory evidence...",
            "Resolving policy conflicts between sources...",
            "Selecting highest-authority documents...",
        ],
    },
    "decision": {
        "icon": "🧠",
        "label": "Decision Agent",
        "thinking": [
            "Evaluating evidence confidence threshold...",
            "Checking risk score against escalation policy...",
            "Determining: RESOLVE / CLARIFY / ESCALATE...",
        ],
    },
    "response_generation": {
        "icon": "✍️",
        "label": "Response Generation Agent",
        "thinking": [
            "Grounding LLM prompt with top-ranked evidence...",
            "Invoking Ollama LLM for resolution synthesis...",
            "Structuring numbered step-by-step guide...",
        ],
    },
    "provenance": {
        "icon": "📋",
        "label": "Provenance Agent",
        "thinking": [
            "Recording knowledge sources cited...",
            "Logging decision reasoning trail...",
            "Writing audit metadata...",
        ],
    },
    "jira_update": {
        "icon": "🔄",
        "label": "Jira Update Agent",
        "thinking": [
            "Posting resolution comment to Jira ticket...",
            "Transitioning ticket status...",
            "Syncing ORION-AI decision to project board...",
        ],
    },
    "pre_human_clarification": {
        "icon": "❓",
        "label": "Clarification Checkpoint Setup",
        "thinking": [
            "Preparing clarification questions...",
            "Saving checkpoint state...",
        ],
    },
    "pre_human_approval": {
        "icon": "🚨",
        "label": "Approval Checkpoint Setup",
        "thinking": [
            "Evaluating proposed action for high-risk request...",
            "Preparing supervisor approval checkpoint...",
        ],
    },
    "human_clarification": {
        "icon": "💬",
        "label": "Human Clarification Checkpoint",
        "thinking": ["Awaiting employee clarification..."],
    },
    "human_approval": {
        "icon": "👤",
        "label": "Human Approval Checkpoint",
        "thinking": ["Awaiting supervisor decision..."],
    },
    "verification": {
        "icon": "🔍",
        "label": "Verification Agent",
        "thinking": [
            "Running automated verification checks...",
            "Validating resolution outcome...",
        ],
    },
    "feedback": {
        "icon": "💬",
        "label": "Feedback Agent",
        "thinking": [
            "Recording resolution outcome...",
            "Updating ticket lifecycle state...",
        ],
    },
}


def print_banner() -> None:
    banner = Panel(
        Text.from_markup(
            "[bold cyan]ORION-AI — Federated Multi-Agent IT Support System[/bold cyan]\n"
            "[dim]Autonomous 13-Agent LangGraph Resolution Pipeline[/dim]\n"
            "[dim]Powered by Qdrant · Ollama · Jira · LangGraph[/dim]"
        ),
        border_style="cyan",
        padding=(1, 4),
    )
    console.print(banner)


def _handle_hitl_approval(
    ticket_id: str,
    interrupt_data: dict,
    session: Optional[UserSession] = None,
    current_state: Optional[dict] = None
) -> dict:
    """
    Interactive terminal handler for Human Approval checkpoints (risk >= 0.85).
    Enforces RBAC authorization, displays the proposed action, evidence, and reason,
    and collects APPROVE / MODIFY / REJECT from the authenticated reviewer.
    Returns the decision payload to pass to Command(resume=...).
    """
    user_role = (session.role if session and session.role else "admin").lower()
    reviewer_name = (session.name or session.username) if session else "terminal_supervisor"

    # Enforce role-based review authorization (admin, supervisor, tier-2, tier-3)
    is_authorized = user_role in ("admin", "supervisor", "tier-2", "tier-3")
    if not is_authorized:
        console.print("\n  [bold red]✗ You are not authorized to approve this review.[/bold red]")
        console.print(f"  [dim]Role '{user_role}' lacks supervisor clearance. Only administrators/supervisors may approve high-risk escalations.[/dim]\n")
        return {
            "decision": "REJECT",
            "comment": f"Auto-rejected: Reviewer '{reviewer_name}' with role '{user_role}' is not authorized to approve.",
            "reviewer": reviewer_name
        }

    title = interrupt_data.get("title") or (current_state.get("title") if current_state else "")
    risk_score = interrupt_data.get("risk_score") or (current_state.get("risk_score") if current_state else 0.95)
    proposed_action = interrupt_data.get("proposed_action") or (current_state.get("proposed_action") if current_state else "")
    review_id = interrupt_data.get("review_id") or "REV-MANUAL"
    reason = interrupt_data.get("reason") or (current_state.get("escalation_reason") if current_state else f"Security risk score ({risk_score:.2f}) exceeds escalation threshold (0.85).")
    evidence = interrupt_data.get("evidence") or (current_state.get("final_evidence") or current_state.get("consolidated_evidence") if current_state else [])

    console.print()
    risk_label = "CRITICAL" if risk_score >= 0.90 else "HIGH"
    panel_body = (
        f"[bold]Ticket:[/bold] [cyan]{escape(ticket_id)}[/cyan]\n"
        f"[bold]Risk:[/bold] [bold red]{risk_score:.2f} {risk_label}[/bold red]\n"
        f"[bold]Decision:[/bold] [bold red]ESCALATE[/bold red]\n\n"
        f"[bold]Proposed resolution:[/bold]\n{escape(proposed_action)}\n\n"
        f"[bold]Reason for escalation:[/bold]\n[dim]{escape(reason)}[/dim]\n\n"
        f"[dim]Review ID: {review_id} | Reviewer: {reviewer_name} ({user_role.upper()})[/dim]"
    )
    console.print(Panel(
        Text.from_markup(panel_body),
        title="[bold red]╭─ HUMAN APPROVAL REQUIRED ─╮[/bold red]",
        border_style="red",
        padding=(1, 2),
    ))

    # Evidence Review section (Section 9)
    if evidence:
        console.print("  [bold cyan]EVIDENCE REVIEW[/bold cyan]")
        ev_table = Table(box=box.ROUNDED, border_style="dim cyan", show_header=True)
        ev_table.add_column("#", style="dim", width=3)
        ev_table.add_column("Document Title", style="white")
        ev_table.add_column("Source", style="cyan", width=12)
        ev_table.add_column("Similarity", style="green", width=12)
        ev_table.add_column("Authority", style="dim", width=11)
        ev_table.add_column("Composite", style="bold green", width=11)
        for i, doc in enumerate(evidence[:3], 1):
            sim = doc.get("similarity") or doc.get("score") or 0.0
            comp = doc.get("composite_score") or sim
            auth = doc.get("authority", 0.90)
            ev_table.add_row(
                str(i),
                doc.get("title", "Untitled"),
                str(doc.get("source", "kb")).upper(),
                f"{sim:.2f}",
                f"{auth:.2f}",
                f"{comp:.2f}"
            )
        console.print(ev_table)
    else:
        console.print("  [dim]Evidence: No matching internal documentation found (Elevated Risk Trigger).[/dim]\n")

    console.print("  [bold]Select an action:[/bold]")
    console.print("    [bold green][1] APPROVE[/bold green] — Proceed with proposed action")
    console.print("    [bold yellow][2] MODIFY[/bold yellow]  — Approve with modified instructions")
    console.print("    [bold red][3] REJECT[/bold red]   — Reject action and escalate safely")

    while True:
        choice = console.input("\n  [bold cyan]Choice[/bold cyan] [1/2/3] → ").strip()
        if choice in ("1", "APPROVE", "approve"):
            console.print(f"\n  [green]✓ Human decision: APPROVE[/green]")
            console.print(f"  [green]✓ Reviewer: {reviewer_name}[/green]")
            return {"decision": "APPROVE", "reviewer": reviewer_name}

        elif choice in ("2", "MODIFY", "modify"):
            console.print("\n  [yellow]Human modification required.[/yellow]\n")
            console.print(f"  [bold]Proposed resolution:[/bold]\n  {escape(proposed_action)}\n")
            while True:
                modified = console.input("  [yellow]Enter modification[/yellow] → ").strip()
                if modified:
                    break
                console.print("  [red]Modification cannot be empty. Please enter instructions.[/red]")

            comment = console.input("  [dim]Optional supervisor note[/dim] → ").strip()
            console.print(f"\n  [green]✓ Modification recorded[/green]")
            console.print(f"  [green]✓ Reviewer: {reviewer_name}[/green]")
            return {
                "decision": "MODIFY",
                "modified_action": modified,
                "comment": comment or "Action modified by human supervisor",
                "reviewer": reviewer_name
            }

        elif choice in ("3", "REJECT", "reject"):
            console.print(f"\n  [red]✗ Human decision: REJECT[/red]")
            console.print(f"  [green]✓ Reviewer: {reviewer_name}[/green]")
            console.print("  [bold red]The proposed action will NOT be executed.[/bold red]\n")
            comment = console.input("  [dim]Reason for rejection[/dim] → ").strip()
            console.print(f"  [green]✓ Rejection recorded[/green]")
            console.print(f"  [green]✓ Safe workflow termination[/green]")
            console.print(f"  [green]✓ Provenance recorded[/green]")
            return {
                "decision": "REJECT",
                "comment": comment or "Action rejected by supervisor policy",
                "reviewer": reviewer_name
            }
        else:
            console.print("  [red]Invalid choice. Enter 1 (APPROVE), 2 (MODIFY), or 3 (REJECT).[/red]")


def _handle_hitl_clarification(
    ticket_id: str,
    interrupt_data: dict,
    current_state: Optional[dict] = None
) -> str:
    """
    Interactive terminal handler for Human Clarification checkpoints.
    Presents questions to the employee, validates input, and returns answers
    to be injected into the checkpoint via Command(resume=...).
    """
    title = interrupt_data.get("title") or (current_state.get("title") if current_state else "")
    questions = interrupt_data.get("questions") or [
        "When did this issue first begin occurring?",
        "How many employees or systems are currently affected?",
        "What exact error message or code is displayed?"
    ]
    review_id = interrupt_data.get("review_id") or "REV-CLARIFY"

    console.print()
    q_lines = "\n".join(f"  [yellow]{i+1}. {q}[/yellow]" for i, q in enumerate(questions))
    console.print(Panel(
        Text.from_markup(
            f"[bold yellow]⚠ CLARIFICATION REQUIRED[/bold yellow]\n\n"
            f"ORION-AI needs additional information:\n\n"
            f"{q_lines}\n\n"
            f"[dim]Ticket: {escape(ticket_id)} | Review ID: {review_id}[/dim]"
        ),
        title="[bold yellow]ℹ️ HUMAN INPUT REQUIRED[/bold yellow]",
        border_style="yellow",
        padding=(1, 2),
    ))

    console.print("  [bold cyan]Your response:[/bold cyan]")
    answers = []
    for i, question in enumerate(questions, 1):
        while True:
            answer = console.input(f"    [cyan]Answer {i}[/cyan] ({question}) → ").strip()
            if answer:
                answers.append(f"Q{i}: {question}\nA{i}: {answer}")
                break
            console.print("    [red]Answer cannot be empty. Please provide details.[/red]")

    combined = "\n".join(answers)
    console.print(f"\n  [green]✓ Clarification received[/green]\n")
    console.print("  [cyan]→ Resuming workflow...[/cyan]\n")
    return combined


def stream_agent_pipeline(ticket_info: dict, session: Optional[UserSession] = None) -> dict:
    """
    Stream the multi-agent LangGraph pipeline node-by-node.
    Shows animated thinking steps and real-time status for each node.
    Handles Human-in-the-Loop interrupts for approval and clarification
    directly on the checkpoint without restarting the workflow.
    """
    console.print()
    console.print(Rule(
        f"[bold cyan]🤖 ORION-AI AGENT PIPELINE — [{escape(ticket_info['key'])}][/bold cyan]",
        style="cyan"
    ))

    start_time = time.time()
    ticket_id = ticket_info["key"]

    initial_state = {
        "ticket_id": ticket_id,
        "title": ticket_info["summary"],
        "description": ticket_info["description"],
        "user_id": session.employee_id if session and session.employee_id else "EMP001",
        "department": session.department if session and session.department else "Engineering",
        "region": session.region if session and session.region else "AP-South",
        "category": "",
        "is_in_scope": True,
        "risk_score": 0.0,
        "evidence_confidence": 0.0,
        "routing_silos": [],
        "retrieved_evidence": [],
        "consolidated_evidence": [],
        "final_decision": "",
        "response": "",
        "provenance": {},
        "status": "",
        "feedback": {},
        "_start_time": start_time,
    }
    config = {"configurable": {"thread_id": ticket_id}}

    final_state = {}
    node_index = 0

    def _run_stream(state_or_command, cfg):
        """Inner helper to stream LangGraph steps and return accumulated state + any interrupt."""
        accumulated = dict(final_state)
        interrupt_payload = None

        try:
            for step in base_workflow.stream(state_or_command, config=cfg, stream_mode="updates"):
                for node_name, state_update in step.items():
                    if node_name == "__interrupt__":
                        interrupt_payload = state_update[0].value if state_update else {}
                        break

                    nonlocal node_index
                    node_index += 1
                    meta = NODE_META.get(node_name, {
                        "icon": "🔧",
                        "label": node_name.replace("_", " ").title(),
                        "thinking": ["Processing..."],
                    })

                    thinking_lines = meta["thinking"]
                    spinner_done = threading.Event()
                    elapsed_thinking = [0.0]

                    def animate_thinking(lines, done_event, elapsed_ref):
                        idx = 0
                        t0 = time.time()
                        with Live(console=console, refresh_per_second=8) as live:
                            while not done_event.is_set():
                                line = lines[idx % len(lines)]
                                elapsed_ref[0] = time.time() - t0
                                live.update(
                                    Text.from_markup(
                                        f"  [dim cyan]⟳[/dim cyan]  [dim]{line}[/dim]  "
                                        f"[dim]({elapsed_ref[0]:.1f}s)[/dim]"
                                    )
                                )
                                time.sleep(0.7)
                                idx += 1

                    t = threading.Thread(
                        target=animate_thinking,
                        args=(thinking_lines, spinner_done, elapsed_thinking),
                        daemon=True,
                    )
                    t.start()
                    time.sleep(min(len(thinking_lines) * 0.5, 1.2))
                    spinner_done.set()
                    t.join(timeout=1)

                    accumulated.update(state_update)
                    node_result = _extract_node_result(node_name, state_update)

                    console.print(
                        f"  [green]✓[/green] [bold]{meta['icon']} {meta['label']}[/bold]"
                        f"  [dim]({elapsed_thinking[0]:.1f}s)[/dim]"
                    )
                    if node_result:
                        console.print(f"    [dim]└─ {node_result}[/dim]")

                if interrupt_payload is not None:
                    break

        except Exception as exc:
            console.print(f"\n  [bold red]✗ LangGraph execution error:[/bold red] {exc}")
            accumulated["workflow_status"] = "failed"
            accumulated["error"] = str(exc)
            return accumulated, None

        return accumulated, interrupt_payload

    # Initial run
    final_state, interrupt_payload = _run_stream(initial_state, config)

    # Handle Human-in-the-Loop interrupts on the checkpoint
    max_hitl_rounds = 3
    hitl_round = 0
    while interrupt_payload is not None and hitl_round < max_hitl_rounds:
        hitl_round += 1
        review_type = str(interrupt_payload.get("type", "")).upper()

        console.print()
        console.print(Panel(
            "[bold yellow]Workflow paused at Human-in-the-Loop checkpoint.[/bold yellow]\n"
            "[dim]LangGraph execution suspended. Awaiting human input...[/dim]",
            border_style="yellow",
            padding=(0, 2)
        ))

        if "APPROVAL" in review_type:
            decision_payload = _handle_hitl_approval(
                ticket_id, interrupt_payload, session=session, current_state=final_state
            )
            resume_value = decision_payload
        else:  # CLARIFICATION
            answer = _handle_hitl_clarification(
                ticket_id, interrupt_payload, current_state=final_state
            )
            resume_value = answer

        console.print("  [green]✓ Human input received[/green]")
        console.print("  [cyan]→ Resuming LangGraph workflow...[/cyan]\n")

        resumed_state, interrupt_payload = _run_stream(Command(resume=resume_value), config)
        final_state.update(resumed_state)

    final_state["_elapsed"] = round(time.time() - start_time, 2)
    return final_state


def _extract_node_result(node_name: str, state_update: dict) -> str:
    """Extract a concise human-readable result line from each node's state update."""
    if node_name == "intent_detection":
        return f"Category → [cyan]{state_update.get('category', '?')}[/cyan]"
    if node_name == "scope_validation":
        return f"In scope → [cyan]{state_update.get('is_in_scope', '?')}[/cyan]"
    if node_name == "risk_assessment":
        r = state_update.get("risk_score", 0)
        color = "red" if r >= 0.85 else "yellow" if r >= 0.5 else "green"
        return f"Risk score → [{color}]{r:.2f}[/{color}]"
    if node_name == "knowledge_routing":
        silos = state_update.get("routing_silos", [])
        return f"Silos → [cyan]{', '.join(silos)}[/cyan]"
    if node_name in ("confluence_retrieval", "sharepoint_retrieval", "github_retrieval"):
        docs = state_update.get("retrieved_evidence", [])
        return f"Retrieved {len(docs)} document(s) from Qdrant"
    if node_name == "evidence_aggregation":
        docs = state_update.get("consolidated_evidence", [])
        conf = state_update.get("evidence_confidence", 0)
        return (
            f"Retained [cyan]{len(docs)}[/cyan] top documents  |  "
            f"Confidence → [cyan]{conf:.4f}[/cyan]"
        )
    if node_name == "conflict_resolution":
        return "Evidence conflicts resolved"
    if node_name == "decision":
        d = state_update.get("final_decision", "?").upper()
        color = {"RESOLVE": "green", "CLARIFY": "yellow", "ESCALATE": "red", "REJECT": "red"}.get(d, "white")
        return f"Decision → [{color}]{d}[/{color}]"
    if node_name == "pre_human_approval":
        r = state_update.get("risk_score") if state_update.get("risk_score") is not None else 0.95
        return f"Escalation checkpoint prepared  |  Risk: [red]{r:.2f}[/red]"
    if node_name == "pre_human_clarification":
        return "Clarification prompt prepared  |  Awaiting human input"
    if node_name == "human_approval":
        status = state_update.get("human_review_status", "PENDING")
        return f"Supervisor decision → [bold green]{status}[/bold green]"
    if node_name == "human_clarification":
        return "Clarification received  |  Context enriched"
    if node_name == "response_generation":
        resp = state_update.get("response", "")
        preview = resp[:80].replace("\n", " ") + "..." if resp else "(fallback)"
        return f"Response → [dim]{escape(preview)}[/dim]"
    if node_name == "verification":
        v_status = state_update.get("verification_status", "PASSED")
        color = "green" if v_status == "PASSED" else "yellow" if v_status == "NOT_RUN" else "red"
        mode_str = "  |  Mode: [yellow]SIMULATED[/yellow]" if v_status == "PASSED" else ""
        return f"Verification → [{color}]{v_status}[/{color}]{mode_str}"
    if node_name == "provenance":
        prov = state_update.get("provenance", {})
        c_count = len(prov.get("documents_cited", []))
        return f"Audit trail recorded  |  Citations: [cyan]{c_count}[/cyan]"
    if node_name == "jira_update":
        status = state_update.get("status", "?")
        return f"Jira status → [cyan]{status}[/cyan]"
    if node_name == "feedback":
        return f"Status → [cyan]{state_update.get('status', 'completed')}[/cyan]"
    return ""


def display_results(result: dict, ticket_info: dict, session: Optional[UserSession] = None) -> None:
    """Render the complete ORION-AI resolution output with rich panels, verification, and provenance."""
    decision = result.get("final_decision", "").upper()
    elapsed = result.get("_elapsed", 0.0)
    response_text = result.get("response", "").strip()

    console.print()
    console.print(Rule("[bold]ORION-AI RESULT SUMMARY[/bold]", style="cyan"))

    summary_table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    summary_table.add_column("Field", style="dim")
    summary_table.add_column("Value", style="bold")
    summary_table.add_row("Ticket ID", ticket_info["key"])
    summary_table.add_row("Category", result.get("category", "—"))
    risk = result.get("risk_score", 0)
    risk_color = "red" if risk >= 0.85 else "yellow" if risk >= 0.5 else "green"
    summary_table.add_row("Risk Score", f"[{risk_color}]{risk:.2f}[/{risk_color}]")
    summary_table.add_row(
        "Evidence Confidence",
        f"[cyan]{result.get('evidence_confidence', 0):.4f}[/cyan]"
    )
    summary_table.add_row("Silos Queried", ", ".join(result.get("routing_silos", [])))
    decision_colors = {
        "RESOLVE": "green", "CLARIFY": "yellow", "ESCALATE": "red", "REJECT": "red"
    }
    d_color = decision_colors.get(decision, "white")
    summary_table.add_row("Final Decision", f"[bold {d_color}]{decision}[/bold {d_color}]")
    summary_table.add_row("Processing Time", f"{elapsed}s")

    usage = llm.get_usage()
    summary_table.add_row("Agentic LLM Temp", f"[dim]{llm.last_temperature}[/dim]")
    summary_table.add_row("LLM Token Usage", f"[dim]{usage['total_tokens']} tokens (Prompt: {usage['prompt_tokens']} | Compl: {usage['completion_tokens']})[/dim]")

    console.print(summary_table)

    console.print()
    citations = result.get("provenance", {}).get("documents_cited", [])
    if citations:
        ev_table = Table(
            title="📚 Knowledge Sources Retrieved",
            box=box.ROUNDED,
            border_style="dim cyan",
            show_lines=False,
        )
        ev_table.add_column("#", style="dim", width=3)
        ev_table.add_column("Source", style="cyan", width=12)
        ev_table.add_column("Document Title", style="white")
        ev_table.add_column("Composite Score", style="green", justify="right", width=16)
        for i, doc in enumerate(citations, 1):
            if isinstance(doc, dict):
                score = doc.get("composite_score", 0)
                score_bar = "█" * int(score * 10) + "░" * (10 - int(score * 10))
                ev_table.add_row(
                    str(i),
                    doc.get("source", "").upper(),
                    doc.get("title", "—"),
                    f"{score:.4f} {score_bar}",
                )
        console.print(ev_table)

    console.print()
    if decision == "RESOLVE":
        if not response_text:
            evidence = result.get("consolidated_evidence", [])
            if evidence:
                best = max(evidence, key=lambda x: x.get("composite_score", 0))
                response_text = (
                    f"{best.get('content')}\n\n"
                    f"Source: {best.get('source', '').upper()} — {best.get('title')}"
                )
            else:
                response_text = "No documentation found. Please contact IT helpdesk."

        console.print(Panel(
            Text(response_text, style="white"),
            title="[bold green]✅ RESOLUTION GUIDE[/bold green]",
            border_style="green",
            padding=(1, 2),
        ))

    elif decision == "CLARIFY":
        console.print(Panel(
            "[yellow]ORION-AI requires additional information to resolve this ticket accurately.\n"
            "Please answer the clarification questions above.[/yellow]",
            title="[bold yellow]ℹ️ ADDITIONAL INFORMATION REQUIRED[/bold yellow]",
            border_style="yellow",
        ))

    elif decision == "ESCALATE":
        console.print(Panel(
            f"[red]This issue has been escalated to Tier-2/3 Systems Engineering.\n"
            f"Details: {response_text or 'Flagged for elevated risk or administrative authorization.'}[/red]",
            title="[bold red]🚨 TICKET ESCALATED[/bold red]",
            border_style="red",
        ))

    elif decision == "REJECT":
        console.print(Panel(
            "[red]This request does not fall within the IT support scope.[/red]",
            title="[bold red]❌ OUT OF SCOPE[/bold red]",
            border_style="red",
        ))

    # Verification stage display (Section 10 & 17)
    console.print()
    v_status = result.get("verification_status", "NOT_RUN")
    v_result = result.get("verification_result", "")
    v_checks = result.get("verification_checks", [])

    if v_status == "PASSED":
        v_title = "[bold green]✓ VERIFICATION PASSED[/bold green]"
        v_border = "green"
        v_lines = [
            "[bold green]Verification: PASSED[/bold green]",
            "[bold yellow]Mode: SIMULATED[/bold yellow]  [dim](Simulated diagnostic checks; no production database modified)[/dim]\n",
            "[bold]Diagnostic Checks:[/bold]"
        ]
        for chk in v_checks:
            chk_type = chk.get("type", "SIMULATED")
            v_lines.append(f"  [green]✓[/green] [{chk_type}] {chk.get('name', 'Check')}: {chk.get('details', 'Passed')}")
        v_lines.append(f"\n[bold]Result:[/bold]\n  {v_result or 'Resolution verified successfully (mode: SIMULATED).'}")
        console.print(Panel(Text.from_markup("\n".join(v_lines)), title=v_title, border_style=v_border, padding=(1, 2)))
    elif v_status == "FAILED":
        v_title = "[bold red]⚠ VERIFICATION FAILED[/bold red]"
        v_border = "red"
        v_lines = [
            "[bold red]Verification: FAILED[/bold red]",
            "[bold yellow]Mode: SIMULATED[/bold yellow]\n",
            "[bold]Diagnostic Checks:[/bold]"
        ]
        for chk in v_checks:
            status_icon = "[green]✓[/green]" if chk.get("status") == "PASSED" else "[red]✗[/red]"
            v_lines.append(f"  {status_icon} {chk.get('name', 'Check')}: {chk.get('details', 'Failed')}")
        v_lines.append(f"\n[bold]Result:[/bold]\n  {v_result or 'Resolution verification failed diagnostic probes.'}")
        console.print(Panel(Text.from_markup("\n".join(v_lines)), title=v_title, border_style=v_border, padding=(1, 2)))
    else:
        v_title = "[dim]VERIFICATION (NOT RUN)[/dim]"
        v_border = "dim"
        v_text = f"[dim]Status: {v_status}\nMode: NOT_APPLICABLE\nResult: {v_result or 'Verification omitted for non-resolved ticket.'}[/dim]"
        console.print(Panel(Text.from_markup(v_text), title=v_title, border_style=v_border, padding=(1, 2)))

    # Provenance summary display (Section 11)
    console.print()
    prov = result.get("provenance", {})
    p_decision = result.get("final_decision", "").upper()
    docs = result.get("final_evidence") or result.get("consolidated_evidence") or []
    p_docs_count = len(docs)
    p_verif = result.get("verification_status", "NOT_RUN")
    review_status = result.get("human_review_status")
    if review_status:
        p_review = str(review_status).upper()
    else:
        p_review = "NOT REQUIRED"
    reviewer = result.get("human_review_actor") or (session.name or session.username if session else "N/A")
    jira_status = result.get("status") or result.get("jira_status") or "SUCCESS"

    prov_table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    prov_table.add_column("Field", style="dim", width=26)
    prov_table.add_column("Value", style="bold")
    prov_table.add_row("Decision", p_decision)
    prov_table.add_row("Retrieved KB evidence", f"{p_docs_count} item{'s' if p_docs_count != 1 else ''} (RAG)")

    safety_basis = prov.get("policy_safety_basis") or "Enterprise-Access-Control-v2 (Zero Trust)"
    prov_table.add_row("Policy/Safety basis", safety_basis)

    if p_review != "NOT REQUIRED":
        prov_table.add_row("Human authorization", f"[green]{p_review}[/green] by [bold]{reviewer}[/bold]")
    else:
        prov_table.add_row("Human authorization", "[dim]NOT REQUIRED (Autonomous)[/dim]")

    v_display = f"{p_verif} [yellow](Mode: SIMULATED)[/yellow]" if p_verif == "PASSED" else p_verif
    prov_table.add_row("Verification", v_display)
    prov_table.add_row("Jira update", str(jira_status).upper())

    console.print(Panel(prov_table, title="[bold cyan]📋 PROVENANCE & AUDIT TRAIL[/bold cyan]", border_style="cyan", padding=(1, 2)))

    console.print()
    console.print(f"  🔗 [link={ticket_info['url']}]{ticket_info['url']}[/link]")


class TerminalChatbot:
    """
    ORION-AI Interactive Terminal Application.

    Renders a rich animated multi-agent AI pipeline experience showing every
    LangGraph node in real-time with thinking animations, evidence tables,
    and structured resolution panels.
    """

    def __init__(self) -> None:
        self.auth_manager = AuthManager()
        self.session = UserSession()
        self.jira = JiraTool()

    def run_login(self) -> bool:
        console.print()
        console.print(Rule("[bold cyan]EMPLOYEE AUTHENTICATION[/bold cyan]", style="cyan"))
        attempts = 0
        while attempts < 3:
            username = console.input("  [cyan]Username[/cyan] (default: pearl) → ").strip() or "pearl"
            password = console.input("  [cyan]Password[/cyan] (default: admin123) → ").strip() or "admin123"
            profile = self.auth_manager.authenticate(username, password)
            if profile:
                self.session.login(profile)
                console.print(
                    f"\n  [green]✅ Welcome, [bold]{self.session.name}[/bold]![/green]  "
                    f"[dim]{self.session.department} | {self.session.region} | Role: {self.session.role}[/dim]"
                )
                return True
            else:
                attempts += 1
                console.print(f"  [red]❌ Invalid credentials. ({3 - attempts} attempts remaining)[/red]")
        console.print("[red]Maximum attempts exceeded.[/red]")
        return False

    def run_ticket_creation(self) -> Optional[dict]:
        console.print()
        console.print(Rule("[bold cyan]SUBMIT IT SUPPORT ISSUE[/bold cyan]", style="cyan"))

        menu_table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
        menu_table.add_column("Opt", style="cyan bold", width=4)
        menu_table.add_column("Issue", style="white")
        for key, tmpl in ISSUE_TEMPLATES.items():
            menu_table.add_row(f"{key}.", tmpl["label"])
        console.print(menu_table)

        while True:
            choice = console.input("\n  [cyan]Select option[/cyan] [1-9] → ").strip()
            if choice in ISSUE_TEMPLATES:
                break
            console.print("  [red]Invalid option. Enter 1-9.[/red]")

        template = ISSUE_TEMPLATES[choice]

        if template["summary"] is None:
            summary = console.input("  [cyan]Issue Title[/cyan] → ").strip()
            if not summary:
                console.print("[red]Title cannot be empty.[/red]")
                return None
            description = console.input("  [cyan]Description[/cyan] → ").strip() or summary
        else:
            summary = template["summary"]
            description = template["description"]
            console.print(f"  [green]✓[/green] Template: [bold]{template['label']}[/bold]")

        full_description = (
            f"{description}\n\n"
            f"--- Reporter Metadata ---\n"
            f"Employee ID: {self.session.employee_id}\n"
            f"Name: {self.session.name}\n"
            f"Department: {self.session.department}\n"
            f"Region: {self.session.region}\n"
            f"Source: ORION-AI Terminal Assistant"
        )

        console.print("\n  Creating Jira ticket...", end="")
        try:
            jira_ticket = self.jira.create_ticket(
                summary=summary,
                description=full_description,
                priority="Medium",
            )
            console.print(
                f" [green]✅ [{escape(jira_ticket['key'])}][/green]  "
                f"[dim][link={jira_ticket['url']}]{jira_ticket['url']}[/link][/dim]"
            )
            return {
                "key": jira_ticket["key"],
                "summary": summary,
                "description": description,
                "url": jira_ticket["url"],
            }
        except Exception as e:
            console.print(f" [red]❌ Failed: {e}[/red]")
            return None

    def run_feedback_loop(self, ticket_key: str) -> None:
        console.print()
        console.print(Rule("[bold cyan]EMPLOYEE FEEDBACK[/bold cyan]", style="cyan"))
        choice = console.input("  Was this resolution helpful? [Y/n] → ").strip().lower()
        is_helpful = choice in ["y", "yes", ""]
        feedback_notes = ""
        if not is_helpful:
            feedback_notes = console.input(
                "  What was missing or incorrect? → "
            ).strip()
        try:
            self.jira.add_comment(
                ticket_key,
                f"*💬 Employee Feedback*\n\n"
                f"*Satisfactory:* {'Yes ✅' if is_helpful else 'No ❌'}\n"
                f"{f'*Notes:* {feedback_notes}' if feedback_notes else ''}",
            )
            console.print("  [green]✓ Feedback recorded on Jira.[/green]")
        except Exception as e:
            console.print(f"  [dim]Recorded locally. (Jira: {e})[/dim]")

    def start(self) -> None:
        print_banner()

        if not self.run_login():
            return

        while True:
            ticket_info = self.run_ticket_creation()
            if not ticket_info:
                console.print("[yellow]Ticket creation aborted.[/yellow]")
            else:
                # Stream the complete multi-agent LangGraph pipeline with native HITL checkpointing
                result = stream_agent_pipeline(ticket_info, session=self.session)

                # Render comprehensive result summary with verification and provenance
                display_results(result, ticket_info, session=self.session)

                if result.get("final_decision") in ("resolve", "escalate"):
                    self.run_feedback_loop(ticket_info["key"])

            console.print()
            console.print(Rule(style="dim"))
            again = console.input(
                "\n  [cyan]Submit another ticket?[/cyan] [y/N] → "
            ).strip().lower()
            if again not in ["y", "yes"]:
                console.print(
                    f"\n[bold cyan]Thank you for using ORION-AI, {self.session.name}. Goodbye! 👋[/bold cyan]\n"
                )
                break
