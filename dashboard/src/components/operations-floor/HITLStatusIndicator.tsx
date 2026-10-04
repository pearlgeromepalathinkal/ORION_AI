'use client'

import React from 'react'
import { useHITLStore } from '@/store/hitl-store'
import { ShieldAlert, CheckCircle2, RefreshCw, AlertCircle, Clock } from 'lucide-react'

export const HITLStatusIndicator: React.FC = () => {
  const activeHITL = useHITLStore((s) => s.activeHITL)
  const isPanelOpen = useHITLStore((s) => s.isPanelOpen)
  const setPanelOpen = useHITLStore((s) => s.setPanelOpen)

  if (!activeHITL || activeHITL.status === 'NONE') {
    return (
      <div
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono select-none border"
        style={{
          background: 'var(--color-known-bg)',
          borderColor: 'var(--color-known-border)',
          color: 'var(--color-known)',
          borderRadius: 4,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-known)' }} />
        <span>AUTONOMOUS</span>
      </div>
    )
  }

  const { status, riskLevel, ticketId } = activeHITL

  if (status === 'REQUIRED' || status === 'REVIEWING') {
    return (
      <button
        onClick={() => setPanelOpen(!isPanelOpen)}
        className="flex items-center gap-2 px-3 py-1 text-xs font-mono select-none transition-all cursor-pointer border"
        style={{
          background: 'var(--color-human-bg)',
          borderColor: 'var(--color-human-border)',
          color: 'var(--color-human)',
          borderRadius: 4,
          animation: 'pulse-dot 2s ease-in-out infinite',
        }}
        title="Click to open Human-in-the-Loop review drawer"
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-human)', animation: 'pulse-dot 1.5s infinite' }} />
        <ShieldAlert className="w-3.5 h-3.5" />
        <span className="font-semibold">HUMAN REVIEW REQUIRED</span>
        <span
          className="px-1.5 py-0.5 text-[10px]"
          style={{ background: 'var(--accent)', color: '#FFFDF8', borderRadius: 3 }}
        >
          {riskLevel}
        </span>
      </button>
    )
  }

  if (status === 'SUBMITTING') {
    return (
      <div
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono select-none border"
        style={{
          background: 'var(--color-processing-bg)',
          borderColor: 'var(--color-processing-border)',
          color: 'var(--color-processing)',
          borderRadius: 4,
        }}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>SUBMITTING DECISION...</span>
      </div>
    )
  }

  if (status === 'DECISION_RECORDED') {
    const isReject = activeHITL.decision === 'REJECT'
    return (
      <button
        onClick={() => setPanelOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono select-none transition-colors cursor-pointer border"
        style={{
          background: isReject ? 'var(--color-unknown-bg)' : 'var(--color-known-bg)',
          borderColor: isReject ? 'var(--color-unknown-border)' : 'var(--color-known-border)',
          color: isReject ? 'var(--color-unknown)' : 'var(--color-known)',
          borderRadius: 4,
        }}
      >
        {isReject ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" />
        )}
        <span>{isReject ? 'DECISION: REJECTED (ESCALATED)' : `DECISION RECORDED (${activeHITL.decision})`}</span>
      </button>
    )
  }

  if (status === 'RESUMING') {
    return (
      <div
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono select-none border"
        style={{
          background: 'var(--color-mid-bg)',
          borderColor: 'var(--color-mid-border)',
          color: 'var(--color-mid)',
          borderRadius: 4,
        }}
      >
        <Clock className="w-3.5 h-3.5 animate-spin" />
        <span>WORKFLOW RESUMING...</span>
      </div>
    )
  }

  if (status === 'VERIFYING') {
    return (
      <button
        onClick={() => setPanelOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono select-none transition-colors cursor-pointer border"
        style={{
          background: 'var(--color-processing-bg)',
          borderColor: 'var(--color-processing-border)',
          color: 'var(--color-processing)',
          borderRadius: 4,
        }}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>VERIFYING REMEDIATION...</span>
      </button>
    )
  }

  if (status === 'COMPLETED') {
    return (
      <button
        onClick={() => setPanelOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono select-none transition-colors cursor-pointer border"
        style={{
          background: 'var(--color-known-bg)',
          borderColor: 'var(--color-known-border)',
          color: 'var(--color-known)',
          borderRadius: 4,
        }}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>RESOLVED &amp; VERIFIED</span>
      </button>
    )
  }

  if (status === 'FAILED') {
    return (
      <button
        onClick={() => setPanelOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono select-none transition-colors cursor-pointer border"
        style={{
          background: 'var(--color-unknown-bg)',
          borderColor: 'var(--color-unknown-border)',
          color: 'var(--color-unknown)',
          borderRadius: 4,
        }}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span>HITL WORKFLOW FAILED</span>
      </button>
    )
  }

  return null
}
