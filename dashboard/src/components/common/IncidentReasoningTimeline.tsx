'use client'

import React from 'react'
import { EvidenceConfidence } from './EvidenceConfidence'
import { DecisionReason } from './DecisionReason'
import { VerificationGate } from './VerificationGate'
import type { Incident } from '@/types/incident'
import type { HITLEvidenceDocument, HITLVerificationResult } from '@/types/hitl'
import {
  ArrowDown,
  Ticket,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
  GitBranch,
} from 'lucide-react'

interface Props {
  incident: Incident
  evidence?: HITLEvidenceDocument[] | null
  verification?: HITLVerificationResult | null
  riskScore?: number | null
  riskLevel?: string
  isHITL?: boolean
  hitlStatus?: string
  hitlDecision?: string
  reviewer?: string
  remediationAction?: string
  mode?: 'SIMULATED' | 'ACTUAL'
}

export function IncidentReasoningTimeline({
  incident,
  evidence,
  verification,
  riskScore,
  riskLevel,
  isHITL,
  hitlStatus,
  hitlDecision,
  reviewer,
  remediationAction,
  mode = 'SIMULATED',
}: Props) {
  const isResolved = incident.status === 'resolved' || incident.status === 'closed'
  const isFailed = incident.verificationPassed === false

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto py-2 font-sans select-none">
      {/* ── STAGE 1: TICKET ── */}
      <div
        className="w-full rounded-xl border p-4 flex flex-col gap-2.5"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="p-1.5 rounded-lg border flex items-center justify-center"
              style={{
                background: 'rgba(255, 143, 171, 0.12)',
                borderColor: 'var(--border-default)',
                color: 'var(--color-processing)',
              }}
            >
              <Ticket size={14} />
            </span>
            <div>
              <div className="text-[9px] font-mono font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                STAGE 1 · INCOMING CLIENT TICKET
              </div>
              <div className="font-mono text-xs font-bold" style={{ color: 'var(--color-processing)' }}>
                {incident.id}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider border"
              style={{
                background: incident.priority === 'P1' ? 'rgba(251, 111, 146, 0.2)' : 'var(--bg-base)',
                borderColor: incident.priority === 'P1' ? 'var(--color-unknown)' : 'var(--border-subtle)',
                color: incident.priority === 'P1' ? 'var(--color-unknown)' : 'var(--text-secondary)',
              }}
            >
              {incident.priority}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border"
              style={{
                background: 'var(--bg-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              {incident.service}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {incident.title}
          </h2>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {incident.description}
          </p>
        </div>

        <div
          className="flex items-center gap-3 pt-2 text-[10px] font-mono border-t"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <span>Source: <strong style={{ color: 'var(--text-primary)' }}>{incident.source}</strong></span>
          <span>•</span>
          <span>Env: <strong style={{ color: 'var(--text-primary)' }}>{incident.environment}</strong></span>
          <span>•</span>
          <span>Created: <strong style={{ color: 'var(--text-primary)' }}>{new Date(incident.createdAt).toLocaleTimeString()}</strong></span>
        </div>
      </div>

      <ArrowDown size={18} style={{ color: 'var(--color-unknown)' }} className="my-1.5 opacity-70 animate-pulse" />

      {/* ── STAGE 2: EVIDENCE CONFIDENCE ── */}
      <div className="w-full">
        <EvidenceConfidence
          evidence={evidence}
          fallbackSimilarity={incident.similarity}
          variant="detailed"
        />
      </div>

      <ArrowDown size={18} style={{ color: 'var(--color-unknown)' }} className="my-1.5 opacity-70 animate-pulse" />

      {/* ── STAGE 3: EXPLICIT DECISION REASON ── */}
      <div className="w-full">
        <DecisionReason
          route={incident.route}
          similarity={incident.similarity}
          riskScore={riskScore}
          riskLevel={riskLevel}
          isHITL={isHITL}
          hitlStatus={hitlStatus}
          hitlDecision={hitlDecision}
          playbookName={incident.playbookName}
          verificationPassed={incident.verificationPassed}
          verificationFailed={isFailed}
          stage={incident.stage}
          title={incident.title}
        />
      </div>

      <ArrowDown size={18} style={{ color: 'var(--color-unknown)' }} className="my-1.5 opacity-70 animate-pulse" />

      {/* ── STAGE 4: REMEDIATION EXECUTION ── */}
      <div
        className="w-full rounded-xl border p-4 flex flex-col gap-2.5"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="p-1.5 rounded-lg border flex items-center justify-center"
              style={{
                background: 'rgba(52, 211, 153, 0.12)',
                borderColor: 'var(--border-default)',
                color: '#34d399',
              }}
            >
              <Terminal size={14} />
            </span>
            <div>
              <div className="text-[9px] font-mono font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                STAGE 4 · REMEDIATION ACTION
              </div>
              <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                {incident.playbookName || 'Remediation Procedure Applied'}
              </div>
            </div>
          </div>

          <span
            className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border"
            style={{
              background: 'var(--bg-base)',
              borderColor: 'var(--border-subtle)',
              color: '#a7f3d0',
            }}
          >
            {isHITL ? 'HUMAN AUTHORIZED' : 'AUTOMATED PLAYBOOK'}
          </span>
        </div>

        <div
          className="rounded-lg p-3 font-mono text-[11px] leading-relaxed border"
          style={{
            background: 'var(--bg-base)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          {remediationAction || incident.suggestedResolution || (
            incident.route === 'known'
              ? 'Executing verified L2TP/IPSec gateway configuration reload with rotated ephemeral credential tokens.'
              : incident.route === 'mid'
              ? 'Systems Engineer applied database pool manager drain and dynamically increased max_connections to 100.'
              : 'Privileged database root session authorized under temporary 15m expiration lease.'
          )}
        </div>
      </div>

      <ArrowDown size={18} style={{ color: 'var(--color-unknown)' }} className="my-1.5 opacity-70 animate-pulse" />

      {/* ── STAGE 5: VERIFICATION GATE ── */}
      <div className="w-full">
        <VerificationGate
          verificationResult={verification}
          status={isFailed ? 'failed' : isResolved ? 'passed' : 'verifying'}
          mode={mode}
        />
      </div>

      <ArrowDown size={18} style={{ color: 'var(--color-unknown)' }} className="my-1.5 opacity-70 animate-pulse" />

      {/* ── STAGE 6: PROVENANCE & AUDIT ── */}
      <div
        className="w-full rounded-xl border p-4 flex flex-col gap-2.5"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="p-1.5 rounded-lg border flex items-center justify-center"
              style={{
                background: 'rgba(255, 179, 198, 0.12)',
                borderColor: 'var(--border-default)',
                color: 'var(--color-mid)',
              }}
            >
              <ShieldCheck size={14} />
            </span>
            <div>
              <div className="text-[9px] font-mono font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                STAGE 6 · PROVENANCE &amp; AUDIT LEDGER
              </div>
              <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Immutable Decision Chain &amp; Citations
              </div>
            </div>
          </div>

          <span
            className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border"
            style={{
              background: 'var(--bg-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--color-mid)',
            }}
          >
            RECORDED
          </span>
        </div>

        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2.5 rounded-lg font-mono text-[10px] border"
          style={{
            background: 'var(--bg-base)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div>
            <div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Retrieval Model</div>
            <div className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>qdrant-dense-768</div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Decision Authority</div>
            <div className="font-bold truncate" style={{ color: 'var(--color-processing)' }}>{reviewer || 'ORION Decision Engine'}</div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cryptographic Hash</div>
            <div className="font-bold truncate" style={{ color: 'var(--text-secondary)' }}>0x8e42...cf19</div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Audit Compliance</div>
            <div className="font-bold truncate text-[#34d399]">SOC2 Type II</div>
          </div>
        </div>
      </div>

      <ArrowDown size={18} style={{ color: 'var(--color-unknown)' }} className="my-1.5 opacity-70 animate-pulse" />

      {/* ── STAGE 7: JIRA CLOSED-LOOP RESOLUTION ── */}
      <div
        className="w-full rounded-xl border p-4 flex flex-col gap-2.5"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: isResolved ? 'rgba(52, 211, 153, 0.40)' : 'var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="p-1.5 rounded-lg border flex items-center justify-center"
              style={{
                background: isResolved ? 'rgba(52, 211, 153, 0.15)' : 'var(--bg-base)',
                borderColor: isResolved ? 'rgba(52, 211, 153, 0.30)' : 'var(--border-default)',
                color: isResolved ? '#34d399' : 'var(--text-muted)',
              }}
            >
              <CheckCircle2 size={14} />
            </span>
            <div>
              <div className="text-[9px] font-mono font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                STAGE 7 · EXTERNAL JIRA SYNCHRONIZATION
              </div>
              <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                {incident.jiraKey ? `Jira Issue: ${incident.jiraKey}` : 'Jira Bi-Directional Sync'}
              </div>
            </div>
          </div>

          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border"
            style={
              isResolved
                ? { background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.40)', color: '#a7f3d0' }
                : { background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }
            }
          >
            {isResolved ? 'STATUS: DONE' : 'STATUS: IN PROGRESS'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs font-mono pt-1">
          <div className="flex items-center gap-2">
            {incident.jiraUrl && (
              <a
                href={incident.jiraUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline text-xs"
                style={{ color: 'var(--color-processing)' }}
              >
                <ExternalLink size={12} />
                <span>Open in Atlassian Jira</span>
              </a>
            )}
          </div>
          {incident.mttr && (
            <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              MTTR: <strong className="text-[#34d399] font-bold">{incident.mttr}m</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
