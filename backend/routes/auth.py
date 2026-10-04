"""
Authentication Routes for Employee Login and Session Retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas import LoginRequest, TokenResponse, UserProfile
from backend.services.auth_service import AuthService
from backend.dependencies import get_auth_service, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse, summary="Employee Login")
async def login(
    req: LoginRequest,
    auth: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """
    Authenticates employee credentials against the SQLite database
    and returns a signed JWT access token.
    """
    profile = auth.authenticate(req.username, req.password)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid username or password."}
        )

    token = auth.create_access_token(profile)
    user = UserProfile(
        employee_id=profile["employee_id"],
        username=profile["username"],
        name=profile["name"],
        department=profile["department"],
        email=profile["email"],
        region=profile["region"],
        role=profile.get("role", "employee")
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user
    )


@router.get("/me", response_model=UserProfile, summary="Get Current User Profile")
async def get_me(current_user: dict = Depends(get_current_user)) -> UserProfile:
    """Returns profile information for the currently authenticated employee."""
    return UserProfile(
        employee_id=current_user["sub"],
        username=current_user["username"],
        name=current_user["name"],
        department=current_user.get("department", ""),
        email=current_user.get("email", ""),
        region=current_user.get("region", ""),
        role=current_user.get("role", "employee")
    )
