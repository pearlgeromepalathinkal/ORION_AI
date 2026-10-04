'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHITLStore } from '@/store/hitl-store'
import { useHITLWorkflow } from '@/hooks/useHITLWorkflow'
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  Send,
  Edit3,
  XCircle,
  Clock,
  Layers,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  UserCheck,
} from 'lucide-react'
import { EvidenceConfidence } from '@/components/common/EvidenceConfidence'
import { DecisionReason } from '@/components/common/DecisionReason'
import { VerificationGate } from '@/components/common/VerificationGate'
import { useAnalyticsStore } from '@/store/analytics-store'
import type { HITLDecision } from '@/types/hitl'

export const HITLReviewPanel: React.FC = () => {
  const {
    activeHITL,
    isPanelOpen,
    activeEvidence,
    verificationResult,
    isLoadingEvidence,
    isSubmittingDecision,
    setPanelOpen,
  } = useHITLStore()

  const { submitDecision } = useHITLWorkflow(activeHITL?.ticketId)

  const [selectedDecision, setSelectedDecision] = useState<HITLDecision>('APPROVE')
  const [modifiedAction, setModifiedAction] = useState('')
  const [comment, setComment] = useState('')
  const [showEvents, setShowEvents] = useState(false)
  const wsEvents = useHITLStore((s) => s.wsEvents)

  if (!isPanelOpen || !activeHITL) return null

  const {
    ticketId,
    status,
    reviewType,
    proposedAction,
    riskScore,
    riskLevel,
    decision,
    lastError,
  } = activeHITL

  const isEditable = status === 'REQUIRED' || status === 'REVIEWING'

  const handleSubmit = async () => {
    useAnalyticsStore.getState().recordHITLDecision(selectedDecision)
    await submitDecision(
      selectedDecision,
      selectedDecision === 'MODIFY' ? modifiedAction : undefined,
      comment || undefined
    )
  }

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-[rgba(180,95,99,0.15)] text-[#B45F63] border-[rgba(180,95,99,0.4)]'
      case 'HIGH':
        return 'bg-[rgba(180,95,99,0.12)] text-[#B45F63] border-[rgba(180,95,99,0.35)]'
      case 'MEDIUM':
        return 'bg-[rgba(177,132,53,0.15)] text-[#B18435] border-[rgba(177,132,53,0.4)]'
      case 'LOW':
        return 'bg-[rgba(102,134,95,0.15)] text-[#66865F] border-[rgba(102,134,95,0.4)]'
      default:
        return 'bg-[rgba(122,116,112,0.12)] text-[#7A7470] border-[rgba(122,116,112,0.3)]'
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setPanelOpen(false)}
          className="fixed inset-0 bg-[rgba(38,50,56,0.50)] backdrop-blur-xs transition-opacity"
        />

        {/* Sliding Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          style={{
            background: 'var(--bg-elevated)',
            borderLeft: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
          className="relative w-full max-w-xl shadow-2xl flex flex-col h-full z-50 overflow-hidden"
        >
          {/* Top Header */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              borderBottom: '1px solid var(--border-default)',
            }}
            className="flex items-center justify-between px-6 py-4"
          >
            <div className="flex items-center gap-3">
              <div
                style={{
                  background: 'var(--color-human-bg)',
                  borderColor: 'var(--color-human-border)',
                  color: 'var(--color-human)',
                }}
                className="w-9 h-9 rounded border flex items-center justify-center"
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 style={{ color: 'var(--text-primary)' }} className="text-base font-semibold tracking-tight">
                    Human-in-the-Loop Review
                  </h2>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-mono rounded border uppercase font-medium ${getRiskBadgeColor(
                      riskLevel
                    )}`}
                  >
                    {riskLevel} RISK
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)' }} className="flex items-center gap-2 text-xs font-mono mt-0.5">
                  <span style={{ color: 'var(--text-secondary)' }}>Ticket: {ticketId}</span>
                  <span>•</span>
                  <span>Authority: Elena Rodriguez (HITL)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              style={{ color: 'var(--text-muted)' }}
              className="p-1.5 rounded hover:text-[var(--text-primary)] hover:bg-[var(--bg-warm)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
            {/* Error Notification Banner if any */}
            {lastError && (
              <div
                style={{
                  background: 'var(--color-unknown-bg)',
                  borderColor: 'var(--color-unknown-border)',
                  color: 'var(--color-unknown)',
                }}
                className="p-3.5 rounded border flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="text-xs leading-relaxed">
                  <div className="font-semibold">Review Error</div>
                  <div>{lastError}</div>
                </div>
              </div>
            )}

            {/* Workflow / Review Context Card */}
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
              }}
              className="p-4 rounded-xl space-y-3"
            >
              <div
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                className="flex items-center justify-between text-xs font-mono pb-2"
              >
                <span style={{ color: 'var(--text-muted)' }}>STAGE: ROUTING & RISK GATE</span>
                <span style={{ color: 'var(--color-human)' }}>STATUS: {status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  className="p-2.5 rounded"
                >
                  <span style={{ color: 'var(--text-muted)' }} className="block text-[11px]">REVIEW TYPE</span>
                  <span style={{ color: 'var(--text-primary)' }} className="font-semibold font-mono">{reviewType}</span>
                </div>
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  className="p-2.5 rounded"
                >
                  <span style={{ color: 'var(--text-muted)' }} className="block text-[11px]">CALCULATED RISK</span>
                  <span style={{ color: 'var(--color-unknown)' }} className="font-semibold font-mono">
                    {riskScore != null ? `${(riskScore * 100).toFixed(0)}%` : '85%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Proposed Remediation Action */}
            <div className="space-y-2">
              <div style={{ color: 'var(--text-secondary)' }} className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  ORION-AI Proposed Action
                </span>
                <span style={{ color: 'var(--color-processing)', fontFamily: 'var(--font-mono)' }} className="text-[11px] flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> LangGraph Decision Node
                </span>
              </div>
              <div
                style={{
                  background: 'var(--color-processing-bg)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                className="p-4 rounded font-mono text-xs leading-relaxed"
              >
                {proposedAction ||
                  'Remediate high-risk database privileges and restore audit logging constraints.'}
              </div>
            </div>

            {/* Explicit Decision Reason: Why Human Review is Required */}
            <DecisionReason
              isHITL={true}
              riskScore={riskScore}
              riskLevel={riskLevel}
              title={proposedAction || 'Privileged database root access requested'}
              hitlDecision={decision}
            />

            {/* Federated Evidence Confidence Indicator */}
            <EvidenceConfidence
              evidence={activeEvidence.length > 0 ? activeEvidence : undefined}
              fallbackSimilarity={activeEvidence.length === 0 ? 0.0 : 0.85}
              variant="detailed"
            />

            {/* Human Decision Interface */}
            {isEditable ? (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                }}
                className="space-y-4 p-4 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-primary)' }} className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" style={{ color: '#7B3F45' }} />
                    Human Decision
                  </span>
                  <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono">
                    Authority: Elena Rodriguez
                  </span>
                </div>

                {/* Decision Radio / Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isSubmittingDecision}
                    onClick={() => setSelectedDecision('APPROVE')}
                    style={
                      selectedDecision === 'APPROVE'
                        ? {
                            background: '#66865F',
                            color: '#FFFFFF',
                            border: '1px solid #557250',
                          }
                        : {
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-secondary)',
                          }
                    }
                    className="py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingDecision}
                    onClick={() => {
                      setSelectedDecision('MODIFY')
                      if (!modifiedAction && proposedAction) {
                        setModifiedAction(proposedAction)
                      }
                    }}
                    style={
                      selectedDecision === 'MODIFY'
                        ? {
                            background: '#B18435',
                            color: '#FFFFFF',
                            border: '1px solid #99702B',
                          }
                        : {
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-secondary)',
                          }
                    }
                    className="py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Modify
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingDecision}
                    onClick={() => setSelectedDecision('REJECT')}
                    style={
                      selectedDecision === 'REJECT'
                        ? {
                            background: '#B45F63',
                            color: '#FFFFFF',
                            border: '1px solid #9E4D51',
                          }
                        : {
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-secondary)',
                          }
                    }
                    className="py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>

                {/* Conditional Fields */}
                {selectedDecision === 'MODIFY' && (
                  <div className="space-y-1.5">
                    <label style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono">
                      MODIFIED REMEDIATION ACTION
                    </label>
                    <textarea
                      value={modifiedAction}
                      disabled={isSubmittingDecision}
                      onChange={(e) => setModifiedAction(e.target.value)}
                      placeholder="Specify modified execution steps..."
                      rows={3}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      className="w-full px-3 py-2 rounded text-xs focus:outline-none focus:border-[var(--accent)] font-mono disabled:opacity-50"
                    />
                  </div>
                )}

                {/* Explicit Rejection Confirmation */}
                {selectedDecision === 'REJECT' && (
                  <div
                    style={{
                      background: 'var(--color-unknown-bg)',
                      borderColor: 'var(--color-unknown-border)',
                      color: 'var(--color-unknown)',
                    }}
                    className="p-3 rounded border space-y-2"
                  >
                    <div className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Human Authorization Rejection</div>
                        <div className="text-[11px] leading-relaxed opacity-90 mt-0.5">
                          Rejecting halts automated execution. The incident will be safely escalated to Senior Engineering with an audit log record.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono">
                    REVIEWER NOTES / AUDIT COMMENT
                  </label>
                  <input
                    type="text"
                    value={comment}
                    disabled={isSubmittingDecision}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="e.g. Authorized by Elena Rodriguez with supervisor oversight"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full px-3 py-2 rounded text-xs focus:outline-none focus:border-[var(--accent)] font-mono disabled:opacity-50"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSubmittingDecision}
                  onClick={handleSubmit}
                  style={{
                    background: selectedDecision === 'APPROVE' ? '#66865F' : selectedDecision === 'REJECT' ? '#B45F63' : '#B18435',
                    color: '#FFFFFF',
                  }}
                  className="w-full py-2.5 rounded font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer hover:opacity-90"
                >
                  {isSubmittingDecision ? (
                    <span>Submitting decision...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit {selectedDecision} Decision</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Already decided / read-only view */
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                }}
                className="p-4 rounded-xl space-y-2"
              >
                <div
                  style={{
                    color: decision === 'REJECT' ? 'var(--color-unknown)' : 'var(--color-known)',
                  }}
                  className="flex items-center gap-2 text-xs font-semibold"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>
                    Human Decision Recorded: {decision === 'REJECT' ? 'REJECTED (ESCALATED)' : (decision || 'PROCESSED')}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)' }} className="text-xs font-mono">
                  State: <span style={{ color: 'var(--text-primary)' }}>{status}</span>
                  {comment && <span className="block mt-1 text-[11px] text-[var(--text-secondary)]">Notes: {comment}</span>}
                </div>
              </div>
            )}

            {/* Verification Gate Indicator */}
            {(verificationResult || status === 'VERIFYING' || status === 'COMPLETED') && (
              <div>
                <VerificationGate
                  verificationResult={verificationResult}
                  status={status === 'VERIFYING' ? 'verifying' : verificationResult ? 'passed' : 'pending'}
                  mode="SIMULATED"
                />
              </div>
            )}

            {/* Live WebSocket Event Stream (Collapsible) */}
            <div
              style={{
                border: '1px solid var(--border-default)',
              }}
              className="rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setShowEvents(!showEvents)}
                style={{
                  background: 'var(--bg-warm)',
                  color: 'var(--text-secondary)',
                }}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono transition-colors cursor-pointer hover:text-[var(--text-primary)]"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  Live Workflow Events ({wsEvents.length})
                </span>
                {showEvents ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showEvents && (
                <div
                  style={{
                    background: 'var(--bg-surface)',
                  }}
                  className="p-3 space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]"
                >
                  {wsEvents.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }} className="text-center py-2">No events recorded</div>
                  ) : (
                    wsEvents.map((ev, i) => (
                      <div
                        key={i}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        className="flex items-start gap-2 py-1 last:border-0"
                      >
                        <Clock className="w-3 h-3 mt-0.5 text-[var(--text-muted)] shrink-0" />
                        <div>
                          <span style={{ color: 'var(--accent)' }} className="font-semibold uppercase mr-1">
                            [{ev.type}]
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>{ev.message}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
