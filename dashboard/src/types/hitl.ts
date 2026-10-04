/**
 * ORION-AI — HITL Frontend Types
 * Typed models for the Human-in-the-Loop review lifecycle.
 * Maps directly to backend ReviewStatusResponse, EvidenceResponse, VerificationResponse schemas.
 */

export type HITLStatus =
  | 'NONE'               // No HITL active
  | 'REQUIRED'           // Backend: workflow_paused / human_review_created
  | 'REVIEWING'          // Panel open, human reading evidence
  | 'SUBMITTING'         // Decision being sent to backend
  | 'DECISION_RECORDED'  // Backend confirmed decision received
  | 'RESUMING'           // Backend: workflow_resumed
  | 'VERIFYING'          // Backend: verification_started
  | 'COMPLETED'          // Backend: workflow_completed
  | 'FAILED'             // Backend: workflow_failed or API error

export type HITLRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type HITLDecision = 'APPROVE' | 'MODIFY' | 'REJECT'

/**
 * Derives a human-readable risk level from the backend 0.0–1.0 risk_score.
 */
export function riskLevelFromScore(score: number | undefined | null): HITLRiskLevel {
  if (score == null) return 'MEDIUM'
  if (score >= 0.85) return 'CRITICAL'
  if (score >= 0.65) return 'HIGH'
  if (score >= 0.40) return 'MEDIUM'
  return 'LOW'
}

/**
 * Full HITL review state — populated from GET /api/workflows/{id}/review
 */
export interface HITLReviewState {
  ticketId: string
  status: HITLStatus
  reviewType: string             // "APPROVAL" | "CLARIFICATION"
  reviewStatus: string           // "PENDING" | "APPROVED" | "REJECTED" | "MODIFIED"
  proposedAction?: string        // ORION-AI's proposed remediation
  riskScore?: number             // 0.0–1.0
  riskLevel: HITLRiskLevel
  evidenceCount: number
  decision?: HITLDecision        // Set after human submits
  reviewer?: string              // Reviewer ID from JWT
  modifiedAction?: string        // Set when decision = MODIFY
  comment?: string
  createdAt?: string
  lastError?: string
}

/**
 * WebSocket event from ws://localhost:8000/ws/workflows/{ticket_id}
 * Reflects the actual payload shape emitted by workflow.py.
 */
export interface HITLWorkflowEvent {
  event?: string                 // node_started | node_completed | human_review_created | workflow_paused | etc.
  type?: string
  ticket_id?: string
  ticketId?: string
  node?: string                  // Current LangGraph node name
  stage?: string
  message: string
  status?: string                // awaiting_approval | in_progress | completed | failed
  timestamp?: string
  data?: Record<string, unknown>
}

/**
 * Evidence document from GET /api/workflows/{id}/evidence
 */
export interface HITLEvidenceDocument {
  source: string                 // "confluence" | "sharepoint" | "github"
  title: string
  content?: string
  similarity?: number            // 0.0–1.0
  composite_score?: number       // weighted score
}

/**
 * Verification result from GET /api/workflows/{id}/verification
 */
export interface HITLVerificationResult {
  ticket_id: string
  verification_status: string    // "NOT_RUN" | "SIMULATED" | "ACTUAL" | "PASSED"
  verification_result: string    // Human-readable summary
  checks: Array<{
    name: string
    type?: string                // "SIMULATED" | "ACTUAL" | "NOT_RUN"
    status: string               // "PASSED" | "FAILED" | "PASS" | "FAIL" | "NOT_RUN"
    details?: string
  }>
}
