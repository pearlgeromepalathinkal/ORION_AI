'use client'
import React, { useState } from 'react'
import { X, CheckCircle, AlertTriangle, ArrowRight, Edit3, ThumbsDown, ShieldAlert, FileText } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useOperationsStore } from '@/store/operations-store'
import { useHITLStore } from '@/store/hitl-store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { HumanRole } from '@/types'
import { submitOrionReviewDecision } from '@/lib/orion-api'

// ── Systems Engineer Workspace ────────────────────────────────────────────────
function SystemsEngineerWorkspace() {
  const ops = useOperationsStore()
  const [notes, setNotes] = useState('')
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const historicalMatches = [
    { id: 'KB-089', title: 'DB connection pool exhaustion — restart pool manager', similarity: 0.79 },
    { id: 'KB-031', title: 'Connection timeout during high traffic', similarity: 0.74 },
    { id: 'KB-112', title: 'Slow query causing connection backlog', similarity: 0.69 },
  ]

  const handleResolve = async () => {
    if (!selectedResolution) return
    ops.setHumanState('developer', 'resolving', ops.activeIncidentId ?? undefined)
    ops.addManualActivity({
      stage: 'executing',
      eventType: 'DEVELOPER_RESOLVED',
      message: `Systems Engineer applied resolution: ${selectedResolution}`,
      incidentId: ops.activeIncidentId ?? '',
    })
    await new Promise(r => setTimeout(r, 800))
    ops.setStationState('verification', 'processing', ops.activeIncidentId ?? undefined)
    ops.addManualActivity({
      stage: 'verifying',
      eventType: 'VERIFICATION_STARTED',
      message: 'Running 5-point health check verification',
      incidentId: ops.activeIncidentId ?? '',
    })
    await new Promise(r => setTimeout(r, 600))
    ops.setStationState('verification', 'done', ops.activeIncidentId ?? undefined)
    ops.setStationState('resolution', 'done', ops.activeIncidentId ?? undefined)
    ops.setHumanState('developer', 'completed', ops.activeIncidentId ?? undefined)
    ops.addManualActivity({
      stage: 'verifying',
      eventType: 'VERIFICATION_PASSED',
      message: '5/5 checks passed — incident resolved with systems engineer assist',
      incidentId: ops.activeIncidentId ?? '',
    })
    // Trigger live ORION-AI review resolution if active incident
    if (ops.activeIncidentId) {
      submitOrionReviewDecision(
        ops.activeIncidentId,
        'APPROVE',
        selectedResolution || undefined,
        notes || 'Approved via Systems Engineer Workstation'
      ).catch(() => {})
    }

    // Trigger curator
    setTimeout(() => {
      ops.setHumanState('curator', 'action_required', ops.activeIncidentId ?? undefined)
      ops.addManualActivity({
        stage: 'knowledge_capture',
        eventType: 'KNOWLEDGE_REVIEW_REQUIRED',
        message: 'Resolution applied — Dr. Alisha Patel notified for knowledge curation',
        incidentId: ops.activeIncidentId ?? '',
      })
    }, 800)
    setSubmitted(true)
  }

  const handleEscalate = () => {
    if (ops.activeIncidentId) {
      submitOrionReviewDecision(
        ops.activeIncidentId,
        'MODIFY',
        'Escalated to Tier-3 SRE Marcus Lee for manual intervention',
        notes || 'Escalated by systems engineer'
      ).catch(() => {})
    }

    ops.setHumanState('developer', 'idle')
    ops.setHumanState('sre', 'alerted', ops.activeIncidentId ?? undefined)
    ops.addManualActivity({
      stage: 'human_review',
      eventType: 'ENGINEER_ACTIVATED',
      message: 'Systems Engineer escalated — Marcus Lee (DevOps / SRE) now investigating',
      incidentId: ops.activeIncidentId ?? '',
    })
    ops.setOpenHumanDrawer('sre')
  }

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div
        className="rounded-lg p-3"
        style={{ background: 'var(--color-mid-bg)', border: '1px solid var(--color-mid-border)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-mid)' }}>
          ACTIVE INCIDENT
        </div>
        <div className="font-mono text-sm font-bold mt-0.5" style={{ color: 'var(--color-mid)' }}>
          {ops.activeIncidentId || 'INC-1067'}
        </div>
        <div className="text-sm font-medium mt-0.5">Database Connection Pool Exhaustion</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Similarity:</span>
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-mid)' }}>0.72</span>
          <span className="route-badge mid">MID 0.55–0.84</span>
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
          HISTORICAL KNOWLEDGE MATCHES
        </div>
        {historicalMatches.map(match => (
          <button
            key={match.id}
            onClick={() => setSelectedResolution(match.title)}
            className="w-full text-left rounded-lg p-2.5 mb-1.5 transition-all duration-150"
            style={{
              background: selectedResolution === match.title ? 'var(--color-mid-bg)' : 'var(--bg-elevated)',
              border: `1px solid ${selectedResolution === match.title ? 'var(--color-mid-border)' : 'var(--border-default)'}`,
            }}
            aria-pressed={selectedResolution === match.title}
            aria-label={`Select resolution: ${match.title} — similarity ${match.similarity}`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--text-muted)' }}>{match.id}</span>
              <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-mid)' }}>{match.similarity}</span>
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-primary)' }}>{match.title}</div>
          </button>
        ))}
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
          INVESTIGATION NOTES
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add investigation notes, modifications, or observations..."
          className="w-full rounded-lg p-2.5 text-[11px] resize-none outline-none"
          rows={3}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
          aria-label="Investigation notes"
        />
      </div>

      {submitted ? (
        <div
          className="rounded-lg p-3 flex items-center gap-2"
          style={{ background: 'var(--color-known-bg)', border: '1px solid var(--color-known-border)' }}
          role="status"
        >
          <CheckCircle size={14} style={{ color: 'var(--color-known)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-known)' }}>
            Resolution applied — Verification passed. Knowledge curator notified.
          </span>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            onClick={handleResolve}
            disabled={!selectedResolution}
            className="flex-1 text-xs font-bold"
            style={{
              background: selectedResolution ? 'var(--color-known)' : 'var(--bg-elevated)',
              color: selectedResolution ? 'white' : 'var(--text-muted)',
              border: 'none',
            }}
            aria-label="Apply selected resolution"
          >
            <CheckCircle size={12} />
            Apply Resolution
          </Button>
          <Button
            onClick={handleEscalate}
            variant="outline"
            className="flex-1 text-xs font-bold"
            style={{ borderColor: 'var(--color-unknown-border)', color: 'var(--color-unknown)' }}
            aria-label="Escalate to Tier-3 SRE"
          >
            <ArrowRight size={12} />
            Escalate to SRE
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Tier-3 SRE Workspace ─────────────────────────────────────────────────────
function SREWorkspace() {
  const ops = useOperationsStore()
  const [decision, setDecision] = useState<'approve' | 'override' | null>(null)
  const [overrideText, setOverrideText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    ops.setHumanState('sre', 'resolving', ops.activeIncidentId ?? undefined)
    const action = decision === 'approve' ? 'Confirmed AI hypothesis' : `Overrode AI: ${overrideText}`
    ops.addManualActivity({
      stage: 'executing',
      eventType: 'SRE_RESOLVED',
      message: `Marcus Lee: ${action}`,
      incidentId: ops.activeIncidentId ?? '',
    })

    if (ops.activeIncidentId) {
      const orionDecision = decision === 'approve' ? 'APPROVE' : 'MODIFY'
      submitOrionReviewDecision(
        ops.activeIncidentId,
        orionDecision,
        decision === 'override' ? overrideText : undefined,
        'Decided via SRE Human Workstation'
      ).catch(() => {})
    }

    await new Promise(r => setTimeout(r, 800))
    ops.setStationState('verification', 'processing', ops.activeIncidentId ?? undefined)
    await new Promise(r => setTimeout(r, 600))
    ops.setStationState('verification', 'done')
    ops.setStationState('resolution', 'done')
    ops.setHumanState('sre', 'completed')
    ops.addManualActivity({
      stage: 'verifying',
      eventType: 'VERIFICATION_PASSED',
      message: '5/5 checks passed — Tier-3 resolution applied and verified',
      incidentId: ops.activeIncidentId ?? '',
    })
    setTimeout(() => {
      ops.setHumanState('curator', 'action_required', ops.activeIncidentId ?? undefined)
      ops.addManualActivity({
        stage: 'knowledge_capture',
        eventType: 'KNOWLEDGE_REVIEW_REQUIRED',
        message: 'Novel resolution captured — Dr. Alisha Patel notified for KB curation',
        incidentId: ops.activeIncidentId ?? '',
      })
    }, 800)
    setSubmitted(true)
  }

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div
        className="rounded-lg p-3"
        style={{ background: 'var(--color-unknown-bg)', border: '1px solid var(--color-unknown-border)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-unknown)' }}>
          UNKNOWN INCIDENT — URGENT
        </div>
        <div className="font-mono text-sm font-bold mt-0.5" style={{ color: 'var(--color-unknown)' }}>
          {ops.activeIncidentId || 'INC-1088'}
        </div>
        <div className="text-sm font-medium mt-0.5">Novel Database Deadlock Pattern</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="route-badge unknown">UNKNOWN &lt; 0.55</span>
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-unknown)' }}>0.41</span>
        </div>
      </div>

      <div
        className="rounded-lg p-3"
        style={{ background: 'var(--color-processing-bg)', border: '1px solid var(--color-processing-border)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-processing)' }}>
          AI ROOT CAUSE HYPOTHESIS
        </div>
        <div className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          Circular dependency between transaction locks on tables <code className="font-mono text-[10px]" style={{ color: 'var(--color-processing)' }}>orders</code> and{' '}
          <code className="font-mono text-[10px]" style={{ color: 'var(--color-processing)' }}>inventory</code> during concurrent checkout operations.
        </div>
        <div className="mt-2 text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
          EVIDENCE (14 patterns)
        </div>
        {[
          'pg_locks wait_event_type = Lock (14 occurrences)',
          'Deadlock detected in pg_stat_activity',
          'ERROR: deadlock detected in checkout_service.log',
        ].map((e, i) => (
          <div key={i} className="text-[10px] flex items-start gap-1 mb-0.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono">▸</span> {e}
          </div>
        ))}
        <div className="text-[9px] italic mt-1" style={{ color: 'var(--text-muted)' }}>
          This is a root cause hypothesis — not yet verified
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
          YOUR DECISION
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setDecision('approve')}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: decision === 'approve' ? 'var(--color-known-bg)' : 'var(--bg-elevated)',
              border: `1px solid ${decision === 'approve' ? 'var(--color-known-border)' : 'var(--border-default)'}`,
              color: decision === 'approve' ? 'var(--color-known)' : 'var(--text-secondary)',
            }}
            aria-pressed={decision === 'approve'}
          >
            ✓ Confirm AI Hypothesis
          </button>
          <button
            onClick={() => setDecision('override')}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: decision === 'override' ? 'var(--color-unknown-bg)' : 'var(--bg-elevated)',
              border: `1px solid ${decision === 'override' ? 'var(--color-unknown-border)' : 'var(--border-default)'}`,
              color: decision === 'override' ? 'var(--color-unknown)' : 'var(--text-secondary)',
            }}
            aria-pressed={decision === 'override'}
          >
            ✗ Override Diagnosis
          </button>
        </div>

        {decision === 'override' && (
          <textarea
            value={overrideText}
            onChange={e => setOverrideText(e.target.value)}
            placeholder="Describe your diagnosis and resolution..."
            rows={3}
            className="w-full rounded-lg p-2.5 text-[11px] resize-none outline-none"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            aria-label="Override diagnosis description"
          />
        )}
      </div>

      {submitted ? (
        <div
          className="rounded-lg p-3 flex items-center gap-2"
          style={{ background: 'var(--color-known-bg)', border: '1px solid var(--color-known-border)' }}
          role="status"
        >
          <CheckCircle size={14} style={{ color: 'var(--color-known)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-known)' }}>
            Tier-3 resolution applied. Verification passed. Knowledge Curator notified.
          </span>
        </div>
      ) : (
        <Button
          onClick={handleSubmit}
          disabled={!decision || (decision === 'override' && !overrideText.trim())}
          className="w-full text-xs font-bold"
          style={{ background: 'var(--color-unknown)', color: 'white', border: 'none' }}
          aria-label="Submit Tier-3 resolution"
        >
          Submit Tier-3 Resolution
        </Button>
      )}
    </div>
  )
}

