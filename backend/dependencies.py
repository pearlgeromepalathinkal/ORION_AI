"""
FastAPI Dependencies for Authentication, Authorization, and Service Injection.
"""

from typing import Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.services.auth_service import auth_service, AuthService
from backend.services.workflow_service import workflow_service, WorkflowService
from backend.services.event_service import event_service, EventService

security = HTTPBearer(auto_error=False)


def get_auth_service() -> AuthService:
    return auth_service


def get_workflow_service() -> WorkflowService:
    return workflow_service


def get_event_service() -> EventService:
    return event_service


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    service: AuthService = Depends(get_auth_service)
) -> Dict[str, Any]:
    """
    Extracts and validates JWT Bearer token.
    Raises HTTP 401 if missing, expired, or invalid.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Authentication token missing."}
        )

    token = credentials.credentials
    payload = service.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired access token."}
        )

    return payload


async def get_current_admin(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Requires the authenticated user to hold the 'admin' role.
    Raises HTTP 403 otherwise.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Administrative access required."}
        )
    return current_user
