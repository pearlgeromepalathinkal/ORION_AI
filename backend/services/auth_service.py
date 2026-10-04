"""
Authentication Service integrating with existing SQLite AuthManager and issuing JWT tokens.
"""

import datetime
from typing import Optional, Dict, Any
import jwt

from config import Config
from chatbot.auth import AuthManager


class AuthService:
    """
    Manages user authentication and JWT token generation/validation.
    Wraps the existing SQLite AuthManager to maintain a single source of truth.
    """

    def __init__(self, auth_manager: Optional[AuthManager] = None) -> None:
        self.auth_manager = auth_manager or AuthManager()

    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Verify username and password against SQLite store."""
        return self.auth_manager.authenticate(username, password)

    def create_access_token(self, profile: Dict[str, Any]) -> str:
        """
        Generate a signed JWT token containing user identity and role.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        expire = now + datetime.timedelta(minutes=Config.JWT_EXPIRATION_MINUTES)

        payload = {
            "sub": profile["employee_id"],
            "username": profile["username"],
            "name": profile["name"],
            "role": profile.get("role", "employee"),
            "department": profile.get("department", ""),
            "region": profile.get("region", ""),
            "email": profile.get("email", ""),
            "iat": now,
            "exp": expire
        }

        token = jwt.encode(
            payload,
            Config.JWT_SECRET_KEY,
            algorithm=Config.JWT_ALGORITHM
        )
        return token

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Decode and validate JWT access token.
        Returns payload dict if valid, None otherwise.
        """
        try:
            payload = jwt.decode(
                token,
                Config.JWT_SECRET_KEY,
                algorithms=[Config.JWT_ALGORITHM]
            )
            return payload
        except (jwt.PyJWTError, Exception):
            return None


# Global singleton instance
auth_service = AuthService()
