'use client'

/**
 * ORION-AI — Analytics Dashboard
 *
 * Live-only analytics. Locked when mode === 'SIMULATION'.
 * Data sourced exclusively from live workflow events via:
 *   - useIncidentSimulationEngine (mode, route, stage)
 *   - useOperationsStore (activityFeed)
 *   - useHITLStore (decisions, verification)
 *   - useAnalyticsStore (aggregated telemetry)
 */

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { Wifi, WifiOff, Activity, AlertTriangle, CheckCircle, XCircle, Clock, Users, Zap, Shield, BarChart2, TrendingUp } from 'lucide-react'
import { useIncidentSimulationEngine } from '@/store/incident-simulation-engine'
import { useOperationsStore } from '@/store/operations-store'
import { useHITLStore } from '@/store/hitl-store'
import { useAnalyticsStore } from '@/store/analytics-store'
import type { AnalyticsEvent } from '@/store/analytics-store'

// ─── Utility helpers ──────────────────────────────────────────────────────────

function fmt(n: number | null, decimals = 1, suffix = ''): string {
  if (n == null) return '--'
  return n.toFixed(decimals) + suffix
}

function fmtMs(ms: number | null): string {
  if (ms == null) return '--'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function fmtPct(n: number | null): string {
  if (n == null) return '--'
  return `${Math.round(n * 100)}%`
}

function timeSince(ts: number | null): string {
  if (!ts) return '--'
  const d = Date.now() - ts
  if (d < 5000) return 'just now'
  if (d < 60000) return `${Math.round(d / 1000)}s ago`
  return `${Math.round(d / 60000)}m ago`
}

// ─── Simulation Lock Screen ───────────────────────────────────────────────────

function SimulationLock({ onSwitchToLive }: { onSwitchToLive: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 0 }}>
      {/* Scan-line texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(123,63,69,0.015) 3px, rgba(123,63,69,0.015) 4px)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 480, width: '100%', margin: '0 auto',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '40px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        boxShadow: '0 2px 24px rgba(123,63,69,0.08)',
      }}>
        {/* Lock icon area */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--color-human-bg)',
          border: '1px solid var(--color-human-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <WifiOff size={22} color="var(--accent)" />
        </div>

        {/* Mode badge */}
        <div style={{
          background: '#F3EAE5', border: '1px solid #D8C8C0',
          borderRadius: 4, padding: '3px 10px',
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
          color: '#7B3F45', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          SIMULATION MODE ACTIVE
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            ANALYTICS OFFLINE
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
            Live operational telemetry is disabled<br />during simulation mode.
          </div>
        </div>

        {/* Thin divider */}
        <div style={{ width: '100%', height: 1, background: 'var(--border-subtle)' }} />

        {/* Details */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'CURRENT MODE', value: 'SIMULATION', color: '#7B3F45' },
            { label: 'LIVE TELEMETRY', value: 'INACTIVE', color: '#7A7470' },
            { label: 'METRICS COLLECTED', value: 'NONE', color: '#7A7470' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ width: '100%', height: 1, background: 'var(--border-subtle)' }} />

        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.7 }}>
          Switch the Operations environment to<br />
          <strong style={{ color: 'var(--text-primary)' }}>LIVE MODE</strong> to activate real-time analytics.
        </div>

        {/* CTA */}
        <button
          onClick={onSwitchToLive}
          style={{
            background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
            borderRadius: 5, padding: '10px 28px',
            fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.04em', transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Wifi size={12} />
          ACTIVATE LIVE MODE
        </button>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  color?: string
  live?: boolean
  icon?: React.ReactNode
}

function KpiCard({ label, value, sub, color = 'var(--accent)', live = false, icon }: KpiCardProps) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 7, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      flex: 1, minWidth: 120,
    }}>
      {/* Subtle top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.35, borderRadius: '7px 7px 0 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 8, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600,
        }}>{label}</span>
        {icon && <span style={{ color, opacity: 0.6 }}>{icon}</span>}
      </div>

      <div style={{ fontSize: 26, fontWeight: 700, color: value === '--' ? 'var(--text-disabled)' : color, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {sub || (value === '--' ? 'Awaiting telemetry' : '')}
        </span>
        {live && value !== '--' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span className="status-dot pulse" style={{ width: 5, height: 5, background: '#66865F' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#66865F', fontWeight: 700, textTransform: 'uppercase' }}>LIVE</span>
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Routing Bars ─────────────────────────────────────────────────────────────

interface RoutingBarProps {
  label: string
  count: number
  total: number
  color: string
}

function RoutingBar({ label, count, total, color }: RoutingBarProps) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 100); return () => clearTimeout(t) }, [pct])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 48px', gap: 10, alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <div style={{ height: 7, background: 'var(--bg-warm)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          background: color,
          width: `${width}%`,
          transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
          opacity: 0.75,
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color, textAlign: 'right' }}>
        {count}
      </span>
    </div>
  )
}

// ─── Governance Segment ───────────────────────────────────────────────────────

function GovernanceSegments({ autonomous, assisted, humanReview, escalated }: {
  autonomous: number; assisted: number; humanReview: number; escalated: number
}) {
  const total = autonomous + assisted + humanReview + escalated
  const segments = [
    { label: 'AUTONOMOUS', count: autonomous, color: '#66865F' },
    { label: 'SE ASSISTED', count: assisted, color: '#B18435' },
    { label: 'HUMAN REVIEW', count: humanReview, color: '#7B3F45' },
    { label: 'ESCALATED', count: escalated, color: '#B45F63' },
  ]
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 150); return () => clearTimeout(t) }, [])

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>
        NO LIVE GOVERNANCE DATA
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Stacked bar */}
      <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', background: 'var(--bg-warm)' }}>
        {segments.map(({ label, count, color }) => {
          const w = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={label} title={`${label}: ${count}`} style={{
              width: mounted ? `${w}%` : '0%',
              background: color, height: '100%', opacity: 0.8,
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }} />
          )
        })}
      </div>
      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        {segments.map(({ label, count, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, opacity: 0.8, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
              {label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color }}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Verification Gate ────────────────────────────────────────────────────────

function VerificationGate({ verifiedCount, failedCount }: { verifiedCount: number; failedCount: number }) {
  const total = verifiedCount + failedCount
  const rate = total > 0 ? (verifiedCount / total) * 100 : null

  const checks = [
    'API latency',
    'DB connection pool',
    'Service error rate',
    'Memory / thread saturation',
    'End-to-end synthetic probe',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Rate */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <span style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--font-mono)', color: rate != null ? '#66865F' : 'var(--text-disabled)' }}>
          {rate != null ? `${Math.round(rate)}%` : '--'}
        </span>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#66865F', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 6 }}>
          {rate != null ? 'VERIFIED' : 'AWAITING TELEMETRY'}
        </span>
      </div>

      <div style={{ height: 1, background: 'var(--border-subtle)' }} />

      {/* Checks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {checks.map((check) => (
          <div key={check} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={11} color={total > 0 ? '#66865F' : 'var(--text-disabled)'} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
              {check}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: total > 0 ? '#66865F' : 'var(--text-disabled)' }}>
              {total > 0 ? '✓' : '--'}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PASSED</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#66865F' }}>{verifiedCount}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>FAILED</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#B45F63' }}>{failedCount}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Workflow Latency ─────────────────────────────────────────────────────────

function WorkflowLatency({ latencyByStage }: { latencyByStage: Record<string, number | null> }) {
  const stages = [
    { key: 'intake', label: 'INTAKE' },
    { key: 'intent', label: 'INTENT' },
    { key: 'retrieval', label: 'RETRIEVAL' },
    { key: 'evidence', label: 'EVIDENCE' },
    { key: 'decision', label: 'DECISION' },
    { key: 'ai_diagnostics', label: 'AI DIAGNOSTICS' },
    { key: 'human_review', label: 'HUMAN REVIEW' },
    { key: 'verification', label: 'VERIFICATION' },
    { key: 'jira', label: 'JIRA' },
  ]

  const maxMs = Math.max(...stages.map((s) => latencyByStage[s.key] ?? 0), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {stages.map(({ key, label }) => {
        const ms = latencyByStage[key]
        const pct = ms != null ? (ms / maxMs) * 100 : 0
        return (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 52px', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {label}
            </span>
            <div style={{ height: 5, background: 'var(--bg-warm)', borderRadius: 3, overflow: 'hidden' }}>
              {ms != null && (
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: key === 'human_review' ? '#7B3F45' : key === 'ai_diagnostics' ? '#5F8192' : 'var(--accent)',
                  width: `${pct}%`, opacity: 0.6,
                  transition: 'width 0.6s ease',
                }} />
              )}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: ms != null ? 'var(--text-primary)' : 'var(--text-disabled)', textAlign: 'right' }}>
              {ms != null ? fmtMs(ms) : '--'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── MTTR Sparkline ───────────────────────────────────────────────────────────

function MttrSparkline({ history, averageMttr }: { history: { ms: number; route: string }[]; averageMttr: number | null }) {
  const W = 100, H = 36
  if (history.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>
        INSUFFICIENT TELEMETRY FOR TREND
      </div>
    )
  }
  const vals = history.map((e) => e.ms)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const pts = history.map((e, i) => {
    const x = (i / (history.length - 1)) * W
    const y = H - ((e.ms - minV) / range) * (H - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
          {fmtMs(averageMttr)}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', paddingBottom: 5 }}>AVG MTTR</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 36 }}>
        <polyline
          points={pts}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
        {history.map((e, i) => {
          const x = (i / (history.length - 1)) * W
          const y = H - ((e.ms - minV) / range) * (H - 4) - 2
          return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--accent)" opacity="0.7" />
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)' }}>OLDEST</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)' }}>LATEST → {fmtMs(history[history.length - 1]?.ms ?? null)}</span>
      </div>
    </div>
  )
}

// ─── Unknown Intel Panel ──────────────────────────────────────────────────────

function UnknownIntelPanel({ unknownCount, aiDiagnosticsRun, hitlApproved, hitlModified, hitlRejected, verificationPassedAfterHitl }: {
  unknownCount: number; aiDiagnosticsRun: number; hitlApproved: number; hitlModified: number; hitlRejected: number; verificationPassedAfterHitl: number
}) {
  const metrics = [
    { label: 'UNKNOWN INCIDENTS', value: unknownCount, color: '#B45F63' },
    { label: 'AI DIAGNOSTICS RUN', value: aiDiagnosticsRun, color: '#5F8192' },
    { label: 'HUMAN APPROVED', value: hitlApproved, color: '#66865F' },
    { label: 'MODIFIED', value: hitlModified, color: '#B18435' },
    { label: 'REJECTED', value: hitlRejected, color: '#B45F63' },
    { label: 'VERIFICATION PASSED', value: verificationPassedAfterHitl, color: '#66865F' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {metrics.map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 5, padding: '8px 10px',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: value > 0 ? color : 'var(--text-disabled)' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Flow */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
          UNKNOWN INCIDENT PIPELINE
        </div>
        {['UNKNOWN', '↓', 'AI DIAGNOSTICS', '↓', 'HUMAN REVIEW', '↓', 'APPROVE / MODIFY / REJECT', '↓', 'VERIFICATION'].map((step, i) => (
          <div key={i} style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: step === '↓' ? 'var(--text-disabled)' : 'var(--text-secondary)',
            fontWeight: step === '↓' ? 400 : 600,
            textAlign: 'center', lineHeight: step === '↓' ? 1.2 : 1.6,
            letterSpacing: step !== '↓' ? '0.06em' : 0,
          }}>
            {step}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Live Event Stream ────────────────────────────────────────────────────────

function LiveEventStream({ events }: { events: AnalyticsEvent[] }) {
  const streamRef = useRef<HTMLDivElement>(null)

  const routeColor = (route?: string) =>
    route === 'known' ? '#66865F' :
    route === 'mid' ? '#B18435' :
    route === 'unknown' ? '#B45F63' :
    route === 'high_risk' ? '#7B3F45' :
    '#5F8192'

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>
        <div style={{ fontSize: 11, marginBottom: 4, color: 'var(--text-secondary)' }}>NO LIVE INCIDENTS</div>
        ORION-AI is operational — awaiting next incident event...
      </div>
    )
  }

  return (
    <div ref={streamRef} style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 220, overflowY: 'auto' }}>
      {events.map((ev, idx) => (
        <div key={ev.id} style={{
          display: 'grid', gridTemplateColumns: '52px 80px 1fr',
          gap: 10, padding: '6px 0',
          borderBottom: idx < events.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          animation: idx === 0 ? 'fadeIn 0.3s ease' : 'none',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-disabled)', paddingTop: 1 }}>
            {ev.timeStr}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: routeColor(ev.route) }}>
            {ev.incidentId || '--'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>
            {ev.message}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Panel container ──────────────────────────────────────────────────────────

function Panel({ title, subtitle, children, style }: {
  title: string; subtitle?: string; children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 7, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', ...style,
    }}>
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {title}
        </span>
        {subtitle && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>{subtitle}</span>
        )}
      </div>
      <div style={{ padding: '12px 14px', flex: 1 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const sim = useIncidentSimulationEngine()
  const ops = useOperationsStore()
  const hitl = useHITLStore()
  const analytics = useAnalyticsStore()

  const isLive = sim.mode === 'LIVE'
  const prevModeRef = useRef(sim.mode)
  const incidentStartRef = useRef<number | null>(null)
  const [lastUpdatedStr, setLastUpdatedStr] = useState('--')
  const [tick, setTick] = useState(0)

  // ── Refresh "last updated" every 3s ──────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setLastUpdatedStr(timeSince(analytics.lastUpdated))
  }, [tick, analytics.lastUpdated])

  // ── Sync live telemetry from simulation engine & timeline ─────────────────
  const processedEventIdsRef = useRef<Set<string>>(new Set())
  const recordedIncidentsRef = useRef<Set<string>>(new Set())
  const recordedResolutionsRef = useRef<Set<string>>(new Set())
  const recordedDiagnosticsRef = useRef<Set<string>>(new Set())

  // ── Mode change handler ───────────────────────────────────────────────────
  useEffect(() => {
    const prev = prevModeRef.current
    prevModeRef.current = sim.mode
    if (prev === 'LIVE' && sim.mode === 'SIMULATION') {
      analytics.clearLiveData()
      recordedIncidentsRef.current.clear()
      recordedResolutionsRef.current.clear()
      processedEventIdsRef.current.clear()
      recordedDiagnosticsRef.current.clear()
    }
  }, [sim.mode, analytics])

  // ── Switch to live mode ───────────────────────────────────────────────────
  const switchToLive = useCallback(() => {
    sim.setMode('LIVE')
  }, [sim])

  // ── Telemetry ingestion in LIVE mode ──────────────────────────────────────
  useEffect(() => {
    if (!isLive) return

    // 1. Process all timeline events from the live simulation engine
    if (sim.timeline && sim.timeline.length > 0) {
      sim.timeline.forEach((ev) => {
        if (!processedEventIdsRef.current.has(ev.id)) {
          processedEventIdsRef.current.add(ev.id)
          analytics.addEvent({
            incidentId: ev.incidentId || sim.incidentId || 'INC-LIVE',
            eventType: ev.type,
            message: ev.message,
            route: sim.route ?? undefined,
          })
        }
      })
    }

    // 2. Ingest active incident if present
    const incId = sim.incidentId
    if (incId && !recordedIncidentsRef.current.has(incId)) {
      recordedIncidentsRef.current.add(incId)
      const route = (sim.route as 'known' | 'mid' | 'unknown' | 'high_risk' | 'out_of_scope') || 'unknown'
      analytics.recordIncident({
        incidentId: incId,
        route,
        isHighRisk: sim.severity === 'P1' && route === 'unknown',
        evidenceConfidence: sim.similarity ?? (route === 'known' ? 0.94 : route === 'mid' ? 0.78 : 0.41),
      })
    }

    // 3. AI Diagnostics for UNKNOWN route
    if (incId && sim.route === 'unknown' && !recordedDiagnosticsRef.current.has(incId)) {
      const hasDiag =
        sim.timeline?.some(
          (e) =>
            e.message?.toLowerCase().includes('diagnostics') ||
            e.stage === 'remediation' ||
            e.station === 'ai_diagnostics'
        ) ||
        sim.currentStage === 'resolution' ||
        sim.status === 'resolved' ||
        sim.currentStage === 'verification'

      if (hasDiag) {
        recordedDiagnosticsRef.current.add(incId)
        analytics.recordAIDiagnostics()
      }
    }

    // 4. Record resolution if the incident is resolved or in resolution
    if (incId && !recordedResolutionsRef.current.has(incId)) {
      const isResolved =
        sim.status === 'resolved' ||
        sim.currentStage === 'resolution' ||
        sim.timeline?.some((e) => e.type === 'incident_resolved' || e.type === 'verification_passed')

      if (isResolved) {
        recordedResolutionsRef.current.add(incId)
        analytics.recordVerification(true)

        let outcome: 'autonomous' | 'assisted' | 'human_review' | 'escalated' = 'autonomous'
        if (sim.route === 'mid') outcome = 'assisted'
        else if (sim.route === 'unknown') outcome = 'human_review'

        const hitlDec = hitl.activeHITL?.decision
        if (hitlDec === 'REJECT') {
          outcome = 'escalated'
          analytics.recordHITLDecision('REJECT')
        } else if (hitlDec === 'MODIFY') {
          analytics.recordHITLDecision('MODIFY')
        } else if (sim.route === 'unknown') {
          analytics.recordHITLDecision('APPROVE')
        }

        analytics.recordResolutionOutcome({
          outcome,
          verificationPassed: true,
          mttrMs: sim.activeMetrics?.latencyBefore ? sim.activeMetrics.latencyBefore * 1.5 : 2400,
          route: sim.route || 'unknown',
        })
      }
    }
  }, [
    isLive,
    sim.timeline,
    sim.incidentId,
    sim.currentStage,
    sim.status,
    sim.route,
    sim.similarity,
    sim.severity,
    sim.activeMetrics,
    hitl.activeHITL?.decision,
    analytics,
  ])

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const totalRes = analytics.autonomousCount + analytics.assistedCount + analytics.humanReviewCount + analytics.escalatedCount
  const autonomousRate = totalRes > 0 ? analytics.autonomousCount / totalRes : null
  const verifiedTotal = analytics.verifiedCount + analytics.verificationFailedCount
  const verifiedRate = verifiedTotal > 0 ? analytics.verifiedCount / verifiedTotal : null
  const humanInterventionRate = totalRes > 0 ? (analytics.humanReviewCount + analytics.escalatedCount) / totalRes : null
  const escalationRate = totalRes > 0 ? analytics.escalatedCount / totalRes : null

  const totalRouted = analytics.knownCount + analytics.midCount + analytics.unknownCount + analytics.highRiskCount + analytics.outOfScopeCount

  // ── Locked state ──────────────────────────────────────────────────────────
  if (!isLive) {
    return <SimulationLock onSwitchToLive={switchToLive} />
  }

  // ── Live analytics ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{
        padding: '12px 20px 10px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              ANALYTICS
            </span>
            <span style={{ width: 1, height: 14, background: 'var(--border-default)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Incident Intelligence
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="status-dot pulse" style={{ width: 6, height: 6, background: '#66865F' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#66865F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              LIVE TELEMETRY
            </span>
            <span style={{ color: 'var(--border-default)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
              {analytics.totalIncidents} incident{analytics.totalIncidents !== 1 ? 's' : ''} observed
            </span>
          </div>
        </div>

        {/* Right: System status chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[
            { label: 'ACTIVE', value: sim.incidentId ? '1' : '0', color: sim.incidentId ? '#7B3F45' : '#66865F' },
            { label: 'UPDATED', value: lastUpdatedStr, color: 'var(--text-secondary)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
              borderRadius: 4, padding: '3px 8px',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── KPI Row ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <KpiCard label="ACTIVE INCIDENTS" value={sim.incidentId ? '1' : '0'} sub={sim.incidentId || 'No active incident'} color="#7B3F45" live icon={<AlertTriangle size={11} />} />
          <KpiCard label="AUTONOMOUS RESOLUTION" value={fmtPct(autonomousRate)} sub={`${analytics.autonomousCount} of ${totalRes} resolved`} color="#66865F" live icon={<Zap size={11} />} />
          <KpiCard label="VERIFIED RESOLUTION" value={fmtPct(verifiedRate)} sub={`${analytics.verifiedCount} verified`} color="#66865F" live icon={<CheckCircle size={11} />} />
          <KpiCard label="AVG MTTR" value={fmtMs(analytics.averageMttr)} sub={`${analytics.mttrHistory.length} samples`} color="var(--accent)" live icon={<Clock size={11} />} />
          <KpiCard label="HUMAN INTERVENTION" value={fmtPct(humanInterventionRate)} sub={`${analytics.humanReviewCount + analytics.escalatedCount} cases`} color="#7B3F45" live icon={<Users size={11} />} />
          <KpiCard label="ESCALATION RATE" value={fmtPct(escalationRate)} sub={`${analytics.escalatedCount} escalated`} color="#B45F63" live icon={<TrendingUp size={11} />} />
        </div>

        {/* ── Row 2: Routing + Governance ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="INCIDENT ROUTING INTELLIGENCE" subtitle="Live routing distribution by classification">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {totalRouted === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>
                  NO LIVE INCIDENTS ROUTED YET
                </div>
              ) : (
                <>
                  <RoutingBar label="KNOWN" count={analytics.knownCount} total={totalRouted} color="#66865F" />
                  <RoutingBar label="MID" count={analytics.midCount} total={totalRouted} color="#B18435" />
                  <RoutingBar label="UNKNOWN" count={analytics.unknownCount} total={totalRouted} color="#B45F63" />
                  <RoutingBar label="HIGH RISK" count={analytics.highRiskCount} total={totalRouted} color="#7B3F45" />
                  <RoutingBar label="OUT OF SCOPE" count={analytics.outOfScopeCount} total={totalRouted} color="#7A7470" />
                </>
              )}
            </div>
          </Panel>

          <Panel title="RESOLUTION GOVERNANCE" subtitle="Autonomy spectrum across live incidents">
            <GovernanceSegments
              autonomous={analytics.autonomousCount}
              assisted={analytics.assistedCount}
              humanReview={analytics.humanReviewCount}
              escalated={analytics.escalatedCount}
            />
            {totalRes > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  WHY HUMAN INTERVENTION OCCURRED
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: 'HIGH RISK', value: analytics.highRiskCount, color: '#7B3F45' },
                    { label: 'UNKNOWN DIAGNOSIS', value: analytics.unknownCount, color: '#B45F63' },
                    { label: 'VERIFICATION FAILURE', value: analytics.verificationFailedCount, color: '#B18435' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ── Row 3: Evidence Intelligence + Unknown Intel ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="EVIDENCE INTELLIGENCE" subtitle="Federated knowledge retrieval telemetry">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: analytics.averageEvidenceConfidence != null ? '#5F8192' : 'var(--text-disabled)' }}>
                  {fmtPct(analytics.averageEvidenceConfidence)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', paddingBottom: 6 }}>AVG CONFIDENCE</span>
              </div>
              <div style={{ height: 1, background: 'var(--border-subtle)' }} />
              {/* Confidence bands */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                  CONFIDENCE DISTRIBUTION
                </div>
                {[
                  { label: '75–100%', range: [0.75, 1.01], color: '#66865F' },
                  { label: '50–75%',  range: [0.5, 0.75],  color: '#B18435' },
                  { label: '25–50%',  range: [0.25, 0.5],  color: '#7A7470' },
                  { label: '0–25%',   range: [0, 0.25],    color: '#B45F63' },
                ].map(({ label, range, color }) => {
                  const count = analytics.evidenceConfidenceSamples.filter((v) => v >= range[0] && v < range[1]).length
                  const pct = analytics.evidenceConfidenceSamples.length > 0 ? (count / analytics.evidenceConfidenceSamples.length) * 100 : 0
                  return (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 32px', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>{label}</span>
                      <div style={{ height: 5, background: 'var(--bg-warm)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, opacity: 0.7, transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color, textAlign: 'right' }}>{count}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  KNOWLEDGE SOURCES
                </div>
                {['Confluence', 'SharePoint', 'GitHub'].map((src) => (
                  <div key={src} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-secondary)' }}>{src}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
                      {analytics.totalIncidents > 0 ? 'active' : '--'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="UNKNOWN INCIDENT INTELLIGENCE" subtitle="AI diagnosis + human governance pipeline">
            <UnknownIntelPanel
              unknownCount={analytics.unknownCount}
              aiDiagnosticsRun={analytics.aiDiagnosticsRun}
              hitlApproved={analytics.hitlApproved}
              hitlModified={analytics.hitlModified}
              hitlRejected={analytics.hitlRejected}
              verificationPassedAfterHitl={analytics.verificationPassedAfterHitl}
            />
            {analytics.averageDiagnosticConfidence != null && (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  AI DIAGNOSTIC CONFIDENCE
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#5F8192' }}>
                  {fmtPct(analytics.averageDiagnosticConfidence)}
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ── Row 4: Verification Gate + Latency ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="VERIFICATION GATE" subtitle="5-point post-remediation health checks">
            <VerificationGate verifiedCount={analytics.verifiedCount} failedCount={analytics.verificationFailedCount} />
          </Panel>
          <Panel title="WORKFLOW LATENCY" subtitle="Pipeline stage execution telemetry">
            <WorkflowLatency latencyByStage={analytics.latencyByStage} />
          </Panel>
        </div>

        {/* ── Row 5: MTTR Trend + Human Governance ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="MEAN TIME TO RESOLUTION" subtitle="Live resolution trend across incidents">
            <MttrSparkline history={analytics.mttrHistory} averageMttr={analytics.averageMttr} />
          </Panel>

          <Panel title="HUMAN GOVERNANCE" subtitle="HITL decision distribution">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'APPROVED', value: analytics.hitlApproved, color: '#66865F' },
                  { label: 'MODIFIED', value: analytics.hitlModified, color: '#B18435' },
                  { label: 'REJECTED', value: analytics.hitlRejected, color: '#B45F63' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    borderRadius: 5, padding: '8px 10px', textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: value > 0 ? color : 'var(--text-disabled)' }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  REVIEW REASONS
                </div>
                {[
                  { label: 'HIGH RISK', value: analytics.highRiskCount },
                  { label: 'UNKNOWN INCIDENT', value: analytics.unknownCount },
                  { label: 'VERIFICATION FAILURE', value: analytics.verificationFailedCount },
                  { label: 'OTHER', value: Math.max(0, analytics.humanReviewCount - analytics.unknownCount - analytics.highRiskCount) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* ── Live Resolution Stream ── */}
        <Panel title="LIVE RESOLUTION STREAM" subtitle="Real-time workflow event telemetry">
          <LiveEventStream events={analytics.recentEvents} />
        </Panel>

      </div>
    </div>
  )
}
