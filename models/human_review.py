"""
Human-in-the-Loop Review Models and Status Enums.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class HumanReviewType(str, Enum):
    APPROVAL = "APPROVAL"
    CLARIFICATION = "CLARIFICATION"
    EVIDENCE_REVIEW = "EVIDENCE_REVIEW"
    ESCALATION = "ESCALATION"


class HumanReviewStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    MODIFIED = "MODIFIED"
    ANSWERED = "ANSWERED"
    EXPIRED = "EXPIRED"


class VerificationStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"
    NOT_RUN = "NOT_RUN"
    SIMULATED = "SIMULATED"


class HumanReview(BaseModel):
    id: str = Field(..., description="Unique human review tracking ID")
    ticket_id: str = Field(..., description="Associated Jira or incident ticket ID")
    review_type: HumanReviewType = Field(..., description="Type of human intervention required")
    status: HumanReviewStatus = Field(default=HumanReviewStatus.PENDING, description="Current review status")
    reason: str = Field(..., description="Explanation of why human review is required")
    risk_score: float = Field(default=0.0, description="Evaluated risk score (0.0 - 1.0)")
    evidence_confidence: float = Field(default=0.0, description="Retrieved evidence confidence score")
    proposed_action: Optional[str] = Field(None, description="Proposed automated resolution or intervention")
    evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Relevant evidence documents")
    questions: List[str] = Field(default_factory=list, description="Clarification questions for the user")
    options: List[str] = Field(default_factory=list, description="Available review decisions (e.g. APPROVE, MODIFY, REJECT)")
    created_at: str = Field(..., description="ISO UTC timestamp of review creation")
    resolved_at: Optional[str] = Field(None, description="ISO UTC timestamp of human decision")
    reviewer: Optional[str] = Field(None, description="Identifier of the human reviewer")
    decision: Optional[str] = Field(None, description="Recorded decision (APPROVE, MODIFY, REJECT, ANSWERED)")
    reviewer_comment: Optional[str] = Field(None, description="Optional reviewer notes or modified instructions")
