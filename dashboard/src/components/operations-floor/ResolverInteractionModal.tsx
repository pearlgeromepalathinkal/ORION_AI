import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, AlertTriangle, ArrowRight, Code, Terminal,
  ExternalLink, Sparkles, Send, ShieldAlert, Cpu, Check, X,
  Database, RefreshCw, FileText, UserCheck, Shield
} from 'lucide-react'
import { useOperationsStore } from '@/store/operations-store'
import { useIncidentSimulation } from '@/store/incident-simulation-engine'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { submitOrionReviewDecision, searchQdrantKnowledge, type QdrantDocument } from '@/lib/orion-api'
import { resolveSystemsEngineer } from '@/store/incident-simulation-engine'

interface Props {
  isOpen: boolean
  onClose: (resolvedEngineerId?: string) => void
  onResolveSuccess: () => void
}

interface HistoricalMatch {
  id: string
  title: string
  similarity: number
  fix: string
  source: string
}

export function ResolverInteractionModal({ isOpen, onClose, onResolveSuccess }: Props) {
  const ops = useOperationsStore()
  const sim = useIncidentSimulation()
  const [selectedMatch, setSelectedMatch] = useState<number>(0)
  const [customNotes, setCustomNotes] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [qdrantMatches, setQdrantMatches] = useState<HistoricalMatch[]>([])
  const [isLoadingQdrant, setIsLoadingQdrant] = useState(false)

  // Dynamically resolve active incident details
  const activeIncidentId = sim.incidentId || ops.activeIncidentId || 'EPL-1067'
  const activeIncidentTitle = sim.title || 'Database Connection Pool Exhaustion on Checkout'
  const activeSimilarity = sim.similarity !== null && sim.similarity !== undefined ? sim.similarity : 0.78
  const activeSeverity = sim.severity || 'P2'
  const activeClientName = sim.clientName || 'Alex Johnson (Client Platform)'

  const resolvedEngineer = useMemo(() => {
    // Check if an engineer is already actively alerted or investigating
    const activeEng = ops.humans.find(
      h => (h.state === 'investigating' || h.state === 'resolving' || h.state === 'alerted') &&
           ['alex', 'sam', 'jordan', 'taylor', 'riley'].includes(h.id)
    )
    if (activeEng) {
      return {
        id: activeEng.id,
        name: activeEng.name,
        role: activeEng.role || 'Systems Engineer',
        specialization: activeEng.specialization || 'Database & Storage',
      }
    }

    // Dynamic resolution based on active incident title/description
    const dynamic = resolveSystemsEngineer({
      title: activeIncidentTitle,
      category: 'Database',
      service: 'Production Cluster',
      description: sim.activeLogSnippet || activeIncidentTitle,
    })
    return {
      id: dynamic.id,
      name: dynamic.name,
      role: dynamic.role,
      specialization: dynamic.specialization,
    }
  }, [ops.humans, activeIncidentTitle, sim.activeLogSnippet])

  // Fallback matches when Qdrant returns no results or is starting up
  const fallbackMatches = useMemo<HistoricalMatch[]>(() => {
    const text = activeIncidentTitle.toLowerCase()
    if (text.includes('vpn') || text.includes('network') || text.includes('wifi')) {
      return [
        {
          id: 'KB-VPN-01',
          title: 'VPN gateway authentication session cache invalidation',
          similarity: 0.94,
          fix: 'ipsec restart; systemctl restart strongswan; clear_session_cache --user=all;',
          source: 'CONFLUENCE · Network Runbook',
        },
        {
          id: 'KB-VPN-02',
          title: 'Active Directory credential mismatch on GlobalProtect gateway',
          similarity: 0.81,
          fix: 'ad_sync_tool --verify-token --force-credential-flush',
          source: 'GITHUB · Security SOP',
        },
        {
          id: 'KB-NET-03',
          title: 'Office Wi-Fi bandwidth degradation and AP channel saturation',
          similarity: 0.72,
          fix: 'cisco_wlc_cli reload-radio-config --band=5ghz --auto-channel=true',
          source: 'SHAREPOINT · IT Infrastructure',
        },
      ]
    }
    if (text.includes('server') || text.includes('disk') || text.includes('cloud') || text.includes('ec2')) {
      return [
        {
          id: 'KB-SRV-01',
          title: 'Production Linux root partition saturation cleanup and log rotation',
          similarity: 0.91,
          fix: 'journalctl --vacuum-time=2d; rm -rf /var/log/*.gz; truncate -s 0 /var/log/app.log',
          source: 'CONFLUENCE · Server Runbook',
        },
        {
          id: 'KB-CLD-02',
          title: 'AWS EC2 ALB target group health check probe timeout recovery',
          similarity: 0.83,
          fix: 'aws elbv2 deregister-targets; aws autoscaling start-instance-refresh; systemctl restart webapp',
          source: 'GITHUB · DevOps SOP',
        },
      ]
    }
    return [
      {
        id: 'KB-089',
        title: 'PostgreSQL connection pool exhaustion during traffic spike',
        similarity: 0.79,
        fix: 'ALTER SYSTEM SET max_connections = 100; SELECT pg_reload_conf(); restart_pool_worker();',
        source: 'INC-942 · 2 weeks ago',
      },
      {
        id: 'KB-031',
        title: 'Checkout service DB connection timeout after redeployment',
        similarity: 0.74,
        fix: 'pool_manager.drain_idle(); pool_manager.set_timeout(30000);',
        source: 'INC-811 · 1 month ago',
      },
      {
        id: 'KB-112',
        title: 'Slow query causing connection backlog on orders DB',
        similarity: 0.69,
        fix: 'CREATE INDEX CONCURRENTLY idx_orders_user_created ON orders (user_id, created_at);',
        source: 'INC-704 · 2 months ago',
      },
    ]
  }, [activeIncidentTitle])

  // Fetch relevant issues from Qdrant vector database for the active incident
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setIsLoadingQdrant(true)

    const query = `${activeIncidentTitle} ${sim.activeLogSnippet || ''}`.trim()

    searchQdrantKnowledge(query, undefined, 4)
      .then((docs) => {
        if (cancelled) return
        if (docs && docs.length > 0) {
          const mapped: HistoricalMatch[] = docs.map((doc, idx) => {
            // Extract code snippet or remediation from content
            let fix = doc.content
            const fixMatch = doc.content.match(/(?:remediation|solution|fix|playbook|script|command):\s*([\s\S]+?)(?:\n\n|\n[A-Z]|$)/i)
            if (fixMatch && fixMatch[1]) {
              fix = fixMatch[1].trim()
            } else if (doc.content.length > 220) {
              fix = doc.content.slice(0, 220) + '...'
            }

            return {
              id: doc.id ? `KB-${doc.id.slice(0, 6).toUpperCase()}` : `KB-Q${idx + 101}`,
              title: doc.title,
              similarity: doc.score !== undefined ? Number(doc.score.toFixed(2)) : 0.85,
              fix,
              source: `${(doc.source || 'Qdrant').toUpperCase()} · ${doc.domain || 'Knowledge Base'}`,
            }
          })
          setQdrantMatches(mapped)
          setSelectedMatch(0)
        } else {
          setQdrantMatches([])
        }
      })
      .catch((err) => {
        console.warn('Qdrant search in ResolverInteractionModal notice:', err)
        if (!cancelled) setQdrantMatches([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingQdrant(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, activeIncidentTitle, sim.activeLogSnippet])

  const activeMatches = useMemo(() => {
    return qdrantMatches.length > 0 ? qdrantMatches : fallbackMatches
  }, [qdrantMatches, fallbackMatches])

  const currentMatch = activeMatches[Math.min(selectedMatch, activeMatches.length - 1)] || fallbackMatches[0]

  const handleCloseModal = () => {
    onClose(resolvedEngineer.id)
  }

  const handleApplyResolution = async () => {
    setIsExecuting(true)
    ops.setHumanState(resolvedEngineer.id as any, 'resolving', activeIncidentId)
    ops.addManualActivity({
      stage: 'executing',
      eventType: 'SYSTEMS_ENGINEER_APPLYING_FIX',
      message: `${resolvedEngineer.name} applying fix: ${currentMatch.title}`,
      incidentId: activeIncidentId,
    })

    await new Promise(r => setTimeout(r, 700))
    ops.setStationState('playbook', 'processing', activeIncidentId, 'Executing systems engineer remediation')
    await new Promise(r => setTimeout(r, 600))
    ops.setStationState('playbook', 'done')
    ops.setStationState('verification', 'processing', activeIncidentId)
    ops.addManualActivity({
      stage: 'verifying',
      eventType: 'VERIFICATION_PASSED',
      message: '5/5 health checks valid: Service metrics stabilized',
      incidentId: activeIncidentId,
    })
    await new Promise(r => setTimeout(r, 500))
    ops.setStationState('verification', 'done')
    ops.setStationState('resolution', 'done')
    ops.setHumanState(resolvedEngineer.id as any, 'completed', activeIncidentId)
    ops.addManualActivity({
      stage: 'resolved',
      eventType: 'JIRA_SYNC_DONE',
      message: `Jira issue updated to DONE with ${resolvedEngineer.name} resolution notes`,
      incidentId: activeIncidentId,
    })

    // Notify QA Lead (Maya)
    setTimeout(() => {
      ops.setHumanState('curator', 'action_required', activeIncidentId)
      ops.addManualActivity({
        stage: 'knowledge_capture',
        eventType: 'KNOWLEDGE_REVIEW_REQUIRED',
        message: 'Resolution verified — Maya Lin notified for QA acceptance and provenance recording',
        incidentId: activeIncidentId,
      })
    }, 600)

    // Dispatch to live ORION-AI review if active
    if (ops.activeIncidentId) {
      submitOrionReviewDecision(
        ops.activeIncidentId,
        'APPROVE',
        currentMatch.fix,
        customNotes || currentMatch.title
      ).catch(() => {})
    }

    setIsExecuting(false)
    setIsDone(true)
    onResolveSuccess()
  }

  const handleEscalateToSRE = () => {
    if (ops.activeIncidentId) {
      submitOrionReviewDecision(
        ops.activeIncidentId,
        'MODIFY',
        'Escalated to DevOps / SRE Engineer Marcus Lee for deep tracing',
        customNotes || `Escalated by ${resolvedEngineer.name}`
      ).catch(() => {})
    }

    ops.setHumanState(resolvedEngineer.id as any, 'idle')
    ops.setHumanState('sre', 'alerted', activeIncidentId)
    ops.addManualActivity({
      stage: 'human_review',
      eventType: 'ESCALATED_TO_SRE',
      message: `${resolvedEngineer.name} escalated incident to DevOps / SRE Marcus Lee for operational tracing`,
      incidentId: activeIncidentId,
    })
    handleCloseModal()
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleCloseModal() }}>
      <SheetContent
        side="right"
        className="overflow-y-auto"
        style={{
          width: 480,
          background: 'var(--bg-surface)',
          border: 'none',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.8)',
        }}
        aria-label="Systems Engineer Interactive Terminal"
      >
        <SheetHeader className="pb-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                style={{
                  background: 'var(--color-mid-bg)',
                  color: 'var(--color-mid)',
                  border: '1px solid var(--color-mid-border)',
                }}
                className="p-1.5 rounded-lg"
              >
                <Code size={15} />
              </span>
              <div>
                <span style={{ color: 'var(--color-unknown)' }} className="text-[9px] font-black uppercase tracking-wider">
                  SYSTEMS ENGINEER WORKSTATION INTERACTION
                </span>
                <SheetTitle style={{ color: 'var(--text-primary)' }} className="text-sm font-bold">
                  {resolvedEngineer.name} — Systems Engineer ({resolvedEngineer.specialization})
                </SheetTitle>
              </div>
            </div>
            <span
              style={{
                background: 'var(--color-mid-bg)',
                color: 'var(--color-mid)',
                border: '1px solid var(--color-mid-border)',
              }}
              className="text-[9px] font-mono px-2 py-0.5 rounded font-bold"
            >
              MID ({activeSimilarity.toFixed(2)})
            </span>
          </div>
        </SheetHeader>

        <div className="py-3 flex flex-col gap-3.5">
          {/* 1. Incoming Client / Jira Ticket Card */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
            }}
            className="rounded-xl p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between text-[9px] font-mono">
              <span style={{ color: 'var(--color-processing)' }} className="font-bold">JIRA TICKET: {activeIncidentId}</span>
              <span style={{ color: 'var(--text-muted)' }}>Reporter: {activeClientName}</span>
            </div>
            <div style={{ color: 'var(--text-primary)' }} className="text-xs font-bold">
              {activeIncidentTitle}
            </div>
            <div style={{ color: 'var(--text-secondary)' }} className="text-[10px] leading-relaxed">
              {sim.activeLogSnippet || 'Client reported service latency spike and elevated error rate during production workloads.'}
            </div>
            <div
              style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
              className="flex items-center gap-2 pt-1 mt-1 text-[9px]"
            >
              <span style={{ color: 'var(--color-unknown)' }} className="font-bold">Priority: {activeSeverity}</span>
              <span>•</span>
              <span>Source: Client Production Ingress</span>
              <span>•</span>
              <span style={{ color: 'var(--color-mid)' }} className="font-mono">Similarity: {activeSimilarity.toFixed(2)} (Systems Engineer Assist)</span>
            </div>
          </div>

          {/* 2. Relevant Qdrant Vector Matches */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ color: 'var(--text-secondary)' }} className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Database size={11} style={{ color: 'var(--color-processing)' }} />
                <span>QDRANT VECTOR DATABASE RELEVANT MATCHES</span>
                {isLoadingQdrant && (
                  <RefreshCw size={9} className="animate-spin text-cyan-400" />
                )}
              </span>
              <span style={{ color: 'var(--color-processing)' }} className="text-[9px] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Qdrant Scan: {qdrantMatches.length > 0 ? `${qdrantMatches.length} matches` : 'Vector Active'}</span>
              </span>
            </div>

            {isLoadingQdrant ? (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 text-xs flex items-center gap-2 animate-pulse">
                <RefreshCw size={12} className="animate-spin text-cyan-400" />
                <span>Scanning Qdrant vector database for relevant issues...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {activeMatches.map((m, idx) => (
                  <button
                    key={`${m.id}-${idx}`}
                    onClick={() => setSelectedMatch(idx)}
                    style={{
                      background: selectedMatch === idx ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                      borderColor: selectedMatch === idx ? 'var(--color-unknown)' : 'var(--border-subtle)',
                      borderWidth: '1.5px',
                      borderStyle: 'solid',
                    }}
                    className="w-full text-left rounded-xl p-2.5 transition-all text-xs flex flex-col gap-1 cursor-pointer hover:border-slate-600"
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--color-unknown)' }} className="font-mono text-[9px] font-bold">{m.id}</span>
                      <span
                        style={{
                          background: 'var(--color-mid-bg)',
                          color: 'var(--color-mid)',
                        }}
                        className="font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded"
                      >
                        Similarity: {m.similarity}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-primary)' }} className="text-[11px] font-semibold">{m.title}</div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono">{m.source}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Selected Remediation Script / Code Box */}
          <div
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-default)',
            }}
            className="rounded-xl p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between text-[9px] font-mono">
              <span style={{ color: 'var(--text-secondary)' }} className="flex items-center gap-1">
                <Terminal size={10} style={{ color: 'var(--color-known)' }} /> REMEDIATION CODE TO EXECUTE
              </span>
              <span style={{ color: 'var(--color-known)' }} className="font-bold">Auto-Generated from {currentMatch.id}</span>
            </div>
            <pre
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
              className="text-[10px] font-mono p-2 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed"
            >
              {currentMatch.fix}
            </pre>
          </div>

          {/* 4. Systems Engineer Notes */}
          <div>
            <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-bold uppercase tracking-wider mb-1 block">
              SYSTEMS ENGINEER RESOLUTION NOTES (SYNCED TO JIRA)
            </span>
            <textarea
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              placeholder="E.g., Verified pool manager recovery, increased max_connections to 100, latency back to 18ms."
              rows={2}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              className="w-full rounded-xl p-2 text-xs outline-none focus:border-[var(--color-unknown)] resize-none font-sans"
            />
          </div>

          {/* 5. Action Buttons */}
          {isDone ? (
            <div
              style={{
                background: 'var(--color-known-bg)',
                borderColor: 'var(--color-known-border)',
                color: 'var(--color-known)',
              }}
              className="rounded-xl p-3 border flex items-center gap-2 text-xs font-semibold"
            >
              <CheckCircle size={16} className="flex-shrink-0" />
              <span>Resolution executed &amp; Jira updated to DONE. QA Lead notified for verification.</span>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleApplyResolution}
                disabled={isExecuting}
                style={{
                  background: 'linear-gradient(135deg, var(--color-unknown), var(--color-processing))',
                  color: '#140c11',
                  boxShadow: '0 4px 14px rgba(251,111,146,0.25)',
                }}
                className="flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 border-none cursor-pointer"
              >
                {isExecuting ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                {isExecuting ? 'Executing Fix...' : 'Apply Fix & Sync to Jira'}
              </Button>
              <Button
                onClick={handleEscalateToSRE}
                variant="outline"
                style={{
                  color: 'var(--color-unknown)',
                  borderColor: 'var(--border-strong)',
                  background: 'var(--bg-surface)',
                }}
                className="py-2 text-xs font-bold cursor-pointer"
              >
                Escalate SRE
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
