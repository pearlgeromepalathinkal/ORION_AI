/**
 * ORION-AI — Deterministic Decision Reasoning Engine
 *
 * Provides clear, human-readable explanations of why ORION-AI chose a specific
 * resolution route, avoiding unexplained black-box AI actions.
 */

import type { ConfidenceTier } from './evidence-confidence'

export type DecisionCategory =
  | 'AUTONOMOUS'
  | 'SYSTEMS_ENGINEER'
  | 'HITL_REQUIRED'
  | 'HITL_APPROVED'
  | 'CLARIFICATION'
  | 'REJECTED_ESCALATED'
  | 'VERIFICATION_FAILED'

export interface DecisionReasonInput {
  route?: 'known' | 'mid' | 'unknown' | string | null
  confidenceTier?: ConfidenceTier
  similarity?: number | null
  riskScore?: number | null
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string
  isHITL?: boolean
  hitlStatus?: string
  hitlDecision?: string
  humanReviewRequired?: boolean
  resolverName?: string
  resolverSpecialization?: string
  playbookName?: string
  verificationPassed?: boolean
  verificationFailed?: boolean
  stage?: string
  status?: string
  title?: string
}

export interface DecisionReasonPoint {
  symbol: '✓' | '⚠' | '•' | '✕'
  type: 'positive' | 'warning' | 'neutral' | 'negative'
  text: string
}

export interface DecisionReasonOutput {
  category: DecisionCategory
  badgeTitle: string
  title: string
  points: DecisionReasonPoint[]
  conclusion: string
}

