"""
ORION-AI — FastAPI Backend API Layer.
Exposes autonomous multi-agent ticket resolution workflow to web clients.
"""

import time
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import Config
from backend.routes.health import router as health_router
from backend.routes.auth import router as auth_router
from backend.routes.tickets import router as tickets_router
from backend.routes.workflow import router as workflow_router
from backend.routes.review import router as review_router
from backend.routes.knowledge import router as knowledge_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [ORION-API] %(message)s"
)
logger = logging.getLogger("orion_api")

app = FastAPI(
    title="ORION-AI API",
    version="1.0.0",
    description=(
        "API Integration Layer for the Federated Multi-Agent IT Support Ticket Resolution Framework. "
        "Provides REST endpoints and WebSocket channels for autonomous ticket triaging, "
        "policy validation, knowledge retrieval (RAG), and step-by-step resolution generation."
    ),
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Logging Middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    method = request.method

    try:
        response = await call_next(request)
        duration = round((time.time() - start_time) * 1000, 2)
        logger.info(f"{method} {path} → {response.status_code} ({duration}ms)")
        return response
    except Exception as exc:
        duration = round((time.time() - start_time) * 1000, 2)
        logger.error(f"{method} {path} FAILED after {duration}ms: {exc}")
        raise exc


# Centralized Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Formats all standard HTTP exceptions consistently."""
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        error_payload = detail
    else:
        error_payload = {
            "code": f"HTTP_{exc.status_code}",
            "message": str(detail)
        }
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": error_payload}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats Pydantic request body and param validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request body or parameters failed validation.",
                "details": exc.errors()
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catches unhandled server errors without exposing stack traces."""
    logger.exception(f"Unhandled server error at {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please contact IT Helpdesk."
            }
        }
    )


# Register Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(tickets_router)
app.include_router(workflow_router)
app.include_router(review_router)
app.include_router(knowledge_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
