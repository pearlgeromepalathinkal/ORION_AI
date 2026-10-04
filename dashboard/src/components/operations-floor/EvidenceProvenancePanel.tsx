'use client'

import React, { useState, useEffect } from 'react'
import { useIncidentSimulationEngine, CORRECTIVE_MAINTENANCE_POOL } from '@/store/incident-simulation-engine'
import { searchQdrantKnowledge, type QdrantDocument } from '@/lib/orion-api'
import {
  FileText, CheckCircle2, ShieldAlert, Cpu, User, Check, GitCommit,
  Activity, Terminal, Database, Sparkles, TrendingDown, Server,
  AlertTriangle, ShieldCheck, Copy, ExternalLink, CheckCheck
} from 'lucide-react'

interface Props {
  selectedEntity?: { type: 'human' | 'station'; id: string } | null
  onClearSelection?: () => void
}

const HUMAN_PROFILES: Record<string, { name: string; role: string; wing: string }> = {
  // 10 Official Human Actors
  elena:  { name: 'Elena Rodriguez', role: 'Incident Manager (HITL Authority)', wing: 'Command / Management' },
  alex:   { name: 'Alex Rivera', role: 'Systems Engineer (Network & Connectivity)', wing: 'Systems Engineering' },
  sam:    { name: 'Sam Taylor', role: 'Systems Engineer (Server & OS)', wing: 'Systems Engineering' },
  jordan: { name: 'Jordan Hayes', role: 'Systems Engineer (Database & Storage)', wing: 'Systems Engineering' },
  taylor: { name: 'Taylor Morgan', role: 'Systems Engineer (Cloud & Infrastructure)', wing: 'Systems Engineering' },
  riley:  { name: 'Riley Brooks', role: 'Systems Engineer (Identity & Security)', wing: 'Systems Engineering' },
  marcus: { name: 'Marcus Lee', role: 'DevOps / SRE Engineer', wing: 'Operations / SRE' },
  maya:   { name: 'Maya Lin', role: 'QA Lead', wing: 'QA / Verification Lab' },
  noah:   { name: 'Noah Williams', role: 'QA Engineer', wing: 'QA / Verification Lab' },
  ananya: { name: 'Ananya Sen', role: 'Automation Engineer', wing: 'QA / Verification Lab' },
  client: { name: 'Client Requester', role: 'Ticket Submitter', wing: 'Client Reception' },

  // Compatibility aliases
  david:  { name: 'Jordan Hayes', role: 'Systems Engineer (Database & Storage)', wing: 'Systems Engineering' },
  priya:  { name: 'Elena Rodriguez', role: 'Incident Manager (HITL Authority)', wing: 'Command / Management' },
  arjun:  { name: 'Alex Rivera', role: 'Systems Engineer (Network & Connectivity)', wing: 'Systems Engineering' },
  sofia:  { name: 'Taylor Morgan', role: 'Systems Engineer (Cloud & Infrastructure)', wing: 'Systems Engineering' },
  daniel: { name: 'Sam Taylor', role: 'Systems Engineer (Server & OS)', wing: 'Systems Engineering' },
}

const STATION_PROFILES: Record<string, { name: string; type: string; purpose: string }> = {
  intake:           { name: 'ORION INTAKE', type: 'Ingestion Gateway', purpose: 'Ticket receipt, normalization & metadata extraction' },
  semantic:         { name: 'INTENT ENGINE', type: 'Intent & Classification', purpose: 'Domain detection & semantic incident understanding' },
  knowledge_search: { name: 'FEDERATED KB', type: 'Distributed Retrieval', purpose: 'Parallel search across Confluence, SharePoint & Silos' },
  routing:          { name: 'RISK & ROUTING', type: 'Risk-Aware Decision Core', purpose: 'Resolve, Clarify, Escalate, or Reject routing' },
  ai_diagnostics:   { name: 'AI DIAGNOSTICS', type: 'Analysis Cluster', purpose: 'Troubleshooting, root cause reasoning & stack tracing' },
  devops_infra:     { name: 'SRE MONITOR', type: 'Production Monitoring', purpose: 'Service reliability & operational signals' },
  qa_testing:       { name: 'QA / VERIFICATION LAB', type: 'Verification Suite', purpose: 'Closed-loop functional & regression checks' },
  playbook:         { name: 'PLAYBOOK ENGINE', type: 'Remediation Engine', purpose: 'Playbook retrieval & candidate remediation synthesis' },
  verification:     { name: 'VERIFICATION ENGINE', type: 'Health Assessment', purpose: '5/5 automated system validation checks' },
  resolution:       { name: 'RESOLUTION ENGINE', type: 'Closure & Sync', purpose: 'Jira ticket synchronization & resolution completion' },
  knowledge_lab:    { name: 'PROVENANCE / AUDIT', type: 'Audit & Traceability', purpose: 'Execution trail, evidence & provenance preservation' },
  client_reception: { name: 'Visitor Reception', type: 'Client Area', purpose: 'Customer issue reporting & status tracking' },
}