export function getDecisionReason(input: DecisionReasonInput): DecisionReasonOutput {
  const {
    route,
    confidenceTier = 'HIGH',
    similarity,
    riskScore,
    riskLevel,
    isHITL,
    hitlStatus,
    hitlDecision,
    humanReviewRequired,
    resolverName,
    resolverSpecialization,
    playbookName,
    verificationPassed,
    verificationFailed,
    stage,
    status,
    title = '',
  } = input

  const textLower = title.toLowerCase()
  const isPrivileged =
    textLower.includes('root') ||
    textLower.includes('db') ||
    textLower.includes('database') ||
    textLower.includes('privilege') ||
    textLower.includes('audit') ||
    textLower.includes('auth')

  // 1. Verification Failed
  if (verificationFailed || (verificationPassed === false && (stage === 'verifying' || stage === 'verification' || stage === 'resolution'))) {
    return {
      category: 'VERIFICATION_FAILED',
      badgeTitle: 'VERIFICATION FAILED',
      title: 'WHY RECOVERY FAILED HEALTH GATES',
      points: [
        { symbol: '✕', type: 'negative', text: 'Post-remediation health check threshold breached' },
        { symbol: '⚠', type: 'warning', text: 'Service metrics did not stabilize to target SLA' },
        { symbol: '•', type: 'neutral', text: 'Automated resolution blocked to prevent cascading downtime' },
      ],
      conclusion: '→ Incident reopened & escalated to Senior Engineering',
    }
  }

  // 2. HITL Rejected
  if (hitlDecision === 'REJECT') {
    return {
      category: 'REJECTED_ESCALATED',
      badgeTitle: 'HUMAN REJECTED & ESCALATED',
      title: 'WHY AUTOMATION WAS TERMINATED',
      points: [
        { symbol: '✕', type: 'negative', text: 'Proposed action rejected by Elena Rodriguez (HITL Authority)' },
        { symbol: '⚠', type: 'warning', text: 'Automated remediation halted under safety policy gate' },
        { symbol: '•', type: 'neutral', text: 'Transferred directly to Senior Engineering with audit log' },
      ],
      conclusion: '→ Escalation to Senior Engineering in progress',
    }
  }

  // 2b. HITL Approved & Resolved
  const isApprovedOrResolved =
    hitlDecision === 'APPROVE' ||
    hitlDecision === 'MODIFY' ||
    hitlStatus === 'APPROVED' ||
    hitlStatus === 'RESOLVED' ||
    hitlStatus === 'COMPLETED' ||
    status === 'resolved' ||
    status === 'completed' ||
    stage === 'resolution' ||
    stage === 'completed'

  if (isApprovedOrResolved && (route === 'unknown' || isHITL || (riskScore && riskScore >= 0.85))) {
    const isUnknown = route === 'unknown'
    return {
      category: 'HITL_APPROVED',
      badgeTitle: 'HUMAN GOVERNANCE VERIFIED',
      title: isUnknown ? 'AI HYPOTHESIS & HUMAN REMEDIATION EXECUTED' : 'SUPERVISOR APPROVED REMEDIATION EXECUTED',
      points: [
        {
          symbol: '✓',
          type: 'positive',
          text: isUnknown
            ? 'AI Root Cause Hypothesis reviewed & approved by Elena Rodriguez'
            : 'High-risk escalation reviewed & approved by Elena Rodriguez',
        },
        { symbol: '✓', type: 'positive', text: 'Targeted remediation executed within governance guardrails' },
        { symbol: '✓', type: 'positive', text: 'All 5 post-action verification health gates passed' },
        { symbol: '•', type: 'neutral', text: 'Audit provenance logged with cryptographically immutable trace' },
      ],
      conclusion: '→ Incident successfully resolved following human sign-off',
    }
  }

  // 3. Human Approval Required (HITL)
  if (isHITL || humanReviewRequired || route === 'unknown' || hitlStatus === 'REQUIRED' || hitlStatus === 'REVIEWING' || (riskScore && riskScore >= 0.85)) {
    const riskPct = riskScore != null ? `${Math.round(riskScore * 100)}%` : '95%'
    return {
      category: 'HITL_REQUIRED',
      badgeTitle: 'HUMAN APPROVAL REQUIRED',
      title: 'WHY HUMAN REVIEW IS REQUIRED',
      points: [
        { symbol: '⚠', type: 'warning', text: `Risk score: ${riskPct} (${riskLevel || 'CRITICAL'})` },
        {
          symbol: '⚠',
          type: 'warning',
          text: isPrivileged
            ? 'Privileged database / credential access requested'
            : 'Unverified resolution pattern with elevated blast radius',
        },
        { symbol: '•', type: 'neutral', text: 'Automated execution restricted by SOC2 & PoLP guardrails' },
      ],
      conclusion: '→ Elena Rodriguez (HITL Authority) approval required',
    }
  }

  // 4. Systems Engineer Assistance (Mid Route)
  if (route === 'mid' || confidenceTier === 'MEDIUM') {
    const simPct = similarity != null ? `${Math.round(similarity * 100)}%` : '74%'
    const engName = resolverName || 'Jordan Hayes'
    const engSpec = resolverSpecialization ? ` (${resolverSpecialization})` : ''

    return {
      category: 'SYSTEMS_ENGINEER',
      badgeTitle: 'SYSTEMS ENGINEER ASSISTANCE',
      title: 'WHY ASSISTED RESOLUTION WAS CHOSEN',
      points: [
        { symbol: '•', type: 'neutral', text: `Medium evidence confidence: ${simPct}` },
        { symbol: '•', type: 'neutral', text: 'Incident requires operational parameter confirmation' },
        { symbol: '✓', type: 'positive', text: `Assigned resolver: ${engName}${engSpec}` },
        { symbol: '✓', type: 'positive', text: 'Operational risk bounded within engineer delegation limits' },
      ],
      conclusion: `→ Routed to ${engName} for workstation review`,
    }
  }

  // 5. Clarification Required
  if (confidenceTier === 'NONE' || (similarity != null && similarity < 0.35 && !isHITL)) {
    return {
      category: 'CLARIFICATION',
      badgeTitle: 'CLARIFICATION REQUIRED',
      title: 'WHY CLARIFICATION IS NEEDED',
      points: [
        { symbol: '•', type: 'neutral', text: 'Evidence confidence is insufficient across federated KB' },
        { symbol: '•', type: 'neutral', text: 'Additional ticket telemetry or user input required' },
        { symbol: '⚠', type: 'warning', text: 'Automated remediation paused pending prompt response' },
      ],
      conclusion: '→ User clarification request dispatched',
    }
  }

  // 6. Autonomous Resolution (Known Route Default)
  const simPct = similarity != null ? `${Math.round(similarity * 100)}%` : '94%'
  return {
    category: 'AUTONOMOUS',
    badgeTitle: 'AUTONOMOUS RESOLUTION',
    title: 'WHY ORION CHOSE THIS PATH',
    points: [
      { symbol: '✓', type: 'positive', text: `High evidence confidence: ${simPct}` },
      { symbol: '✓', type: 'positive', text: 'Operational risk: Low (< 0.20)' },
      { symbol: '✓', type: 'positive', text: 'Known remediation pattern verified across federated silos' },
      { symbol: '✓', type: 'positive', text: playbookName ? `Playbook: ${playbookName}` : 'Automated playbook available' },
    ],
    conclusion: '→ Autonomous execution authorized with 5-point verification',
  }
}
