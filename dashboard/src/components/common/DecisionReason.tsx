'use client'

import React from 'react'
import {
  getDecisionReason,
  DecisionReasonInput,
  DecisionReasonOutput,
  DecisionReasonPoint,
} from '@/lib/decision-reason'
import {
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  GitBranch,
} from 'lucide-react'

interface Props extends DecisionReasonInput {
  className?: string
  compact?: boolean
}

export function DecisionReason({
  className = '',
  compact = false,
  ...input
}: Props) {
  const reason: DecisionReasonOutput = getDecisionReason(input)

  // Warm-office semantic colors per decision category
  const getBadgeColors = () => {
    switch (reason.category) {
      case 'AUTONOMOUS':
      case 'HITL_APPROVED':
        return {
          bg:     'rgba(169, 195, 160, 0.18)',
          border: 'rgba(169, 195, 160, 0.50)',
          text:   '#5E8A5A',
          icon:   <CheckCircle2 size={13} color="#5E8A5A" />,
        }
      case 'SYSTEMS_ENGINEER':
        return {
          bg:     'rgba(217, 179, 108, 0.18)',
          border: 'rgba(217, 179, 108, 0.45)',
          text:   '#B8894A',
          icon:   <UserCheck size={13} color="#B8894A" />,
        }
      case 'HITL_REQUIRED':
        return {
          bg:     'rgba(123, 63, 69, 0.10)',
          border: 'rgba(123, 63, 69, 0.30)',
          text:   '#7B3F45',
          icon:   <ShieldAlert size={13} color="#7B3F45" />,
        }
      case 'CLARIFICATION':
        return {
          bg:     'rgba(175, 199, 213, 0.20)',
          border: 'rgba(175, 199, 213, 0.55)',
          text:   '#6496AA',
          icon:   <HelpCircle size={13} color="#6496AA" />,
        }
      case 'VERIFICATION_FAILED':
      case 'REJECTED_ESCALATED':
      default:
        return {
          bg:     'rgba(213, 139, 139, 0.18)',
          border: 'rgba(213, 139, 139, 0.45)',
          text:   '#B5605F',
          icon:   <AlertTriangle size={13} color="#B5605F" />,
        }
    }
  }

  const badge = getBadgeColors()

  const renderSymbol = (point: DecisionReasonPoint) => {
    switch (point.symbol) {
      case '✓':
        return <span style={{ color: '#5E8A5A' }} className="font-bold">✓</span>
      case '⚠':
        return <span style={{ color: '#B8894A' }} className="font-bold">⚠</span>
      case '✕':
        return <span style={{ color: '#B5605F' }} className="font-bold">✕</span>
      case '•':
      default:
        return <span style={{ color: 'var(--text-muted)' }} className="font-bold">•</span>
    }
  }

  const pointTextColor = (point: DecisionReasonPoint) =>
    point.type === 'negative' ? '#B5605F' :
    point.type === 'neutral'  ? 'var(--text-secondary)' :
    'var(--text-primary)'

  // ── Compact View ──
  if (compact) {
    return (
      <div
        className={`border p-2.5 flex flex-col gap-1.5 text-[10px] font-mono ${className}`}
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
          borderRadius: 5,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            DECISION REASON
          </span>
          <span
            className="px-1.5 py-0.5 text-[8px] font-bold border"
            style={{ background: badge.bg, borderColor: badge.border, color: badge.text, borderRadius: 3 }}
          >
            {reason.badgeTitle}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 pt-0.5">
          {reason.points.slice(0, 3).map((p, idx) => (
            <div key={idx} className="flex items-start gap-1.5 leading-tight">
              {renderSymbol(p)}
              <span style={{ color: pointTextColor(p) }} className="truncate">
                {p.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Full Detailed View (paper decision card) ──
  return (
    <div
      className={`border flex flex-col gap-3 font-sans transition-all ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        borderColor: badge.border,
        color: 'var(--text-primary)',
        borderRadius: 5,
        padding: 14,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            style={{
              background: badge.bg,
              border: `1px solid ${badge.border}`,
              color: badge.text,
              borderRadius: 4,
              padding: '4px 5px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <GitBranch size={13} />
          </span>
          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              DECISION
            </div>
            <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {reason.title}
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 border font-mono text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: badge.bg,
            borderColor: badge.border,
            color: badge.text,
            borderRadius: 4,
          }}
        >
          {badge.icon}
          <span>{reason.badgeTitle}</span>
        </div>
      </div>

      {/* Reason points — Why? */}
      <div
        className="flex flex-col gap-2 border text-[11px] font-sans"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          borderRadius: 4,
          padding: '10px 12px',
        }}
      >
        <div
          className="text-[9px] font-mono font-bold uppercase tracking-wider mb-1"
          style={{ color: 'var(--text-muted)' }}
        >
          Why?
        </div>

        <div className="flex flex-col gap-1.5">
          {reason.points.map((point, idx) => (
            <div key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="flex-shrink-0 text-xs mt-[-1px] font-mono">
                {renderSymbol(point)}
              </span>
              <span style={{ color: pointTextColor(point) }}>
                {point.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Conclusion footer */}
      <div
        className="flex items-center justify-between text-[11px] font-mono px-3 py-2 border"
        style={{
          background: badge.bg,
          borderColor: badge.border,
          borderRadius: 4,
        }}
      >
        <span className="font-bold flex items-center gap-1.5" style={{ color: badge.text }}>
          {reason.conclusion}
        </span>
      </div>
    </div>
  )
}
