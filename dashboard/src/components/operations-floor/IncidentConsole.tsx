'use client'

import React, { useState } from 'react'
import { useIncidentSimulationEngine } from '@/store/incident-simulation-engine'
import { useHITLStore } from '@/store/hitl-store'
import { EvidenceConfidence } from '@/components/common/EvidenceConfidence'
import { VerificationGate } from '@/components/common/VerificationGate'
import { DetailedIncidentModal } from './DetailedIncidentModal'
import { CheckCircle2, ChevronUp, ChevronDown, GitCommit, Sparkles, UserCheck, ShieldAlert } from 'lucide-react'

const STAGE_KEYS = [
  'ingestion', 'similarity', 'hypothesis', 'playbook',
  'patch', 'qa', 'resolution', 'kb_writeback',
]

function mapToCanonicalStageIndex(currentStage: string, isResolved: boolean, hasKnowledge: boolean): number {
  if (hasKnowledge) return 7
  if (isResolved || currentStage === 'resolution') return 6
  if (currentStage === 'verification' || currentStage === 'verifying') return 5
  if (currentStage === 'remediation' || currentStage === 'investigating' || currentStage === 'awaiting_human') return 4
  if (currentStage === 'routing') return 3
  if (currentStage === 'knowledge_search') return 2
  if (currentStage === 'normalized' || currentStage === 'embedded') return 1
  if (currentStage === 'received') return 0
  return -1
}

