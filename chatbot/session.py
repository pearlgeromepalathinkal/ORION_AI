from typing import Optional, Dict, Any


class UserSession:
    """
    Encapsulates an active employee session within the terminal assistant.
    """

    def __init__(self) -> None:
        self.employee_id: Optional[str] = None
        self.username: Optional[str] = None
        self.name: Optional[str] = None
        self.department: Optional[str] = None
        self.email: Optional[str] = None
        self.region: Optional[str] = None
        self.role: Optional[str] = None
        self.is_authenticated: bool = False

    def login(self, profile: Dict[str, Any]) -> None:
        """Populate session state from authenticated user profile."""
        self.employee_id = profile.get("employee_id")
        self.username = profile.get("username")
        self.name = profile.get("name")
        self.department = profile.get("department")
        self.email = profile.get("email")
        self.region = profile.get("region")
        self.role = profile.get("role")
        self.is_authenticated = True

    def logout(self) -> None:
        """Clear active session state."""
        self.__init__()

    def to_dict(self) -> Dict[str, Any]:
        """Export session context dictionary."""
        return {
            "employee_id": self.employee_id,
            "username": self.username,
            "name": self.name,
            "department": self.department,
            "email": self.email,
            "region": self.region,
            "role": self.role,
        }
