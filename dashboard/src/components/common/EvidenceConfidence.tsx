'use client'

import React, { useState } from 'react'
import {
  computeAggregatedConfidence,
  AggregatedEvidenceConfidence,
  ConfidenceTier,
} from '@/lib/evidence-confidence'
import type { HITLEvidenceDocument } from '@/types/hitl'
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface Props {
  evidence?: HITLEvidenceDocument[] | null
  fallbackSimilarity?: number | null
  variant?: 'compact' | 'detailed'
  className?: string
  onOpenDetails?: () => void
}

export function EvidenceConfidence({
  evidence,
  fallbackSimilarity,
  variant = 'detailed',
  className = '',
  onOpenDetails,
}: Props) {
  const [isCardsExpanded, setIsCardsExpanded] = useState(false)

  const data: AggregatedEvidenceConfidence = computeAggregatedConfidence(
    evidence,
    fallbackSimilarity
  )

  const { tier, compositeScore, breakdown, sources, evidenceCount, items } = data

  // Warm-office semantic tier colors
  const getTierColors = (t: ConfidenceTier) => {
    switch (t) {
      case 'HIGH':
        return {
          bg:     'rgba(169, 195, 160, 0.18)',
          border: 'rgba(169, 195, 160, 0.50)',
          text:   '#5E8A5A',
          dot:    '#A9C3A0',
          bar:    '#A9C3A0',
        }
      case 'MEDIUM':
        return {
          bg:     'rgba(217, 179, 108, 0.18)',
          border: 'rgba(217, 179, 108, 0.45)',
          text:   '#B8894A',
          dot:    '#D9B36C',
          bar:    '#D9B36C',
        }
      case 'LOW':
        return {
          bg:     'rgba(213, 139, 139, 0.18)',
          border: 'rgba(213, 139, 139, 0.45)',
          text:   '#B5605F',
          dot:    '#D58B8B',
          bar:    '#D58B8B',
        }
      case 'NONE':
      default:
        return {
          bg:     'rgba(138, 129, 119, 0.12)',
          border: 'rgba(138, 129, 119, 0.30)',
          text:   '#8A8177',
          dot:    '#8A8177',
          bar:    '#8A8177',
        }
    }
  }

  const colors = getTierColors(tier)

  // ── Compact View ──
  if (variant === 'compact') {
    return (
      <div
        onClick={onOpenDetails}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-mono select-none transition-all ${
          onOpenDetails ? 'cursor-pointer hover:opacity-85' : ''
        } ${className}`}
        style={{
          background: colors.bg,
          borderColor: colors.border,
          color: colors.text,
          borderRadius: 4,
        }}
        title={`Evidence Confidence: ${Math.round(compositeScore * 100)}% (${tier})`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: colors.dot }}
        />
        <span className="font-bold">
          {compositeScore > 0 ? `${Math.round(compositeScore * 100)}%` : '0%'}
        </span>
        <span className="font-semibold">{tier}</span>
      </div>
    )
  }

  // ── Detailed View (Engineering Report style) ──
  return (
    <div
      className={`border flex flex-col gap-3 font-sans transition-all ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border-default)',
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
              background: 'var(--bg-warm)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
              borderRadius: 4,
              padding: '4px 5px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ShieldCheck size={13} />
          </span>
          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              EVIDENCE CONFIDENCE
            </div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Knowledge Trust Evaluation
            </div>
          </div>
        </div>

        {/* Confidence badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 border font-mono text-xs font-bold"
          style={{
            background: colors.bg,
            borderColor: colors.border,
            color: colors.text,
            borderRadius: 4,
          }}
        >
          <span className="font-black">
            {Math.round(compositeScore * 100)}%
          </span>
          <span>{tier}</span>
        </div>
      </div>

      {/* Breakdown meters — engineering report style */}
      <div
        className="flex flex-col gap-2 border text-[11px]"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          borderRadius: 4,
          padding: '10px 12px',
        }}
      >
        {[
          { label: 'Semantic Similarity', value: breakdown.semanticSimilarity },
          { label: 'Source Authority',    value: breakdown.sourceAuthority },
          { label: 'Freshness',           value: breakdown.freshness },
          { label: 'Reliability',         value: breakdown.reliability },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-36 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {label}
            </span>
            <div
              className="flex-1 overflow-hidden"
              style={{
                height: 5,
                background: 'var(--bg-warm)',
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(value * 100))}%`,
                  background: colors.bar,
                  height: '100%',
                  borderRadius: 3,
                  transition: 'width 0.6s',
                }}
              />
            </div>
            <span
              className="w-10 text-right font-bold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
            >
              {Math.round(value * 100)}%
            </span>
          </div>
        ))}
      </div>

      {/* Sources footer */}
      <div className="flex items-center justify-between text-[10px] pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span style={{ color: 'var(--text-muted)' }}>Sources:</span>
          {sources.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>None</span>
          ) : (
            sources.map(src => (
              <span
                key={src}
                className="px-1.5 py-0.5 border text-[9px] font-bold"
                style={{
                  background: 'var(--bg-warm)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)',
                  borderRadius: 3,
                }}
              >
                ● {src}
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-muted)' }}>
            {evidenceCount} doc{evidenceCount !== 1 ? 's' : ''}
          </span>

          {items.length > 0 && (
            <button
              onClick={() => setIsCardsExpanded(!isCardsExpanded)}
              className="flex items-center gap-1 px-1.5 py-0.5 transition-colors text-[9px] font-bold cursor-pointer border"
              style={{
                background: 'var(--bg-warm)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-secondary)',
                borderRadius: 3,
              }}
            >
              <span>{isCardsExpanded ? 'Hide' : 'Details'}</span>
              {isCardsExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable evidence cards */}
      {isCardsExpanded && items.length > 0 && (
        <div
          className="flex flex-col gap-2 pt-2 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {items.map((item, idx) => (
            <div
              key={`${item.title}-${idx}`}
              className="border flex flex-col gap-1.5 text-[10px]"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-default)',
                borderRadius: 4,
                padding: '8px 10px',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono font-bold uppercase text-[9px] px-1.5 py-0.5 border"
                  style={{
                    background: 'var(--color-processing-bg)',
                    color: 'var(--color-processing)',
                    borderColor: 'var(--color-processing-border)',
                    borderRadius: 3,
                  }}
                >
                  {item.source}
                </span>
                <span
                  className="font-mono font-black"
                  style={{ color: colors.text, fontSize: 10 }}
                >
                  {Math.round(item.compositeScore * 100)}%
                </span>
              </div>

              <div className="font-semibold text-[11px]" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </div>

              {item.content && (
                <div
                  className="text-[9px] leading-relaxed line-clamp-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.content}
                </div>
              )}

              <div
                className="flex items-center gap-2 pt-1"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 8 }}
              >
                <span>Sim: <strong>{(item.similarity || 0).toFixed(2)}</strong></span>
                <span>·</span>
                <span>Auth: <strong>{item.authority.toFixed(2)}</strong></span>
                <span>·</span>
                <span>Fresh: <strong>{item.freshness.toFixed(2)}</strong></span>
                <span>·</span>
                <span>Rel: <strong>{item.reliability.toFixed(2)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
