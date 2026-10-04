'use client'

import React from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ArrowDown,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react'
import type { HITLVerificationResult } from '@/types/hitl'

export interface StandardCheckItem {
  name: string
  metricLabel?: string
  status: 'PASSED' | 'FAILED' | 'NOT_RUN'
  details?: string
}

interface Props {
  verificationResult?: HITLVerificationResult | null
  status?: 'pending' | 'verifying' | 'passed' | 'failed' | string
  mode?: 'SIMULATED' | 'ACTUAL' | string
  failedCheckIndex?: number // For explicit test scenario 4 (verification failure)
  className?: string
  compact?: boolean
}

export function VerificationGate({
  verificationResult,
  status = 'passed',
  mode = 'SIMULATED',
  failedCheckIndex,
  className = '',
  compact = false,
}: Props) {
  // Determine execution state
  const isVerifying = status === 'verifying' || status === 'RUNNING' || status === 'processing'
  const isFailed =
    status === 'failed' ||
    failedCheckIndex !== undefined ||
    verificationResult?.verification_status === 'FAILED' ||
    verificationResult?.checks?.some(c => c.status === 'FAILED' || c.status === 'FAIL')
  const isNotRun = status === 'pending' || status === 'NOT_RUN' || status === 'NONE'
  const isPassed = !isVerifying && !isFailed && !isNotRun

  // Default 5 standard checks
  const standardChecks: StandardCheckItem[] = [
    {
      name: 'API latency <45 ms',
      metricLabel: isPassed ? '31 ms' : isFailed && failedCheckIndex === 0 ? '142 ms' : isVerifying ? 'Testing...' : 'N/A',
      status: isNotRun ? 'NOT_RUN' : isFailed && failedCheckIndex === 0 ? 'FAILED' : isPassed ? 'PASSED' : isVerifying ? 'NOT_RUN' : 'PASSED',
      details: 'P99 Edge gateway HTTP latency threshold',
    },
    {
      name: 'Database connection pool health',
      metricLabel: isPassed ? 'Healthy' : isFailed && failedCheckIndex === 1 ? 'Exhausted' : isVerifying ? 'Testing...' : 'N/A',
      status: isNotRun ? 'NOT_RUN' : isFailed && failedCheckIndex === 1 ? 'FAILED' : isPassed ? 'PASSED' : isVerifying ? 'NOT_RUN' : 'PASSED',
      details: 'Active pool saturation < 65% with zero deadlocks',
    },
    {
      name: 'Service error rate <0.01%',
      metricLabel: isPassed ? '0.003%' : isFailed && (failedCheckIndex === 2 || failedCheckIndex === undefined) ? '1.42%' : isVerifying ? 'Testing...' : 'N/A',
      status: isNotRun ? 'NOT_RUN' : isFailed && (failedCheckIndex === 2 || failedCheckIndex === undefined) ? 'FAILED' : isPassed ? 'PASSED' : isVerifying ? 'NOT_RUN' : 'PASSED',
      details: '5xx responses below 10 per 100k requests',
    },
    {
      name: 'Memory / thread saturation',
      metricLabel: isPassed ? 'Normal (18%)' : isFailed && failedCheckIndex === 3 ? 'Critical (94%)' : isVerifying ? 'Testing...' : 'N/A',
      status: isNotRun ? 'NOT_RUN' : isFailed && failedCheckIndex === 3 ? 'FAILED' : isPassed ? 'PASSED' : isVerifying ? 'NOT_RUN' : 'PASSED',
      details: 'JVM / OS worker thread pool headroom',
    },
    {
      name: 'End-to-end synthetic probe',
      metricLabel: isPassed ? 'Passed (200 OK)' : isFailed && failedCheckIndex === 4 ? 'Timeout 504' : isVerifying ? 'Testing...' : 'N/A',
      status: isNotRun ? 'NOT_RUN' : isFailed && failedCheckIndex === 4 ? 'FAILED' : isPassed ? 'PASSED' : isVerifying ? 'NOT_RUN' : 'PASSED',
      details: 'Synthetic multi-step client checkout transaction',
    },
  ]

  // If backend provided live checks, overlay them
  if (verificationResult?.checks && verificationResult.checks.length > 0) {
    verificationResult.checks.forEach((c, idx) => {
      if (idx < standardChecks.length) {
        const s = c.status.toUpperCase()
        standardChecks[idx].status = s === 'PASSED' || s === 'PASS' ? 'PASSED' : s === 'FAILED' || s === 'FAIL' ? 'FAILED' : 'NOT_RUN'
        if (c.details) standardChecks[idx].metricLabel = c.details
      }
    })
  }

  const passedCount = standardChecks.filter(c => c.status === 'PASSED').length
  const totalCount = standardChecks.length

  // ── Compact View for Console ──
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-mono select-none ${className}`}
        style={
          isPassed
            ? { background: 'rgba(169,195,160,0.18)', borderColor: 'rgba(169,195,160,0.50)', color: '#5E8A5A', borderRadius: 4 }
            : isFailed
            ? { background: 'rgba(213,139,139,0.18)', borderColor: 'rgba(213,139,139,0.45)', color: '#B5605F', borderRadius: 4 }
            : isVerifying
            ? { background: 'rgba(175,199,213,0.20)', borderColor: 'rgba(175,199,213,0.55)', color: '#6496AA', borderRadius: 4 }
            : { background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', color: 'var(--text-muted)', borderRadius: 4 }
        }
      >
        {isVerifying ? (
          <RefreshCw size={10} className="animate-spin" />
        ) : isPassed ? (
          <CheckCircle2 size={10} />
        ) : isFailed ? (
          <XCircle size={10} />
        ) : (
          <Clock size={10} />
        )}
        <span className="font-bold">
          {isVerifying
            ? 'VERIFYING...'
            : isPassed
            ? `${passedCount}/${totalCount} PASSED`
            : isFailed
            ? `${passedCount}/${totalCount} FAILED`
            : 'NOT RUN'}
        </span>
      </div>
    )
  }

  // ── Full Gate View ──
  return (
    <div
      className={`border p-4 flex flex-col gap-3 font-sans transition-all relative ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        borderColor: isFailed ? 'rgba(213,139,139,0.45)' : isPassed ? 'rgba(169,195,160,0.50)' : 'var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
        borderRadius: 5,
      }}
    >
      {/* Top Gate Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            style={{
              background: isPassed ? 'rgba(169,195,160,0.18)' : isFailed ? 'rgba(213,139,139,0.18)' : 'var(--bg-warm)',
              border: `1px solid ${isPassed ? 'rgba(169,195,160,0.50)' : isFailed ? 'rgba(213,139,139,0.45)' : 'var(--border-default)'}`,
              color: isPassed ? '#5E8A5A' : isFailed ? '#B5605F' : 'var(--text-muted)',
              borderRadius: 4,
              padding: '4px 5px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Cpu size={13} />
          </span>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              VERIFICATION GATE
            </div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Post-Remediation Health Check
            </div>
          </div>
        </div>

        {/* Mode Badge & Pass Ratio */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-[9px] font-mono font-extrabold border uppercase tracking-wider"
            style={{
              background: 'var(--bg-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
            title={mode === 'SIMULATED' ? 'Executed in synthetic staging sandbox; zero production write risk' : 'Live production telemetry'}
          >
            MODE: {mode}
          </span>

          <span
            className="font-mono text-xs font-bold border px-2 py-0.5"
            style={{
              borderRadius: 4,
              ...(isPassed
                ? { background: 'rgba(169,195,160,0.18)', borderColor: 'rgba(169,195,160,0.50)', color: '#5E8A5A' }
                : isFailed
                ? { background: 'rgba(213,139,139,0.18)', borderColor: 'rgba(213,139,139,0.45)', color: '#B5605F' }
                : { background: 'var(--bg-warm)', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }),
            }}
          >
            {passedCount} / {totalCount} CHECKS {isPassed ? 'PASSED' : isFailed ? 'FAILED' : 'PENDING'}
          </span>
        </div>
      </div>

      {/* 5 Standard Checks Table */}
      {/* QA Checklist */}
      <div
        className="border flex flex-col font-mono text-[11px]"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          borderRadius: 4,
        }}
      >
        {standardChecks.map((check, idx) => {
          const isCheckPassed = check.status === 'PASSED'
          const isCheckFailed = check.status === 'FAILED'

          return (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-2 transition-all"
              style={{
                background: isCheckFailed
                  ? 'rgba(213,139,139,0.08)'
                  : isCheckPassed
                  ? 'rgba(169,195,160,0.07)'
                  : 'transparent',
                borderBottom: idx < standardChecks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0 text-xs">
                  {isCheckPassed ? (
                    <span style={{ color: '#5E8A5A' }} className="font-bold">✓</span>
                  ) : isCheckFailed ? (
                    <span style={{ color: '#B5605F' }} className="font-bold">✕</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>○</span>
                  )}
                </span>
                <span
                  className="truncate font-sans font-medium text-xs"
                  style={{
                    color: isCheckFailed ? '#B5605F' : 'var(--text-primary)',
                  }}
                >
                  {check.name}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {check.metricLabel && (
                  <span
                    className="text-[10px]"
                    style={{
                      color: isCheckFailed ? '#B5605F' : isCheckPassed ? '#5E8A5A' : 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {check.metricLabel}
                  </span>
                )}
                <span
                  className="px-1.5 py-0.5 text-[9px] font-bold border"
                  style={{
                    borderRadius: 3,
                    ...(isCheckPassed
                      ? { background: 'rgba(169,195,160,0.18)', borderColor: 'rgba(169,195,160,0.50)', color: '#5E8A5A' }
                      : isCheckFailed
                      ? { background: 'rgba(213,139,139,0.18)', borderColor: 'rgba(213,139,139,0.45)', color: '#B5605F' }
                      : { background: 'var(--bg-warm)', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }),
                  }}
                >
                  {check.status}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Visual Gate Decision Banner */}
      <div className="flex flex-col items-center justify-center pt-1">
        <ArrowDown size={12} style={{ color: 'var(--text-muted)' }} className="my-0.5" />

        {isPassed && (
          <div
            className="w-full border p-2.5 flex flex-col items-center justify-center gap-1 text-center"
            style={{
              background: 'rgba(169,195,160,0.14)',
              borderColor: 'rgba(169,195,160,0.50)',
              borderRadius: 4,
            }}
          >
            <div
              className="px-3 py-0.5 font-mono text-xs font-bold uppercase tracking-wider border"
              style={{
                background: '#A9C3A0',
                color: '#30412D',
                borderColor: '#8FAE86',
                borderRadius: 3,
              }}
            >
              ✓ VERIFIED
            </div>
            <div className="text-[11px] font-medium tracking-wide" style={{ color: '#5E8A5A' }}>
              Resolution may continue — Jira status: DONE
            </div>
          </div>
        )}

        {isFailed && (
          <div
            className="w-full border p-2.5 flex flex-col items-center justify-center gap-1 text-center"
            style={{
              background: 'rgba(213,139,139,0.14)',
              borderColor: 'rgba(213,139,139,0.45)',
              borderRadius: 4,
            }}
          >
            <div
              className="px-3 py-0.5 font-mono text-xs font-bold uppercase tracking-wider border"
              style={{
                background: '#D58B8B',
                color: '#4B2929',
                borderColor: '#C07A7A',
                borderRadius: 3,
              }}
            >
              ✕ VERIFICATION FAILED
            </div>
            <div className="text-[11px] font-medium" style={{ color: '#B5605F' }}>
              Incident reopened — escalation to Senior Engineering required
            </div>
          </div>
        )}

        {isVerifying && (
          <div
            className="w-full border p-2.5 flex flex-col items-center justify-center gap-1 text-center"
            style={{
              background: 'rgba(175,199,213,0.18)',
              borderColor: 'rgba(175,199,213,0.55)',
              borderRadius: 4,
            }}
          >
            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#6496AA' }}>
              <RefreshCw size={12} className="animate-spin" />
              <span>Running health checks in Verification Lab...</span>
            </div>
          </div>
        )}

        {isNotRun && (
          <div
            className="w-full border p-2 flex items-center justify-center gap-2 text-[10px] font-mono"
            style={{
              background: 'var(--bg-warm)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
              borderRadius: 4,
            }}
          >
            <span>Gate armed — awaiting execution completion</span>
          </div>
        )}
      </div>
    </div>
  )
}
