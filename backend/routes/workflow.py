"""
Workflow Endpoints for Synchronous Execution, State Queries, and WebSocket Event Streaming.
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from backend.schemas import WorkflowRunRequest, WorkflowStatusResponse
from backend.services.workflow_service import WorkflowService
from backend.services.event_service import EventService
from backend.dependencies import get_workflow_service, get_event_service, get_current_user

router = APIRouter(tags=["Workflows"])


@router.post(
    "/api/workflows/run",
    response_model=WorkflowStatusResponse,
    summary="Execute LangGraph Workflow Synchronously"
)
async def run_workflow(
    req: WorkflowRunRequest,
    current_user: dict = Depends(get_current_user),
    workflows: WorkflowService = Depends(get_workflow_service)
) -> WorkflowStatusResponse:
    """
    Executes the complete LangGraph multi-agent pipeline synchronously
    and returns the structured final resolution and audit state.
    """
    user_id = req.user_id or current_user.get("sub") or current_user.get("username")
    dept = req.department or current_user.get("department", "Engineering")
    region = req.region or current_user.get("region", "AP-South")

    # Run workflow on LangGraph
    response = workflows.run_workflow_sync(
        issue=req.issue,
        title=req.title,
        user_id=user_id,
        department=dept,
        region=region,
        ticket_id=req.ticket_id
    )
    return response


@router.get(
    "/api/workflows/{ticket_id}",
    response_model=WorkflowStatusResponse,
    summary="Get Current Workflow State"
)
async def get_workflow_status(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
    workflows: WorkflowService = Depends(get_workflow_service)
) -> WorkflowStatusResponse:
    """
    Retrieves the latest execution state, decision, and telemetry for a specific ticket.
    Enforces authorization: employees can view their own tickets; admins can view any ticket.
    """
    entry = workflows.get_workflow(ticket_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WORKFLOW_NOT_FOUND", "message": f"No workflow found for ticket {ticket_id}."}
        )

    # Authorization verification
    is_admin = current_user.get("role") == "admin"
    owner_id = entry.get("owner_id")
    user_id = current_user.get("sub") or current_user.get("username")
    if not is_admin and owner_id and owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Access to another employee's ticket is restricted."}
        )

    state = entry.get("state", {})
    workflow_status = entry.get("workflow_status", "processing")
    return workflows.format_workflow_response(state, workflow_status)


@router.websocket("/ws/workflows/{ticket_id}")
async def workflow_events_ws(
    websocket: WebSocket,
    ticket_id: str,
    events: EventService = Depends(get_event_service),
    workflows: WorkflowService = Depends(get_workflow_service)
):
    """
    WebSocket endpoint streaming live multi-agent execution events.
    Sends buffered history first, then streams live events until workflow finishes.
    """
    await websocket.accept()
    events.subscribe(ticket_id, websocket)

    try:
        # Check if workflow is already completed
        entry = workflows.get_workflow(ticket_id)
        if entry and entry.get("workflow_status") in ("completed", "failed"):
            # Send all historical events
            for hist_event in events.get_history(ticket_id):
                await websocket.send_json(hist_event)

            # Send final state snapshot
            await websocket.send_json({
                "event": "workflow_completed" if entry["workflow_status"] == "completed" else "workflow_failed",
                "ticket_id": ticket_id,
                "status": entry["workflow_status"],
                "final_decision": entry.get("state", {}).get("final_decision"),
                "response": entry.get("state", {}).get("response")
            })
            await websocket.close(code=1000)
            return

        # Send any prior buffered events
        for hist_event in events.get_history(ticket_id):
            await websocket.send_json(hist_event)

        # Keep connection open waiting for incoming messages or termination
        while True:
            # Client can send ping or wait
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                if msg == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                pass

            # Check if workflow just reached terminal status
            updated_entry = workflows.get_workflow(ticket_id)
            if updated_entry and updated_entry.get("workflow_status") in ("completed", "failed"):
                # Give a short breather for final events to flush
                await asyncio.sleep(0.1)
                await websocket.close(code=1000)
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WebSocket] Client exception for {ticket_id}: {e}", flush=True)
    finally:
        events.unsubscribe(ticket_id, websocket)