export function EvidenceProvenancePanel({ selectedEntity, onClearSelection }: Props) {
  const sim = useIncidentSimulationEngine()
  const [copiedLog, setCopiedLog] = useState(false)

  // Find matching corrective maintenance incident definition
  const activeDef = CORRECTIVE_MAINTENANCE_POOL.find(
    p => p.id === sim.incidentId || p.title === sim.title
  ) || CORRECTIVE_MAINTENANCE_POOL[0]

  const incidentId = sim.incidentId || activeDef.id || 'INC-1042'
  const route = sim.route ? sim.route.toUpperCase() : activeDef.route.toUpperCase()
  const similarity = sim.similarity !== null ? sim.similarity.toFixed(2) : activeDef.similarity.toFixed(2)
  const isResolved = sim.status === 'resolved' || sim.currentStage === 'resolution' || sim.currentStage === 'knowledge_capture'
  const isVerifying = sim.status === 'verifying' || sim.currentStage === 'verification'

  // Dynamic client information
  const clientName = sim.clientName || 'Sarah Lin'
  const clientRole = sim.clientRole || 'VP Engineering, CloudScale'
  const logSnippet = sim.activeLogSnippet || activeDef.logSnippet

  const metrics = sim.activeMetrics || {
    latencyBefore: activeDef.latencyBefore,
    latencyAfter: activeDef.latencyAfter,
    errorRateBefore: activeDef.errorRateBefore,
    errorRateAfter: activeDef.errorRateAfter,
    saturationBefore: activeDef.saturationBefore,
    saturationAfter: activeDef.saturationAfter,
  }

  // Real-time Qdrant vector retrieval for active incident
  const [qdrantDocs, setQdrantDocs] = useState<QdrantDocument[]>([])
  const [isSearchingQdrant, setIsSearchingQdrant] = useState(false)

  const activeTitle = sim.title || activeDef.title || ''
  const activeLog = sim.activeLogSnippet || activeDef.logSnippet || ''

  useEffect(() => {
    let cancelled = false
    setIsSearchingQdrant(true)
    const query = `${activeTitle} ${activeLog}`.trim()
    searchQdrantKnowledge(query, undefined, 3)
      .then((docs) => {
        if (!cancelled && docs && docs.length > 0) {
          setQdrantDocs(docs)
        }
      })
      .catch((err) => {
        console.warn('EvidenceProvenancePanel Qdrant search notice:', err)
      })
      .finally(() => {
        if (!cancelled) setIsSearchingQdrant(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTitle, activeLog, sim.incidentId])

  // Knowledge search vector matches (from live Qdrant or fallback)
  const vectorMatches = qdrantDocs.length > 0
    ? qdrantDocs.slice(0, 3).map((doc, idx) => {
        const score = doc.score !== undefined ? doc.score : Math.max(0.35, Number(similarity) - idx * 0.15)
        return {
          rank: idx + 1,
          id: doc.id ? `KB-${String(doc.id).slice(0, 6).toUpperCase()}` : (doc.filename ? doc.filename.replace('.txt', '').slice(0, 14).toUpperCase() : `KB-Q0${idx + 1}`),
          title: doc.title,
          similarity: Number(score.toFixed(2)),
          status: score >= 0.70 ? 'Autonomous Playbook Match' : score >= 0.50 ? 'Requires Dev Signoff' : 'Contextual Reference',
          type: `${doc.domain || 'IT'} Runbook (${(doc.source || 'Qdrant').toUpperCase()})`
        }
      })
    : [
        {
          rank: 1,
          id: activeDef.playbookId ? `KB-${activeDef.playbookId}` : 'KB-089',
          title: activeDef.title,
          similarity: Number(similarity),
          status: Number(similarity) >= 0.85 ? 'Autonomous Playbook Match' : Number(similarity) >= 0.55 ? 'Requires Dev Signoff' : 'Below Confidence Threshold',
          type: 'Primary Canonical Runbook'
        },
        {
          rank: 2,
          id: 'KB-042',
          title: `Related ${activeDef.category} Architecture Baseline`,
          similarity: Math.max(0.35, Math.round((Number(similarity) - 0.22) * 100) / 100),
          status: 'Contextual Reference',
          type: 'Historical Architecture Runbook'
        },
        {
          rank: 3,
          id: 'INC-912',
          title: `Prior ${activeDef.category} Production Post-Mortem`,
          similarity: Math.max(0.24, Math.round((Number(similarity) - 0.38) * 100) / 100),
          status: 'Historical Incident',
          type: 'Post-Mortem Provenance'
        }
      ]

  // Copy log helper
  const handleCopyLog = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(logSnippet)
      setCopiedLog(true)
      setTimeout(() => setCopiedLog(false), 2000)
    }
  }

  // If user clicked a specific human or station
  if (selectedEntity) {
    if (selectedEntity.type === 'human') {
      const p = HUMAN_PROFILES[selectedEntity.id] || { name: selectedEntity.id, role: 'Team Member', wing: 'Office' }
      return (
        <div className="p-3 text-xs flex flex-col gap-2.5 h-full overflow-y-auto font-mono select-none">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <User size={13} className="text-purple-400" />
              <span className="font-bold text-white uppercase text-[11px]">{p.name}</span>
            </div>
            {onClearSelection && (
              <button onClick={onClearSelection} className="text-[10px] text-slate-400 hover:text-white cursor-pointer">
                ✕ Close
              </button>
            )}
          </div>

          <div className="space-y-1.5 text-[10px] bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div><span className="text-slate-500">Role: </span><span className="text-white font-bold">{p.role}</span></div>
            <div><span className="text-slate-500">Location: </span><span className="text-slate-300">{p.wing}</span></div>
            <div><span className="text-slate-500">Active Incident: </span><span className="text-purple-300">{sim.incidentId || 'Standby'}</span></div>
            <div><span className="text-slate-500">Status: </span><span className="text-emerald-400 font-bold uppercase">Ready</span></div>
          </div>

          <div className="text-[9px] text-slate-400 font-sans leading-relaxed pt-1">
            Assigned during incident workflows according to specialization and routing classification.
          </div>
        </div>
      )
    }

    const st = STATION_PROFILES[selectedEntity.id] || { name: selectedEntity.id, type: 'Software Station', purpose: 'Incident processing' }
    return (
      <div className="p-3 text-xs flex flex-col gap-2.5 h-full overflow-y-auto font-mono select-none">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu size={13} className="text-sky-400" />
            <span className="font-bold text-white uppercase text-[11px]">{st.name}</span>
          </div>
          {onClearSelection && (
            <button onClick={onClearSelection} className="text-[10px] text-slate-400 hover:text-white cursor-pointer">
              ✕ Close
            </button>
          )}
        </div>

        <div className="space-y-1.5 text-[10px] bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
          <div><span className="text-slate-500">System Type: </span><span className="text-sky-300 font-bold">{st.type}</span></div>
          <div><span className="text-slate-500">Function: </span><span className="text-slate-300">{st.purpose}</span></div>
          <div><span className="text-slate-500">Active Stage: </span><span className="text-white uppercase">{sim.currentStage}</span></div>
        </div>

        <div className="text-[9px] text-slate-400 font-sans leading-relaxed pt-1">
          Automated infrastructure station executing deterministic incident lifecycle steps.
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 text-xs flex flex-col gap-3 h-full overflow-y-auto font-mono select-none custom-scrollbar">
      {/* ── 1. INCIDENT HEADER & CLASSIFICATION ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <FileText size={13} className="text-sky-400" />
          <span className="font-bold text-white text-[11px] tracking-wide">{incidentId}</span>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-500/30">
            {activeDef.priority}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[8px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
            sim.route === 'known' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' :
            sim.route === 'mid' ? 'bg-amber-950/60 text-amber-300 border-amber-500/40' :
            'bg-rose-950/60 text-rose-300 border-rose-500/40'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {route} ({similarity})
          </span>
        </div>
      </div>

      <div className="text-[10px] text-slate-200 font-sans font-medium line-clamp-2">
        {sim.title || activeDef.title}
      </div>

      {/* ── 2. CLIENT REPORTER & ORIGINATOR ── */}
      <div className="bg-gradient-to-br from-slate-950/90 to-slate-900/60 p-2.5 rounded-lg border border-sky-500/20 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <User size={10} className="text-sky-400" /> Client Reporter
          </span>
          <span className="text-[8px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
            Jira SLA Webhook
          </span>
        </div>
        <div className="text-[10px] font-bold text-white">{clientName}</div>
        <div className="text-[9px] text-sky-400/90 truncate">{clientRole}</div>
      </div>

      {/* ── 3. CORRECTIVE MAINTENANCE DIAGNOSTIC METRICS (BEFORE VS AFTER) ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Activity size={10} className="text-emerald-400" /> Corrective Telemetry
          </span>
          <span className="text-[8px] text-slate-500 font-mono">
            {isResolved ? 'POST-FIX VERIFIED' : 'ACTIVE ANOMALY'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          {/* Latency */}
          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
            <div className="text-[8px] text-slate-400 uppercase">Latency P99</div>
            <div className="text-[10px] font-bold font-mono">
              {isResolved ? (
                <span className="text-emerald-400 flex items-center justify-center gap-0.5">
                  <TrendingDown size={9} /> {metrics.latencyAfter}ms
                </span>
              ) : (
                <span className="text-rose-400">{metrics.latencyBefore}ms</span>
              )}
            </div>
            <div className="text-[7.5px] text-slate-500">
              {isResolved ? `was ${metrics.latencyBefore}ms` : 'Target: < 50ms'}
            </div>
          </div>

          {/* Error Rate */}
          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
            <div className="text-[8px] text-slate-400 uppercase">Error Rate</div>
            <div className="text-[10px] font-bold font-mono">
              {isResolved ? (
                <span className="text-emerald-400">0.00%</span>
              ) : (
                <span className="text-rose-400">{metrics.errorRateBefore}%</span>
              )}
            </div>
            <div className="text-[7.5px] text-slate-500">
              {isResolved ? '0 drops' : 'Critical Spike'}
            </div>
          </div>

          {/* Saturation */}
          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
            <div className="text-[8px] text-slate-400 uppercase">Saturation</div>
            <div className="text-[10px] font-bold font-mono">
              {isResolved ? (
                <span className="text-emerald-400">{metrics.saturationAfter}%</span>
              ) : (
                <span className="text-amber-400">{metrics.saturationBefore}%</span>
              )}
            </div>
            <div className="text-[7.5px] text-slate-500">
              {isResolved ? 'Optimal headroom' : 'Exhausted'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. FORENSIC LOG / EXCEPTION STACK TRACE ── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Terminal size={10} className="text-amber-400" /> Forensic Anomaly Log
          </span>
          <button
            onClick={handleCopyLog}
            className="text-[8px] text-slate-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
          >
            {copiedLog ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} />}
            {copiedLog ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="bg-black/90 p-2 rounded-lg border border-slate-800/90 font-mono text-[9px] leading-relaxed text-amber-300/90 break-words select-text">
          <span className="text-rose-400 font-bold block mb-0.5">[CRITICAL_CORRECTIVE_EXCEPTION]</span>
          {logSnippet}
        </div>
      </div>

      {/* ── 5. QDRANT VECTOR RETRIEVAL (TOP 3 MATCHES) ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Database size={10} className="text-purple-400" /> Qdrant Vector Rank
          </span>
          <span className="text-[8px] text-purple-400 font-mono">
            {isSearchingQdrant ? 'Searching...' : 'HNSW all-MiniLM-L6-v2'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {vectorMatches.map((vm) => (
            <div
              key={vm.id}
              className={`p-1.5 rounded border text-[9px] flex flex-col gap-0.5 ${
                vm.rank === 1
                  ? 'bg-purple-950/30 border-purple-500/40 text-purple-200'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold flex items-center gap-1">
                  <span className="text-slate-500">#{vm.rank}</span> {vm.id}
                </span>
                <span className={`font-bold px-1.5 py-0.2 rounded text-[8px] ${
                  vm.similarity >= 0.70 ? 'bg-emerald-500/20 text-emerald-300' :
                  vm.similarity >= 0.50 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  cos θ: {vm.similarity.toFixed(2)}
                </span>
              </div>
              <div className="text-[8.5px] truncate font-sans text-slate-300">{vm.title}</div>
              <div className="text-[7.5px] text-slate-500 flex items-center justify-between">
                <span>{vm.status}</span>
                <span className="text-slate-600">{vm.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. CORRECTIVE REMEDIATION & ROOT CAUSE ── */}
      <div className="space-y-1">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <GitCommit size={10} className="text-sky-400" /> Corrective Action & Provenance
        </div>
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 space-y-1 text-[9px]">
          <div>
            <span className="text-slate-500">Root Cause: </span>
            <span className="text-slate-200 font-sans">{activeDef.rootCause}</span>
          </div>
          <div>
            <span className="text-slate-500">Resolution: </span>
            <span className="text-emerald-300 font-sans">{activeDef.resolution}</span>
          </div>
          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[8px] text-slate-500">
            <span>Audit Hash:</span>
            <span className="font-mono text-slate-400">sha256:7e4a9c...{incidentId.replace(/[^0-9]/g, '') || '1042'}</span>
          </div>
        </div>
      </div>

      {/* ── 7. 5/5 AUTOMATED VERIFICATION HEALTH CHECKS ── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <ShieldCheck size={10} className="text-emerald-400" /> 5/5 Verification Probes
          </span>
          <span className={`text-[8px] font-bold ${isResolved ? 'text-emerald-400' : isVerifying ? 'text-amber-400' : 'text-slate-500'}`}>
            {isResolved ? '5/5 PASSED' : isVerifying ? 'RUNNING PROBES...' : 'PENDING STAGE'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 space-y-1 text-[8.5px]">
          {[
            { probe: 'Synthetic HTTP Latency SLA (<50ms)', pass: isResolved || isVerifying },
            { probe: 'Error Budget Consumption (0.00%)', pass: isResolved || isVerifying },
            { probe: 'Resource Headroom & Thread Pool > 70%', pass: isResolved || isVerifying },
            { probe: 'Ingress Proxy Buffer / Cache Warmup', pass: isResolved || isVerifying },
            { probe: 'Downstream Database Handshake 200 OK', pass: isResolved || isVerifying },
          ].map((p, idx) => (
            <div key={idx} className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 truncate">
                {p.pass ? (
                  <CheckCircle2 size={10} className="text-emerald-400 flex-shrink-0" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border border-slate-700 flex-shrink-0" />
                )}
                <span className="truncate">{p.probe}</span>
              </span>
              <span className={`font-mono text-[8px] font-bold ml-1 ${p.pass ? 'text-emerald-400' : 'text-slate-600'}`}>
                {p.pass ? 'PASS' : 'WAIT'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 8. HUMAN IN THE LOOP MULTI-PARTY SIGN-OFF ── */}
      <div className="space-y-1">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          Human Audit Trail Sign-off
        </div>
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-[8.5px] text-slate-300 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Incident Commander:</span>
            <span className="text-white font-bold">Elena Rodriguez (Approved)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Assigned Engineer:</span>
            <span className="text-slate-200">
              {sim.route === 'unknown' ? 'Marcus Lee & Jordan Hayes' : 'Alex Rivera / Jordan Hayes'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">QA Verification:</span>
            <span className="text-emerald-400 font-bold">Maya Lin (QA Lead Certified)</span>
          </div>
        </div>
      </div>

      {/* ── 9. STATUS & MODE FOOTER ── */}
      <div className="pt-2 mt-auto border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
        <span>Status: <strong className="text-emerald-400">{sim.status.toUpperCase()}</strong></span>
        <span>Mode: <strong className="text-sky-400">{sim.mode}</strong></span>
      </div>
    </div>
  )
}
