'use client'
import { AppShell } from '@/components/layout/AppShell'
import { useQuery } from '@tanstack/react-query'
import { fetchIncidentById, fetchWorkflowEvents } from '@/lib/api'
import { getOrionWorkflow, getOrionReviewStatus } from '@/lib/orion-api'
import { useHITLStore } from '@/store/hitl-store'
import { useHITLWorkflow } from '@/hooks/useHITLWorkflow'
import { HITLReviewPanel } from '@/components/operations-floor/HITLReviewPanel'
import { IncidentReasoningTimeline } from '@/components/common/IncidentReasoningTimeline'
import { riskLevelFromScore } from '@/types/hitl'
import { use, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: incident, isLoading } = useQuery({ queryKey: ['incident', id], queryFn: () => fetchIncidentById(id) })
  const { data: events = [] } = useQuery({ queryKey: ['workflow-events', id], queryFn: () => fetchWorkflowEvents(id) })
  const { data: workflow } = useQuery({ queryKey: ['orion-workflow', id], queryFn: () => getOrionWorkflow(id) })
  const { data: review } = useQuery({ queryKey: ['orion-review', id], queryFn: () => getOrionReviewStatus(id) })

  const setHITL = useHITLStore((s) => s.setHITL)
  const setPanelOpen = useHITLStore((s) => s.setPanelOpen)
  const activeHITL = useHITLStore((s) => s.activeHITL)
  const activeEvidence = useHITLStore((s) => s.activeEvidence)
  const verificationResult = useHITLStore((s) => s.verificationResult)

  useHITLWorkflow(id)

  const isAwaitingApproval =
    workflow?.status === 'awaiting_approval' ||
    workflow?.human_review_required === true ||
    review?.review_status === 'PENDING'

  const handleOpenReview = () => {
    setHITL({
      ticketId: id,
      status: 'REQUIRED',
      reviewType: review?.review_type || workflow?.human_review_type || 'APPROVAL',
      reviewStatus: review?.review_status || 'PENDING',
      proposedAction: review?.proposed_action || workflow?.resolution,
      riskScore: review?.risk_score ?? workflow?.risk_score,
      riskLevel: riskLevelFromScore(review?.risk_score ?? workflow?.risk_score),
      evidenceCount: review?.evidence_count || 0,
      createdAt: review?.created_at,
    })
    setPanelOpen(true)
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-3 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <Link href="/incidents" className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={12} /> Incidents
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-processing)' }}>{id}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>Loading incident telemetry...</div>
          ) : !incident ? (
            <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>Incident not found.</div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Top Quick Actions & HITL Banner if review active */}
              {(isAwaitingApproval || activeHITL?.status === 'REQUIRED' || activeHITL?.status === 'REVIEWING') && (
                <div
                  className="p-3.5 rounded-xl border flex items-center justify-between shadow-lg"
                  style={{
                    background: 'rgba(251, 111, 146, 0.12)',
                    borderColor: 'var(--color-unknown)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 animate-pulse" style={{ color: 'var(--color-unknown)' }} />
                    <div>
                      <div className="text-xs font-bold font-mono" style={{ color: 'var(--color-unknown)' }}>
                        HUMAN-IN-THE-LOOP AUTHORIZATION REQUIRED
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        Workflow is paused pending decision from Elena Rodriguez (HITL Authority).
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenReview}
                    className="py-1.5 px-3 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-md transition-all"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-unknown), var(--color-processing))',
                      color: '#140c11',
                    }}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Open Human Review</span>
                  </button>
                </div>
              )}

              {/* 7-Stage Reasoning Sequence: TICKET → EVIDENCE → DECISION → REMEDIATION → VERIFICATION → PROVENANCE → JIRA */}
              <IncidentReasoningTimeline
                incident={incident}
                evidence={activeEvidence.length > 0 ? activeEvidence : undefined}
                verification={verificationResult}
                riskScore={activeHITL?.riskScore ?? review?.risk_score ?? workflow?.risk_score ?? 0.85}
                riskLevel={activeHITL?.riskLevel || riskLevelFromScore(review?.risk_score ?? workflow?.risk_score ?? 0.85)}
                isHITL={isAwaitingApproval || Boolean(activeHITL && activeHITL.status !== 'NONE')}
                hitlStatus={activeHITL?.status || (isAwaitingApproval ? 'REQUIRED' : 'NONE')}
                hitlDecision={activeHITL?.decision || review?.decision}
                reviewer={review?.reviewer || 'Elena Rodriguez (HITL Authority)'}
                remediationAction={review?.proposed_action || workflow?.resolution || incident.suggestedResolution}
                mode="SIMULATED"
              />
            </div>
          )}
        </div>
      </div>
      <HITLReviewPanel />
    </AppShell>
  )
}
