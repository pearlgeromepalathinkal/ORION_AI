"""
Ticket Submission and Management Routes.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas import TicketCreateRequest, TicketCreateResponse
from backend.services.workflow_service import WorkflowService
from backend.dependencies import get_workflow_service, get_current_user

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


@router.post("", response_model=TicketCreateResponse, status_code=status.HTTP_202_ACCEPTED, summary="Submit IT Support Ticket")
async def submit_ticket(
    req: TicketCreateRequest,
    current_user: dict = Depends(get_current_user),
    workflows: WorkflowService = Depends(get_workflow_service)
) -> TicketCreateResponse:
    """
    Submits a new IT support ticket and triggers autonomous resolution in the background.
    Returns immediately with ticket ID and processing status.
    """
    user_id = req.user_id or current_user.get("sub") or current_user.get("username")
    dept = req.department or current_user.get("department", "Engineering")
    region = req.region or current_user.get("region", "AP-South")

    result = workflows.start_workflow_async(
        issue=req.issue,
        title=req.title,
        user_id=user_id,
        department=dept,
        region=region
    )

    return TicketCreateResponse(
        ticket_id=result["ticket_id"],
        status=result["status"],
        message=result["message"],
        jira_url=result.get("jira_url")
    )


@router.get("", summary="List Submitted Tickets")
async def list_tickets(
    current_user: dict = Depends(get_current_user),
    workflows: WorkflowService = Depends(get_workflow_service)
) -> List[Dict[str, Any]]:
    """
    Returns list of submitted tickets for the authenticated employee.
    Admins can view all system tickets.
    """
    is_admin = current_user.get("role") == "admin"
    user_id = current_user.get("sub") or current_user.get("username")
    entries = workflows.list_workflows_for_user(user_id=user_id, is_admin=is_admin)

    return [
        {
            "ticket_id": e["ticket_id"],
            "owner_id": e.get("owner_id"),
            "workflow_status": e.get("workflow_status"),
            "current_node": e.get("current_node"),
            "start_time": e.get("start_time"),
            "end_time": e.get("end_time"),
            "title": e.get("state", {}).get("title"),
            "category": e.get("state", {}).get("category"),
            "final_decision": e.get("state", {}).get("final_decision")
        }
        for e in entries
    ]
