import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env in project root
ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=ROOT_DIR / ".env")

class Config:
    """
    Centralized configuration manager for ORION-AI.
    Loads and validates all infrastructure credentials and environment parameters.
    """
    # Environment & Paths
    ROOT_DIR: Path = ROOT_DIR
    DATA_DIR: Path = ROOT_DIR / "data"
    DB_PATH: Path = DATA_DIR / "users.db"
    
    # Jira Settings
    JIRA_URL: str = os.getenv("JIRA_URL", "").rstrip("/")
    JIRA_EMAIL: str = os.getenv("JIRA_EMAIL", "")
    JIRA_API_TOKEN: str = os.getenv("JIRA_API_TOKEN", "")
    JIRA_PROJECT_KEY: str = os.getenv("JIRA_PROJECT_KEY", "KAN")
    
    # Qdrant Settings
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "http://localhost:6333")
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "orion_knowledge")
    
    # Ollama Settings
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

    # Multi-Agent Orchestration & Decision Thresholds
    EVIDENCE_RESOLVE_THRESHOLD: float = float(os.getenv("EVIDENCE_RESOLVE_THRESHOLD", "0.50"))
    RISK_ESCALATION_THRESHOLD: float = float(os.getenv("RISK_ESCALATION_THRESHOLD", "0.85"))
    CLARIFICATION_THRESHOLD: float = float(os.getenv("CLARIFICATION_THRESHOLD", "0.50"))
    KNOWN_SIMILARITY_THRESHOLD: float = float(os.getenv("KNOWN_SIMILARITY_THRESHOLD", "0.85"))
    UNKNOWN_SIMILARITY_THRESHOLD: float = float(os.getenv("UNKNOWN_SIMILARITY_THRESHOLD", "0.55"))
    MAX_EVIDENCE_ITEMS: int = int(os.getenv("MAX_EVIDENCE_ITEMS", "4"))
    RETRIEVAL_TOP_K: int = int(os.getenv("RETRIEVAL_TOP_K", "3"))

    # Mock Ticket Prefixes for Test / Sandbox Identification
    MOCK_TICKET_PREFIXES: tuple = (
        "INC-", "MOCK-", "TEST-", "JIRA-10", "JIRA-11", "JIRA-12", "SAMPLE-"
    )

    # JWT & Authentication Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "orion-ai-super-secure-default-jwt-secret-key-2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_MINUTES: int = int(os.getenv("JWT_EXPIRATION_MINUTES", "480"))

    # CORS Settings
    CORS_ORIGINS: list = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]

    # API Server Settings
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    @classmethod
    def validate(cls) -> bool:
        """Verify essential directory structures exist."""
        cls.DATA_DIR.mkdir(parents=True, exist_ok=True)
        return True

Config.validate()


