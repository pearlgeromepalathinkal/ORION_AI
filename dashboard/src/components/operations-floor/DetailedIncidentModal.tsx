'use client'

import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EvidenceConfidence } from '@/components/common/EvidenceConfidence'
import { DecisionReason } from '@/components/common/DecisionReason'
import { VerificationGate } from '@/components/common/VerificationGate'
import { useIncidentSimulationEngine } from '@/store/incident-simulation-engine'
import { useHITLStore } from '@/store/hitl-store'
import {
  FileText,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  Sparkles,
  ExternalLink,
  GitBranch,
} from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function DetailedIncidentModal({ isOpen, onClose }: Props) {
  const sim = useIncidentSimulationEngine()
  const activeHITL = useHITLStore((s) => s.activeHITL)
  const activeEvidence = useHITLStore((s) => s.activeEvidence)
  const verificationResult = useHITLStore((s) => s.verificationResult)

  const hasIncident = Boolean(sim.incidentId)
  const incidentId = sim.incidentId || 'INC-1042'
  const title = sim.title || 'VPN Authentication Gateway Timeout'
  const isResolved = sim.status === 'resolved' || sim.currentStage === 'resolution'
  const isFailed = sim.status === 'failed' || sim.verificationStatus === 'failed'

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="overflow-y-auto"
        style={{
          width: 520,
          background: 'var(--bg-surface)',
          border: 'none',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.8)',
        }}
        aria-label="Detailed Incident Reasoning Inspection"
      >
        <SheetHeader className="pb-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                style={{
                  background: 'rgba(255, 143, 171, 0.15)',
                  color: 'var(--color-processing)',
                  border: '1px solid var(--border-default)',
                }}
                className="p-1.5 rounded-lg"
              >
                <FileText size={15} />
              </span>
              <div>
                <span style={{ color: 'var(--color-unknown)' }} className="text-[9px] font-mono font-black uppercase tracking-wider">
                  INCIDENT REASONING &amp; VERIFICATION INSPECTION
                </span>
                <SheetTitle style={{ color: 'var(--text-primary)' }} className="text-sm font-bold truncate max-w-[340px]">
                  {incidentId} — {title}
                </SheetTitle>
              </div>
            </div>

            <span
              className="text-[9px] font-mono px-2 py-0.5 rounded font-bold border"
              style={{
                background: isResolved ? 'rgba(52, 211, 153, 0.15)' : 'var(--bg-base)',
                borderColor: isResolved ? 'rgba(52, 211, 153, 0.40)' : 'var(--border-subtle)',
                color: isResolved ? '#a7f3d0' : 'var(--text-muted)',
              }}
            >
              {sim.status.toUpperCase()}
            </span>
          </div>
        </SheetHeader>

        <div className="py-4 flex flex-col gap-4">
          {/* 1. Evidence Confidence Indicator */}
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              1. Retrieved Knowledge Trust
            </div>
            <EvidenceConfidence
              evidence={activeEvidence.length > 0 ? activeEvidence : undefined}
              fallbackSimilarity={sim.similarity}
              variant="detailed"
            />
          </div>

          {/* 2. Explicit Decision Reason */}
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              2. Decision Logic
            </div>
            <DecisionReason
              route={sim.route}
              similarity={sim.similarity}
              riskScore={activeHITL?.riskScore}
              riskLevel={activeHITL?.riskLevel}
              isHITL={Boolean(activeHITL && activeHITL.status !== 'NONE')}
              hitlStatus={activeHITL?.status}
              hitlDecision={activeHITL?.decision}
              playbookName={sim.playbookId ?? undefined}
              verificationPassed={sim.verificationStatus === 'passed'}
              verificationFailed={isFailed}
              stage={sim.currentStage}
              title={title}
            />
          </div>

          {/* 3. Verification Gate Indicator */}
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              3. Post-Remediation Verification Gate
            </div>
            <VerificationGate
              verificationResult={verificationResult}
              status={isFailed ? 'failed' : isResolved ? 'passed' : sim.verificationStatus === 'verifying' ? 'verifying' : 'pending'}
              mode={sim.mode === 'SIMULATION' ? 'SIMULATED' : 'ACTUAL'}
            />
          </div>

          {/* 4. Provenance & Audit Summary */}
          <div
            className="rounded-xl border p-3 flex flex-col gap-2 font-mono text-[10px]"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-default)',
            }}
          >
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <span>4. Provenance &amp; Jira Traceability</span>
              <span className="text-[#34d399]">Audit Verified</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Jira Key:</span>{' '}
                <strong style={{ color: 'var(--color-processing)' }}>{incidentId}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
                <strong style={{ color: isResolved ? '#34d399' : 'var(--color-unknown)' }}>
                  {isResolved ? 'DONE' : 'IN_PROGRESS'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Resolver:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{sim.assignedHuman || 'Autonomous Playbook'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Telemetry:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>Prometheus + Qdrant</strong>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
