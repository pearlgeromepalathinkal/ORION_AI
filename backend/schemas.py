"""
Pydantic API Request and Response Schemas for ORION-AI.
Defines clean data validation models for authentication, health, tickets, and workflows.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# 1. ERROR SCHEMAS
# ============================================================================

class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    details: Optional[Any] = Field(None, description="Optional diagnostic details")


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ============================================================================
# 2. HEALTH SCHEMAS
# ============================================================================

class HealthResponse(BaseModel):
    status: str = Field("ok", example="ok")
    service: str = Field("orion-ai", example="orion-ai")
    version: str = Field("1.0.0", example="1.0.0")


class DependencyStatus(BaseModel):
    available: bool = Field(..., description="Whether the dependency is online and responsive")
    mode: Optional[str] = Field(None, description="Operating mode, e.g., 'cloud', 'local', 'mock'")
    details: Optional[str] = Field(None, description="Sanitized status message")


class DependencyHealthResponse(BaseModel):
    qdrant: DependencyStatus
    ollama: DependencyStatus
    jira: DependencyStatus


# ============================================================================
# 3. AUTHENTICATION SCHEMAS
# ============================================================================

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, description="Username or employee handle")
    password: str = Field(..., min_length=1, description="User password")


class UserProfile(BaseModel):
    employee_id: str
    username: str
    name: str
    department: str
    email: str
    region: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


# ============================================================================
# 4. TICKET SCHEMAS
# ============================================================================

class TicketCreateRequest(BaseModel):
    issue: str = Field(..., min_length=3, max_length=2000, description="Description of the IT issue")
    title: Optional[str] = Field(None, max_length=200, description="Optional brief title")
    user_id: Optional[str] = Field(None, description="Submitting employee ID")
    department: Optional[str] = Field(None, description="Employee department")
    region: Optional[str] = Field(None, description="Employee region")


class TicketCreateResponse(BaseModel):
    ticket_id: str
    status: str = "processing"
    message: str = "Ticket accepted"
    jira_url: Optional[str] = None


# ============================================================================
# 5. WORKFLOW SCHEMAS
# ============================================================================

class WorkflowRunRequest(BaseModel):
    ticket_id: Optional[str] = Field(None, description="Optional specific ticket identifier")
    issue: str = Field(..., min_length=3, max_length=2000, description="Issue description")
    title: Optional[str] = Field(None, max_length=200, description="Optional ticket title")
    user_id: Optional[str] = Field(None, description="Submitting employee ID")
    department: Optional[str] = Field(None, description="Department")
    region: Optional[str] = Field(None, description="Region")


class ClassificationSchema(BaseModel):
    intent: str
    category: str
    scope: str
    scope_valid: bool


class RiskSchema(BaseModel):
    score: float
    level: str


class KnowledgeDocument(BaseModel):
    source: str
    title: str
    content: Optional[str] = None
    similarity: Optional[float] = None
    composite_score: Optional[float] = None


class KnowledgeSchema(BaseModel):
    selected_sources: List[str] = Field(default_factory=list)
    evidence_confidence: float = 0.0
    documents: List[KnowledgeDocument] = Field(default_factory=list)


class DecisionSchema(BaseModel):
    decision: str
    reason: str
    confidence: Optional[float] = None
    knowledge_route: Optional[str] = None
    top_similarity: Optional[float] = None



class CitationItem(BaseModel):
    source: str
    title: str
    similarity: Optional[float] = None
    composite_score: Optional[float] = None


class ProvenanceSchema(BaseModel):
    citations: List[CitationItem] = Field(default_factory=list)
    timestamp: Optional[str] = None
    policies_applied: List[str] = Field(default_factory=list)


class JiraSchema(BaseModel):
    issue_key: str
    status: str
    jira_url: Optional[str] = None


class WorkflowStatusResponse(BaseModel):
    ticket_id: str
    workflow_status: str
    current_node: Optional[str] = None
    classification: Optional[ClassificationSchema] = None
    risk: Optional[RiskSchema] = None
    knowledge: Optional[KnowledgeSchema] = None
    decision: Optional[DecisionSchema] = None
    response: Optional[str] = None
    provenance: Optional[ProvenanceSchema] = None
    jira: Optional[JiraSchema] = None
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    execution_trace: List[Dict[str, Any]] = Field(default_factory=list)