// ── Knowledge Curator Workspace ──────────────────────────────────────────────
function CuratorWorkspace() {
  const ops = useOperationsStore()
  const [submitted, setSubmitted] = useState(false)

  const handleApprove = () => {
    ops.setHumanState('curator', 'completed')
    ops.incrementSolutionsCount()
    ops.setStationState('knowledge_lab', 'done')
    ops.addManualActivity({
      stage: 'learned',
      eventType: 'KNOWLEDGE_APPROVED',
      message: `Dr. Alisha Patel approved KB draft — solution indexed into pgvector (${ops.totalSolutionsCount + 1} solutions)`,
      incidentId: ops.activeIncidentId ?? '',
    })
    setSubmitted(true)
  }

  const handleReject = () => {
    ops.setHumanState('curator', 'idle')
    ops.addManualActivity({
      stage: 'knowledge_capture',
      eventType: 'KNOWLEDGE_REJECTED',
      message: 'Dr. Alisha Patel rejected KB draft — not added to knowledge base',
      incidentId: ops.activeIncidentId ?? '',
    })
    ops.setOpenHumanDrawer(null)
  }

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div
        className="rounded-lg p-3"
        style={{ background: 'var(--color-known-bg)', border: '1px solid var(--color-known-border)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-known)' }}>
          PENDING KNOWLEDGE REVIEW
        </div>
        <div className="font-mono text-sm font-bold mt-0.5" style={{ color: 'var(--color-known)' }}>
          KB-DRAFT-1249
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Source: {ops.activeIncidentId || 'INC-resolved'} · Proposed by: Resolution Extraction
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>PROBLEM</div>
        <div
          className="rounded-lg p-2.5 text-[11px] leading-relaxed"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        >
          {ops.currentRoute === 'unknown'
            ? 'Novel deadlock pattern caused by circular dependency between orders and inventory tables during concurrent checkout operations.'
            : 'Database connection pool exhaustion causing service timeouts during traffic spikes.'}
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>RESOLUTION</div>
        <div
          className="rounded-lg p-2.5 text-[11px] leading-relaxed"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        >
          {ops.currentRoute === 'unknown'
            ? 'Implement transaction ordering protocol: always acquire locks in table alphabetical order. Add deadlock detection timeout (5s) with automatic retry (max 3).'
            : 'Increase connection pool max_size from 50 to 100. Enable connection health checking. Add pool exhaust alerting at 80% utilization.'}
        </div>
      </div>

      {submitted ? (
        <div
          className="rounded-lg p-3 flex items-center gap-2"
          style={{ background: 'var(--color-known-bg)', border: '1px solid var(--color-known-border)' }}
          role="status"
        >
          <CheckCircle size={14} style={{ color: 'var(--color-known)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-known)' }}>
            Approved and indexed into pgvector. Knowledge base now has 1,249 entries.
          </span>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            className="flex-1 text-xs font-bold"
            style={{ background: 'var(--color-known)', color: 'white', border: 'none' }}
            aria-label="Approve knowledge entry and index into pgvector"
          >
            <CheckCircle size={12} />
            Approve into pgvector
          </Button>
          <Button
            onClick={handleReject}
            variant="outline"
            className="text-xs font-bold"
            style={{ borderColor: 'var(--color-unknown-border)', color: 'var(--color-unknown)' }}
            aria-label="Reject knowledge draft"
          >
            <ThumbsDown size={12} />
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Commander Workspace ──────────────────────────────────────────────────────
function CommanderWorkspace() {
  const ops = useOperationsStore()
  const activeHITL = useHITLStore((s) => s.activeHITL)
  const setPanelOpen = useHITLStore((s) => s.setPanelOpen)

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div
        className="rounded-lg p-3"
        style={{ background: 'var(--color-human-bg)', border: '1px solid var(--color-human-border)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-human)' }}>
          COMMAND CENTER
        </div>
        <div className="text-sm font-medium mt-1">Elena Rodriguez — Incident Commander</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Orchestrating incident response and SLA governance
        </div>
      </div>

      {activeHITL && (activeHITL.status === 'REQUIRED' || activeHITL.status === 'REVIEWING') && (
        <div className="rounded-lg p-3.5 bg-amber-500/15 border border-amber-500/40 text-amber-200 space-y-2.5 animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              HITL Review Required
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-[10px] uppercase font-mono">
              {activeHITL.riskLevel}
            </span>
          </div>
          <p className="text-xs text-amber-100/90 leading-relaxed font-mono">
            {activeHITL.proposedAction || 'High-risk incident escalation awaiting human approval.'}
          </p>
          <button
            onClick={() => setPanelOpen(true)}
            className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Open HITL Review Drawer
          </button>
        </div>
      )}

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
          ACTIVE TEAM STATUS
        </div>
        {ops.humans.filter(h => h.id !== 'commander').map(h => (
          <div
            key={h.id}
            className="flex items-center justify-between py-1.5 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="text-xs font-medium">{h.name}</div>
            <span className={`human-state-badge ${h.state}`}>{h.state.toUpperCase()}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
          DELEGATE ACTIONS
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              ops.setHumanState('developer', 'alerted', ops.activeIncidentId ?? undefined)
              ops.addManualActivity({
                stage: 'human_review', eventType: 'DEVELOPER_ACTIVATED',
                message: 'Elena Rodriguez assigned Systems Engineering to investigate', incidentId: ops.activeIncidentId ?? ''
              })
              ops.setOpenHumanDrawer('developer')
            }}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: 'var(--color-mid-bg)', border: '1px solid var(--color-mid-border)', color: 'var(--color-mid)' }}
          >
            Assign Systems Engineer
          </button>
          <button
            onClick={() => {
              ops.setHumanState('sre', 'alerted', ops.activeIncidentId ?? undefined)
              ops.addManualActivity({
                stage: 'human_review', eventType: 'ENGINEER_ACTIVATED',
                message: 'Elena Rodriguez escalated to Marcus Lee (DevOps / SRE)', incidentId: ops.activeIncidentId ?? ''
              })
              ops.setOpenHumanDrawer('sre')
            }}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: 'var(--color-unknown-bg)', border: '1px solid var(--color-unknown-border)', color: 'var(--color-unknown)' }}
          >
            Escalate to SRE
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main HumanDrawer ─────────────────────────────────────────────────────────
const ROLE_META: Record<string, { name: string; title: string; avatar: string }> = {
  // 10 Official Humans
  elena: { name: 'Elena Rodriguez', title: 'Incident Manager (HITL Authority)', avatar: '/assets/humans/Coworking-amico.svg' },
  alex: { name: 'Alex Rivera', title: 'Systems Engineer (Network & Connectivity)', avatar: '/assets/characters/alex_16x16.png' },
  sam: { name: 'Sam Taylor', title: 'Systems Engineer (Server & OS)', avatar: '/assets/characters/sam_16x16.png' },
  jordan: { name: 'Jordan Hayes', title: 'Systems Engineer (Database & Storage)', avatar: '/assets/characters/jordan_16x16.png' },
  taylor: { name: 'Taylor Morgan', title: 'Systems Engineer (Cloud & Infrastructure)', avatar: '/assets/characters/taylor_16x16.png' },
  riley: { name: 'Riley Brooks', title: 'Systems Engineer (Identity & Security)', avatar: '/assets/characters/riley_16x16.png' },
  marcus: { name: 'Marcus Lee', title: 'DevOps / SRE Engineer', avatar: '/assets/humans/Software engineer-amico.svg' },
  maya: { name: 'Maya Lin', title: 'QA Lead (Verification Lab)', avatar: '/assets/humans/Developer activity-cuate.svg' },
  noah: { name: 'Noah Williams', title: 'QA Engineer (Verification Lab)', avatar: '/assets/humans/Software engineer-amico.svg' },
  ananya: { name: 'Ananya Sen', title: 'Automation Engineer (Verification Lab)', avatar: '/assets/humans/In the office-amico.svg' },
  client: { name: 'Client Requester', title: 'Customer / Ticket Submitter', avatar: '/assets/humans/In the office-amico.svg' },

  // Compatibility aliases
  commander: { name: 'Elena Rodriguez', title: 'Incident Manager (HITL Authority)', avatar: '/assets/humans/Coworking-amico.svg' },
  developer: { name: 'Jordan Hayes', title: 'Systems Engineer (Database & Storage)', avatar: '/assets/characters/jordan_16x16.png' },
  sre: { name: 'Marcus Lee', title: 'DevOps / SRE Engineer', avatar: '/assets/humans/Software engineer-amico.svg' },
  curator: { name: 'Maya Lin', title: 'QA Lead (Verification Lab)', avatar: '/assets/humans/In the office-amico.svg' },
}

export function HumanDrawer() {
  const { openHumanDrawer, setOpenHumanDrawer } = useOperationsStore()

  const isOpen = openHumanDrawer !== null
  const meta = openHumanDrawer ? ROLE_META[openHumanDrawer] : null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) setOpenHumanDrawer(null) }}>
      <SheetContent
        side="right"
        className="overflow-y-auto"
        style={{
          width: 420,
          background: 'var(--bg-surface)',
          border: 'none',
          borderLeft: '1px solid var(--border-default)',
        }}
        aria-label={meta ? `${meta.name} workspace` : 'Human workspace'}
      >
        <SheetHeader className="pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-3">
            {meta && (
              <div
                className="rounded-lg overflow-hidden flex-shrink-0"
                style={{ width: 52, height: 52, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
              >
                <Image
                  src={meta.avatar}
                  alt={meta.name}
                  width={52}
                  height={52}
                  className="object-contain"
                />
              </div>
            )}
            <div>
              <div className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-human)' }}>
                HUMAN PARTICIPANT
              </div>
              <SheetTitle className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {meta?.name}
              </SheetTitle>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{meta?.title}</div>
            </div>
          </div>
        </SheetHeader>

        <div className="pt-2">
          {(['developer', 'alex', 'sam', 'jordan', 'taylor', 'riley'] as any[]).includes(openHumanDrawer) && <SystemsEngineerWorkspace />}
          {(['sre', 'marcus'] as any[]).includes(openHumanDrawer) && <SREWorkspace />}
          {(['curator', 'maya', 'noah', 'ananya'] as any[]).includes(openHumanDrawer) && <CuratorWorkspace />}
          {(['commander', 'elena'] as any[]).includes(openHumanDrawer) && <CommanderWorkspace />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
