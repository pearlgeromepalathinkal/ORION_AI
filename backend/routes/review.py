"""
Human-in-the-Loop Review REST API Routes.

Exposes endpoints to:
  - Retrieve pending human review details for a paused workflow
  - Submit approval/modification/rejection decisions
  - Submit clarification answers
  - Retrieve evidence and verification results
"""

import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.services.workflow_service import WorkflowService
from backend.dependencies import get_workflow_service, get_current_user

router = APIRouter(tags=["Human Review"])


# ─────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────

class ReviewDecisionRequest(BaseModel):
    decision: str = Field(
        ...,
        description="One of: APPROVE, MODIFY, REJECT",
        pattern="^(APPROVE|MODIFY|REJECT)$"
    )
    modified_action: Optional[str] = Field(
        None,
        description="Replacement action text when decision=MODIFY"
    )
    comment: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional reviewer notes"
    )


class ClarificationRequest(BaseModel):
    answer: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="Employee's answers to the clarification questions"
    )


class ReviewStatusResponse(BaseModel):
    ticket_id: str
    review_type: str
    review_status: str
    review_id: Optional[str] = None
    proposed_action: Optional[str] = None
    questions: list = Field(default_factory=list)
    options: list = Field(default_factory=list)
    risk_score: Optional[float] = None
    evidence_count: int = 0
    created_at: Optional[str] = None
    root_cause_hypothesis: Optional[str] = None
    diagnostic_reasoning: Optional[str] = None
    diagnostic_confidence: Optional[float] = None
    proposed_remediation: Optional[str] = None
    top_similarity: Optional[float] = None
    knowledge_route: Optional[str] = None



class EvidenceResponse(BaseModel):
    ticket_id: str
    evidence_count: int
    evidence_confidence: float
    documents: list = Field(default_factory=list)


class VerificationResponse(BaseModel):
    ticket_id: str
    verification_status: str
    verification_result: str
    checks: list = Field(default_factory=list)


# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────

def _require_workflow(ticket_id: str, workflows: WorkflowService):
    entry = workflows.get_workflow(ticket_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WORKFLOW_NOT_FOUND", "message": f"No workflow found for ticket {ticket_id}."}
        )
    return entry


def _require_admin_or_owner(current_user: dict, entry: dict):
    is_admin = current_user.get("role") == "admin"
    owner_id = entry.get("owner_id")
    user_id = current_user.get("sub") or current_user.get("username")
    if not is_admin and owner_id and owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Access to another employee's ticket is restricted."}
        )


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.get(
    "/api/workflows/{ticket_id}/review",
    response_model=ReviewStatusResponse,
    summary="Get Pending Human Review Details"
)
async def get_review(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
    workflows: WorkflowService = Depends(get_workflow_service)
) -> ReviewStatusResponse:
    """
    Returns the current human review checkpoint state for a paused workflow.
    Includes review type, questions (for CLARIFICATION) or proposed action (for APPROVAL),
    current status, and available options.
    """
    entry = _require_workflow(ticket_id, workflows)
    _require_admin_or_owner(current_user, entry)

    state = entry.get("state", {})
    workflow_status = entry.get("workflow_status", "processing")

    if workflow_status not in ("awaiting_approval", "awaiting_clarification"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "NO_REVIEW_PENDING",
                "message": f"Workflow for {ticket_id} is not awaiting human review (status: {workflow_status})."
            }
        )

    review_type = state.get("human_review_type", "UNKNOWN")
    evidence = state.get("final_evidence") or state.get("consolidated_evidence") or []

    return ReviewStatusResponse(
        ticket_id=ticket_id,
        review_type=str(review_type),
        review_status=str(state.get("human_review_status", "PENDING")),
        review_id=state.get("human_review_id"),
        proposed_action=state.get("proposed_action") or state.get("proposed_remediation"),
        questions=state.get("human_review_questions") or [],
        options=["APPROVE", "MODIFY", "REJECT"] if ("APPROVAL" in str(review_type) or str(review_type) == "UNKNOWN_DIAGNOSTIC") else ["ANSWER"],
        risk_score=state.get("risk_score"),
        evidence_count=len(evidence),
        created_at=state.get("human_review_timestamp") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
        root_cause_hypothesis=state.get("root_cause_hypothesis"),
        diagnostic_reasoning=state.get("diagnostic_reasoning"),
        diagnostic_confidence=state.get("diagnostic_confidence"),
        proposed_remediation=state.get("proposed_remediation"),
        top_similarity=state.get("top_similarity"),
        knowledge_route=state.get("knowledge_route"),
    )


