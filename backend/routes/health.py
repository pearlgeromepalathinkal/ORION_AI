"""
Health and Dependency Status Endpoints for ORION-AI.
"""

import urllib.request
from fastapi import APIRouter
from config import Config
from tools.qdrant_tools import QdrantTool
from tools.jira_tools import JiraTool
from backend.schemas import HealthResponse, DependencyHealthResponse, DependencyStatus

router = APIRouter(tags=["Health"])

qdrant_checker = QdrantTool()
try:
    jira_checker = JiraTool()
except Exception:
    jira_checker = None


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
async def health_check() -> HealthResponse:
    """Returns basic system health status."""
    return HealthResponse(status="ok", service="orion-ai", version="1.0.0")


@router.get("/health/dependencies", response_model=DependencyHealthResponse, summary="Dependency Health Check")
async def dependency_health() -> DependencyHealthResponse:
    """
    Checks connectivity of backing infrastructure (Qdrant, Ollama, Jira).
    Sanitized to never expose passwords, tokens, or internal URLs.
    """
    # 1. Qdrant health
    try:
        q_ok, _ = qdrant_checker.health_check()
        qdrant_status = DependencyStatus(
            available=q_ok,
            mode="docker",
            details="Qdrant vector engine reachable" if q_ok else "Qdrant connection failed"
        )
    except Exception as e:
        qdrant_status = DependencyStatus(available=False, mode="docker", details=f"Unavailable: {type(e).__name__}")

    # 2. Ollama health
    try:
        req = urllib.request.Request(f"{Config.OLLAMA_HOST}/api/version", method="GET")
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            o_ok = resp.status == 200
        ollama_status = DependencyStatus(
            available=o_ok,
            mode="local",
            details=f"Ollama server operational (model: {Config.OLLAMA_MODEL})" if o_ok else "Ollama unreachable"
        )
    except Exception as e:
        ollama_status = DependencyStatus(available=False, mode="local", details=f"Unavailable: {type(e).__name__}")

    # 3. Jira health
    if jira_checker:
        try:
            j_ok, _ = jira_checker.health_check()
            jira_status = DependencyStatus(
                available=j_ok,
                mode="cloud" if j_ok else "mock",
                details="Connected to Jira Cloud" if j_ok else "Jira Cloud credentials invalid or unreachable"
            )
        except Exception:
            jira_status = DependencyStatus(available=False, mode="mock", details="Jira Cloud connection error")
    else:
        jira_status = DependencyStatus(available=False, mode="mock", details="Running in local sandbox mock mode")

    return DependencyHealthResponse(
        qdrant=qdrant_status,
        ollama=ollama_status,
        jira=jira_status
    )