export function IncidentConsole() {
  const sim = useIncidentSimulationEngine()
  const activeHITL = useHITLStore((s) => s.activeHITL)
  const activeEvidence = useHITLStore((s) => s.activeEvidence)
  const verificationResult = useHITLStore((s) => s.verificationResult)

  const [isExpanded, setIsExpanded] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const hasActiveIncident = Boolean(sim.incidentId)
  const isResolved = sim.status === 'resolved' || sim.currentStage === 'resolution'
  const hasKnowledge = Boolean(sim.knowledgeCandidate)

  const currentStageIndex = mapToCanonicalStageIndex(sim.currentStage, isResolved, hasKnowledge)
  const stages = [
    { key: 'ingestion', name: 'INGESTION' },
    { key: 'similarity', name: 'SIMILARITY' },
    { key: 'hypothesis', name: 'HYPOTHESIS' },
    { key: 'playbook', name: 'PLAYBOOK' },
    { key: 'patch', name: 'PATCH' },
    { key: 'qa', name: 'QA' },
    { key: 'resolution', name: 'RESOLUTION' },
    { key: 'kb_writeback', name: 'KB WRITEBACK' },
  ].map((s, idx) => ({
    ...s,
    done: hasActiveIncident && (idx < currentStageIndex || (isResolved && idx <= 6) || (hasKnowledge && idx === 7)),
    active: hasActiveIncident && idx === currentStageIndex && !(isResolved && idx < 6),
  }))

  const routeColor =
    sim.route === 'known'   ? '#66865F'  :
    sim.route === 'mid'     ? '#B18435'  :
    sim.route === 'unknown' ? '#B45F63'  : '#7A7470'

  return (
    <div
      className="text-xs select-none flex-shrink-0 transition-all"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-default)' }}
      role="region"
      aria-label="Incident Console"
    >
      {/* ── Compact Status Bar ── */}
      <div
        className="flex items-center justify-between px-3 py-1.5 gap-3"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        {/* Incident ID & Title (Click to open detailed modal) */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 min-w-0 flex-shrink-0 cursor-pointer group"
          title="Click to inspect detailed Evidence, Decision Logic & Verification Gate"
        >
          <span
            className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors group-hover:border-[var(--accent)]"
            style={
              hasActiveIncident
                ? { background: 'var(--color-human-bg)', color: 'var(--accent)', borderColor: 'var(--color-human-border)' }
                : { background: 'var(--bg-warm)', color: 'var(--text-muted)', borderColor: 'var(--border-default)' }
            }
          >
            {sim.incidentId || 'STANDBY'}
          </span>

          {hasActiveIncident && (
            <span
              className="font-semibold text-xs truncate max-w-[170px] hidden sm:block group-hover:text-[var(--accent)]"
              style={{ color: 'var(--text-primary)' }}
            >
              {sim.title}
            </span>
          )}

          {isResolved && (
            <span
              className="font-mono text-[9px] px-2 py-0.5 flex items-center gap-1 border"
              style={{ background: 'var(--color-known-bg)', color: 'var(--color-known)', borderColor: 'var(--color-known-border)', borderRadius: 4 }}
            >
              <CheckCircle2 size={10} />
              <span>Resolved</span>
            </span>
          )}

          {hasActiveIncident && !isResolved && (
            sim.status === 'awaiting_human' ? (
              <button
                onClick={() => {
                  if (sim.route === 'mid') {
                    sim.approveHumanFix()
                  } else {
                    useHITLStore.getState().setPanelOpen(true)
                  }
                }}
                className="font-mono text-[9px] font-bold px-2.5 py-0.5 uppercase flex items-center gap-1 cursor-pointer transition-all hover:opacity-90 border shadow-sm"
                style={{
                  background: 'rgba(177,132,53,0.18)',
                  color: '#B18435',
                  borderColor: '#B18435',
                  borderRadius: 4,
                }}
                title="Click to authorize human remediation"
              >
                <CheckCircle2 size={10} />
                <span>Authorize Fix ({sim.route === 'mid' ? 'Jordan' : 'Elena'}) →</span>
              </button>
            ) : (
              <span
                className="font-mono text-[9px] px-2 py-0.5 uppercase border"
                style={{ background: 'var(--color-processing-bg)', color: 'var(--color-processing)', borderColor: 'var(--color-processing-border)', borderRadius: 4 }}
              >
                {sim.status.replace(/_/g, ' ')}
              </span>
            )
          )}
        </div>

        {/* Compact Presentation Indicators (Feature 1, Feature 2, Feature 3) */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* 1. Evidence Confidence Indicator */}
          <div className="flex items-center gap-1">
            <span
            style={{ color: '#7A7470', fontFamily: 'var(--font-mono)' }}
            className="text-[9px]"
          >
            Evidence:
          </span>
            <EvidenceConfidence
              evidence={activeEvidence.length > 0 ? activeEvidence : undefined}
              fallbackSimilarity={sim.similarity}
              variant="compact"
              onOpenDetails={() => setIsModalOpen(true)}
            />
          </div>

          {/* 2. Decision Badge */}
          <div className="flex items-center gap-1">
            <span
              style={{ color: '#7A7470', fontFamily: 'var(--font-mono)' }}
              className="text-[9px]"
            >
              Decision:
            </span>
            <span
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 border text-[10px] font-mono font-bold cursor-pointer transition-opacity hover:opacity-85"
              style={{
                borderRadius: 4,
                padding: '1px 7px',
                ...(sim.route === 'known'
                  ? { background: 'rgba(102,134,95,0.12)', borderColor: 'rgba(102,134,95,0.38)', color: '#66865F' }
                  : sim.route === 'mid'
                  ? { background: 'rgba(177,132,53,0.12)', borderColor: 'rgba(177,132,53,0.38)', color: '#B18435' }
                  : { background: 'rgba(123,63,69,0.10)', borderColor: 'rgba(123,63,69,0.30)', color: '#7B3F45' }),
              }}
            >
              {sim.route === 'known' ? (
                <><CheckCircle2 size={10} /><span>AUTONOMOUS</span></>
              ) : sim.route === 'mid' ? (
                <><UserCheck size={10} /><span>SYSTEMS ENGR</span></>
              ) : (
                <><ShieldAlert size={10} /><span>HITL REQ</span></>
              )}
            </span>
          </div>

          {/* 3. Verification Gate Indicator */}
          <div className="flex items-center gap-1">
            <span
              style={{ color: '#7A7470', fontFamily: 'var(--font-mono)' }}
              className="text-[9px]"
            >
              Verification:
            </span>
            <VerificationGate
              verificationResult={verificationResult}
              status={sim.verificationStatus === 'passed' ? 'passed' : sim.verificationStatus === 'verifying' ? 'verifying' : sim.verificationStatus === 'failed' ? 'failed' : 'pending'}
              mode={sim.mode === 'SIMULATION' ? 'SIMULATED' : 'ACTUAL'}
              compact
            />
          </div>
        </div>

        {/* Right actions: Inspect Details modal + stepper toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {sim.status === 'awaiting_human' && (
            <button
              onClick={() => {
                if (sim.route === 'mid') {
                  sim.approveHumanFix()
                } else {
                  useHITLStore.getState().setPanelOpen(true)
                }
              }}
              className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 transition-all cursor-pointer border shadow-sm"
              style={{
                background: '#66865F',
                color: '#FFFDF8',
                border: '1px solid #4F6D49',
                borderRadius: 4,
              }}
            >
              <CheckCircle2 size={10} />
              <span>{sim.route === 'mid' ? 'Approve Fix (Jordan)' : 'Review HITL'}</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 transition-all cursor-pointer border"
            style={{
              background: 'var(--accent)',
              color: '#FFFDF8',
              border: '1px solid #6A343A',
              borderRadius: 4,
            }}
          >
            <Sparkles size={10} />
            <span>Inspect Logic</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[9px] px-2 py-1 transition-all cursor-pointer border"
            style={{
              background: 'var(--bg-warm)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 4,
            }}
          >
            <span>{isExpanded ? 'Less' : 'Stepper'}</span>
            {isExpanded ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
          </button>
        </div>
      </div>

      {/* ── Detailed Incident Modal Sheet ── */}
      <DetailedIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* ── Expandable Evidence Panel ── */}
      {isExpanded && (
        <div
          className="px-3 py-2 text-[10px] font-mono border-b"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="uppercase text-[8px] tracking-wider mb-0.5" style={{ color: '#7A7470' }}>Route</div>
              <div
                className="font-bold uppercase"
                style={{ color: sim.route === 'known' ? '#66865F' : sim.route === 'mid' ? '#B18435' : '#B45F63' }}
              >
                {sim.route || 'IDLE'}
              </div>
            </div>
            <div>
              <div className="uppercase text-[8px] tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Stage</div>
              <div className="font-bold uppercase" style={{ color: 'var(--text-primary)' }}>{sim.currentStage}</div>
            </div>
            <div>
              <div className="uppercase text-[8px] tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Confidence</div>
              <div className={`font-bold ${routeColor}`}>
                {sim.similarity !== null ? sim.similarity.toFixed(2) : '--'}
              </div>
            </div>
            <div>
              <div className="uppercase text-[8px] tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Status</div>
              <div className="font-bold uppercase" style={{ color: 'var(--color-known)' }}>{sim.status}</div>
            </div>
            {sim.assignedHuman && (
              <div className="col-span-2">
                <div className="uppercase text-[8px] tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Assigned</div>
                <div className="capitalize" style={{ color: 'var(--text-primary)' }}>{sim.assignedHuman}</div>
              </div>
            )}
            {sim.playbookId && (
              <div className="col-span-2">
                <div className="uppercase text-[8px] tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Playbook</div>
                <div style={{ color: 'var(--color-processing)' }}>{sim.playbookId}</div>
              </div>
            )}
          </div>
          {sim.timeline.length > 0 && (
            <div className="mt-2 pt-2 space-y-0.5 max-h-16 overflow-y-auto" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {sim.timeline.slice(-4).map(e => (
                <div key={e.id} className="flex items-center gap-2 text-[9px]">
                  <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{e.timestamp}</span>
                  <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