@router.post(
    "/api/workflows/{ticket_id}/review/decision",
    summary="Submit Human Approval Decision (APPROVE / MODIFY / REJECT)"
)
async def submit_review_decision(
    ticket_id: str,
    req: ReviewDecisionRequest,
    current_user: dict = Depends(get_current_user),
    workflows: WorkflowService = Depends(get_workflow_service)
):
    """
    Submits a human approval decision for a paused high-risk workflow.
    Resumes LangGraph execution with the reviewer's choice.
    Only admins or supervisors may approve/reject.
    """
    entry = _require_workflow(ticket_id, workflows)

    is_admin = current_user.get("role") == "admin"
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "INSUFFICIENT_ROLE",
                "message": "Only administrators or supervisors may approve/reject high-risk tickets."
            }
        )

    workflow_status = entry.get("workflow_status", "processing")
    if workflow_status != "awaiting_approval":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "NOT_AWAITING_APPROVAL",
                "message": f"Workflow for {ticket_id} is not awaiting approval (status: {workflow_status})."
            }
        )

    reviewer = current_user.get("sub") or current_user.get("username") or "admin_supervisor"
    decision_payload = {
        "decision": req.decision,
        "modified_action": req.modified_action,
        "comment": req.comment,
        "reviewer": reviewer
    }

    result = workflows.resume_workflow(ticket_id, decision_payload)
    return {
        "ticket_id": ticket_id,
        "decision": req.decision,
        "reviewer": reviewer,
        "status": result.get("workflow_status", "in_progress"),
        "message": f"Decision '{req.decision}' recorded. Workflow resumed.",
        "final_decision": result.get("final_decision"),
        "response": result.get("response")
    }


@router.post(
    "/api/workflows/{ticket_id}/clarification",
    summary="Submit Clarification Answer"
)
async def submit_clarification(
    ticket_id: str,
    req: ClarificationRequest,
    current_user: dict = Depends(get_current_user),
    workflows: WorkflowService = Depends(get_workflow_service)
):
    """
    Submits the employee's answers to clarification questions for a paused workflow.
    Resumes LangGraph execution so the pipeline can retry with enriched context.
    """
    entry = _require_workflow(ticket_id, workflows)
    _require_admin_or_owner(current_user, entry)

    workflow_status = entry.get("workflow_status", "processing")
    if workflow_status != "awaiting_clarification":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "NOT_AWAITING_CLARIFICATION",
                "message": f"Workflow for {ticket_id} is not awaiting clarification (status: {workflow_status})."
            }
        )

    result = workflows.resume_workflow(ticket_id, req.answer)
    return {
        "ticket_id": ticket_id,
        "status": result.get("workflow_status", "in_progress"),
        "message": "Clarification submitted. Workflow resumed.",
        "final_decision": result.get("final_decision"),
        "response": result.get("response")
    }


@router.get(
    "/api/workflows/{ticket_id}/evidence",
    response_model=EvidenceResponse,
    summary="Get Retrieved Evidence Documents"
)
async def get_evidence(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
    workflows: WorkflowService = Depends(get_workflow_service)
) -> EvidenceResponse:
    """
    Returns the retrieved and ranked evidence documents for transparent review.
    Useful for human reviewers to inspect what the AI found before approving.
    """
    entry = _require_workflow(ticket_id, workflows)
    _require_admin_or_owner(current_user, entry)

    state = entry.get("state", {})
    evidence = state.get("final_evidence") or state.get("consolidated_evidence") or []

    docs = [
        {
            "source": d.get("source", "unknown"),
            "title": d.get("title", "Untitled"),
            "content": d.get("content", ""),
            "similarity": d.get("score") or d.get("similarity"),
            "composite_score": d.get("composite_score")
        }
        for d in evidence
    ]

    return EvidenceResponse(
        ticket_id=ticket_id,
        evidence_count=len(docs),
        evidence_confidence=float(state.get("evidence_confidence", 0.0)),
        documents=docs
    )


@router.get(
    "/api/workflows/{ticket_id}/verification",
    response_model=VerificationResponse,
    summary="Get Post-Resolution Verification Results"
)
async def get_verification(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
    workflows: WorkflowService = Depends(get_workflow_service)
) -> VerificationResponse:
    """
    Returns the post-resolution verification check results.
    Shows whether the automated fix was verified (SIMULATED/ACTUAL/NOT_RUN),
    what checks ran, and whether they PASSED or FAILED.
    """
    entry = _require_workflow(ticket_id, workflows)
    _require_admin_or_owner(current_user, entry)

    state = entry.get("state", {})
    checks = state.get("verification_checks") or []

    return VerificationResponse(
        ticket_id=ticket_id,
        verification_status=str(state.get("verification_status", "NOT_RUN")),
        verification_result=str(state.get("verification_result", "No verification data available.")),
        checks=checks
    )
