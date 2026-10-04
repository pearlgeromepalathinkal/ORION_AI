'use client'

import React, { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useOperationsStore } from '@/store/operations-store'
import { useFloorSceneStore } from '@/store/floor-scene-store'
import { ResolverInteractionModal } from './ResolverInteractionModal'
import { ClientJiraIngestionModal, IngestedTicket } from './ClientJiraIngestionModal'
import type { HumanRole, StationId } from '@/types'
import {
  Inbox, Play, RotateCcw, RefreshCw, CheckCircle2,
  ExternalLink, Sparkles, Send, ArrowRight, UserCheck,
  Check, Eye, Terminal, Cpu, Database, Brain, Search,
  GitBranch, Zap, Bot, ShieldCheck, CheckCircle, BookOpen,
  Server, Layers, Activity, AlertTriangle
} from 'lucide-react'

interface Props {
  onOpenHumanDrawer: (role: HumanRole) => void
  onOpenStationDrawer: (id: StationId) => void
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export function InteractiveOperationsFloor({ onOpenHumanDrawer, onOpenStationDrawer }: Props) {
  const ops = useOperationsStore()
  const scene = useFloorSceneStore()

  const [isDevModalOpen, setIsDevModalOpen] = useState(false)
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [replayBanner, setReplayBanner] = useState<string | null>(null)

  const systemsEngineer = ops.humans.find(h => (h.state === 'investigating' || h.state === 'alerted' || h.state === 'resolving') && ['alex', 'sam', 'jordan', 'taylor', 'riley', 'developer'].includes(h.id))
    || ops.humans.find(h => h.id === 'jordan')
    || ops.humans[1]
  const marcus = ops.humans.find(h => h.id === 'marcus' || h.id === 'sre') || ops.humans[6]
  const elena = ops.humans.find(h => h.id === 'elena' || h.id === 'commander') || ops.humans[0]
  const maya = ops.humans.find(h => h.id === 'maya' || h.id === 'curator') || ops.humans[7]

  const incidentId = ops.activeIncidentId || 'INC-1042'
  const incidentTitle = ops.activeIncidentTitle || 'VPN Authentication Failure'
  const priority = ops.activeIncidentPriority || 'P3'
  const similarity = ops.currentSimilarity !== null ? ops.currentSimilarity.toFixed(2) : '0.94'
  const route = ops.currentRoute || 'known'

  // ── INGEST CLIENT / JIRA TICKET WORKFLOW ──────────────────────────────────
  const handleIngestTicket = useCallback(async (ticket: IngestedTicket) => {
    setIsPlaying(true)
    setReplayBanner(null)
    ops.setActiveIncidentId(ticket.id)
    ops.setActiveIncidentTitle(ticket.title)
    ops.setActiveIncidentPriority(ticket.priority)
    ops.setCurrentSimilarity(ticket.similarity)
    ops.setCurrentRoute(ticket.route)
    ops.resetHumans()

    // Step 1: Intake (Top Center)
    scene.setToken({ visible: true, x: 50, y: 12, label: ticket.id, priority: ticket.priority })
    ops.setStationState('intake', 'processing', ticket.id, 'Receiving Incident')
    ops.addManualActivity({
      stage: 'received',
      eventType: 'CLIENT_ISSUE_RECEIVED',
      message: `${ticket.source} Ticket ${ticket.id} received: ${ticket.title}`,
      incidentId: ticket.id,
    })
    await delay(450)
    ops.setStationState('intake', 'done')

    // Step 2: Semantic Engine
    scene.setToken({ x: 33, y: 38 })
    ops.setStationState('semantic', 'processing', ticket.id, 'Analyzing...')
    ops.addManualActivity({
      stage: 'embedding',
      eventType: 'EMBEDDING_GENERATED',
      message: 'Generated 1536-dim vector via OpenAI text-embedding-3-large',
      incidentId: ticket.id,
    })
    await delay(500)
    ops.setStationState('semantic', 'done')

    // Step 3: Knowledge Search (pgvector)
    scene.setToken({ x: 44, y: 38 })
    ops.setStationState('knowledge_search', 'processing', ticket.id, 'Searching 1,248 solutions')
    ops.addManualActivity({
      stage: 'searching',
      eventType: 'KNOWLEDGE_SEARCH_COMPLETED',
      message: `pgvector search: similarity score ${ticket.similarity.toFixed(2)} (142ms latency)`,
      incidentId: ticket.id,
    })
    await delay(500)
    ops.setStationState('knowledge_search', 'done')

    // Step 4: Routing Engine
    scene.setToken({ x: 55, y: 38 })
    ops.setStationState('routing', 'processing', ticket.id, `Similarity: ${ticket.similarity.toFixed(2)}`)
    ops.addManualActivity({
      stage: 'routing',
      eventType: 'ROUTING_DECISION',
      message: `Confidence Route: ${ticket.route.toUpperCase()} (score ${ticket.similarity.toFixed(2)})`,
      incidentId: ticket.id,
    })
    await delay(450)
    ops.setStationState('routing', 'done')

    // Step 5: Route Branches
    if (ticket.route === 'known') {
      // Branch to Playbook Engine (Bottom Left)
      scene.setToken({ x: 23, y: 82 })
      ops.setStationState('playbook', 'processing', ticket.id, 'Executing Playbook')
      ops.addManualActivity({ stage: 'executing', eventType: 'PLAYBOOK_STARTED', message: 'Autonomous Playbook VPN-AUTH-01 executing (5 steps)', incidentId: ticket.id })
      await delay(600)
      ops.setStationState('playbook', 'done')

      // Verification Engine (Bottom Center-Left)
      scene.setToken({ x: 38, y: 82 })
      ops.setStationState('verification', 'processing', ticket.id, 'Verifying Resolution')
      ops.addManualActivity({ stage: 'verifying', eventType: 'VERIFICATION_PASSED', message: '5/5 health checks passed: Service Healthy, SLA Passed', incidentId: ticket.id })
      await delay(500)
      ops.setStationState('verification', 'done')

      // Resolution (Bottom Center-Right)
      scene.setToken({ x: 53, y: 82 })
      ops.setStationState('resolution', 'done', ticket.id, 'Incident Resolved')
      ops.addManualActivity({ stage: 'resolved', eventType: 'INCIDENT_RESOLVED', message: `Incident ${ticket.id} closed automatically in 2.04s — Zero human action needed`, incidentId: ticket.id })

      // Knowledge Lab
      scene.setToken({ x: 68, y: 82 })
      ops.setStationState('knowledge_lab', 'done', ticket.id, 'Capturing Resolution')
    } else if (ticket.route === 'mid') {
      // Branch directly UP into Systems Engineer Workstation (Top Right)
      scene.setToken({ x: 78, y: 15 })
      ops.setCurrentStage('human_review')
      ops.setHumanState('developer', 'alerted', ticket.id)
      ops.addManualActivity({
        stage: 'human_review',
        eventType: 'DEVELOPER_ALERTED',
        message: `${systemsEngineer.name} alerted: Mid-confidence incident requires Systems Engineer intervention (${systemsEngineer.specialization})`,
        incidentId: ticket.id,
      })
      await delay(500)
      ops.setHumanState('developer', 'investigating', ticket.id)
      ops.addManualActivity({
        stage: 'human_review',
        eventType: 'DEVELOPER_INVESTIGATING',
        message: `${systemsEngineer.name} investigating top-3 historical matches — Click [INSPECT & FIX]`,
        incidentId: ticket.id,
      })
      setIsDevModalOpen(true) // Automatically open interactive developer drawer!
    } else {
      // Branch to AI Diagnostics Robot (Center) -> Marcus Lee (DevOps / SRE)
      scene.setToken({ x: 53, y: 55 })
      ops.setStationState('ai_diagnostics', 'processing', ticket.id, 'Analyzing Root Cause')
      ops.addManualActivity({ stage: 'diagnosing', eventType: 'AI_DIAGNOSTICS_RUNNING', message: 'AI Diagnostic Engine analyzing stack trace patterns...', incidentId: ticket.id })
      await delay(600)
      ops.setStationState('ai_diagnostics', 'done')

      // Token travels to Marcus Lee's desk (Center-Left)
      scene.setToken({ x: 35, y: 55 })
      ops.setCurrentStage('human_review')
      ops.setHumanState('sre', 'alerted', ticket.id)
      await delay(500)
      ops.setHumanState('sre', 'investigating', ticket.id)
      ops.addManualActivity({
        stage: 'human_review',
        eventType: 'SRE_INVESTIGATION_STARTED',
        message: 'Marcus Lee investigating operational diagnostics — Click [START PROBE] on desk',
        incidentId: ticket.id,
      })
    }

    setIsPlaying(false)
  }, [ops, scene, systemsEngineer])

  // ── REPLAY CLOSED LOOP WORKFLOW ───────────────────────────────────────────
  const handleReplayClosedLoop = useCallback(async () => {
    setIsPlaying(true)
    const replayId = 'EPL-1067 (REPLAY)'
    setReplayBanner('REPLAY: ORION-AI learned from Systems Engineering & Verification. Recurring incident now matches at 0.94 similarity!')

    ops.setActiveIncidentId(replayId)
    ops.setActiveIncidentTitle('Database Connection Timeout (Learned Pattern)')
    ops.setActiveIncidentPriority('P2')
    ops.setCurrentSimilarity(0.94) // Learned!
    ops.setCurrentRoute('known')
    ops.resetHumans()

    // 1. Intake
    scene.setToken({ visible: true, x: 50, y: 12, label: replayId, priority: 'P2' })
    ops.setStationState('intake', 'processing')
    ops.addManualActivity({ stage: 'received', eventType: 'INCIDENT_REPLAYED', message: `Replaying ${replayId} — testing pgvector learning loop`, incidentId: replayId })
    await delay(450)
    ops.setStationState('intake', 'done')

    // 2. Semantic
    scene.setToken({ x: 33, y: 38 })
    ops.setStationState('semantic', 'processing')
    await delay(450)
    ops.setStationState('semantic', 'done')

    // 3. Knowledge Search (Matches at 0.94 because of previous approval!)
    scene.setToken({ x: 44, y: 38 })
    ops.setStationState('knowledge_search', 'processing')
    ops.addManualActivity({ stage: 'searching', eventType: 'KNOWLEDGE_MATCH_FOUND', message: 'pgvector MATCH: KB-1249 (similarity 0.94) — Learned from previous developer fix!', incidentId: replayId })
    await delay(500)
    ops.setStationState('knowledge_search', 'done')

    // 4. Routing Decision (Known >= 0.85)
    scene.setToken({ x: 55, y: 38 })
    ops.setStationState('routing', 'processing')
    ops.addManualActivity({ stage: 'routing', eventType: 'ROUTING_DECISION', message: 'Routing decision: 0.94 ≥ 0.85 → KNOWN (Automated Playbook Execution)', incidentId: replayId })
    await delay(450)
    ops.setStationState('routing', 'done')

    // 5. Automated Playbook
    scene.setToken({ x: 23, y: 82 })
    ops.setStationState('playbook', 'processing')
    await delay(600)
    ops.setStationState('playbook', 'done')

    // 6. Verification
    scene.setToken({ x: 38, y: 82 })
    ops.setStationState('verification', 'processing')
    await delay(450)
    ops.setStationState('verification', 'done')

    // 7. Auto-Resolved
    scene.setToken({ x: 53, y: 82 })
    ops.setStationState('resolution', 'done')
    ops.addManualActivity({ stage: 'resolved', eventType: 'CLOSED_LOOP_SUCCESS', message: `🎉 CLOSED-LOOP SUCCESS: Incident ${replayId} is now 100% automated in 2.04s!`, incidentId: replayId })

    setIsPlaying(false)
  }, [ops, scene])

  return (
    <div className="relative w-full flex flex-col gap-2 select-none">
      {/* ── Systems Engineer / Resolver Interaction Modal ── */}
      <ResolverInteractionModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
        onResolveSuccess={() => setIsDevModalOpen(false)}
      />

      {/* ── Client / Jira Issue Ingestion Modal ── */}
      <ClientJiraIngestionModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onIngest={handleIngestTicket}
      />

      {/* ── Top Scenario Controls Toolbar ── */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsIngestModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-sky-400 hover:bg-sky-300 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Inbox size={13} />
            [ 📥 Ingest Client / Jira Ticket ]
          </button>

          <div className="h-4 w-px bg-white/10" />

          <span className="text-[11px] text-slate-400">
            Interactive Operations Floor:
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleIngestTicket({
              id: 'INC-1042',
              title: 'VPN Authentication Failure',
              source: 'Prometheus',
              priority: 'P3',
              description: 'VPN auth daemon returning invalid handshake. Auto-matches Playbook VPN-AUTH-01.',
              similarity: 0.94,
              route: 'known',
            })}
            disabled={isPlaying}
            className={`scenario-btn known ${route === 'known' && !replayBanner ? 'active' : ''}`}
          >
            <Play size={10} /> 1 · Known (0.94 Auto)
          </button>

          <button
            onClick={() => handleIngestTicket({
              id: 'EPL-1067',
              title: 'Database Connection Timeout on Checkout API',
              source: 'Jira',
              priority: 'P2',
              description: 'Client Platform reported HTTP 504. Connection pool exhausted at 100% capacity.',
              similarity: 0.72,
              route: 'mid',
            })}
            disabled={isPlaying}
            className={`scenario-btn mid ${route === 'mid' ? 'active' : ''}`}
          >
            <Play size={10} /> 2 · Mid (Developer Assist)
          </button>

          <button
            onClick={() => handleIngestTicket({
              id: 'EPL-1088',
              title: 'Novel Deadlock on Payment Transactions',
              source: 'Client Webhook',
              priority: 'P1',
              description: 'Circular lock wait detected between orders and inventory tables.',
              similarity: 0.41,
              route: 'unknown',
            })}
            disabled={isPlaying}
            className={`scenario-btn unknown ${route === 'unknown' ? 'active' : ''}`}
          >
            <Play size={10} /> 3 · Unknown (AI + SRE)
          </button>

          <button
            onClick={handleReplayClosedLoop}
            disabled={isPlaying}
            className={`scenario-btn ${replayBanner ? 'active ring-2 ring-emerald-400' : ''}`}
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(168,85,247,0.15))',
              borderColor: 'rgba(34,197,94,0.4)',
              color: '#4ade80',
            }}
          >
            <RefreshCw size={10} className={isPlaying ? 'animate-spin' : ''} />
            ↻ Replay Closed Loop
          </button>

          <button
            onClick={() => {
              ops.resetAll()
              scene.resetScene()
              setReplayBanner(null)
            }}
            className="scenario-btn"
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      </div>

      {/* Closed-Loop Banner */}
      {replayBanner && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-emerald-300 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
            <span>{replayBanner}</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-300 bg-emerald-900/50 px-2.5 py-1 rounded-full border border-emerald-500/30">
            UNKNOWN (0.41) ➔ LEARNED ➔ KNOWN (0.94 AUTO RESOLVED)
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          THE REAL INTERACTIVE OPERATIONS ROOM (PURE CSS / SVG / DOM)
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-slate-800 p-4"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #0d172a 0%, #060913 70%, #020408 100%)',
          minHeight: '660px',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.6)',
        }}
        role="region"
        aria-label="ORION-AI Operations Floor Scene"
      >
        {/* Isometric Grid Floor */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(59,130,246,0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(59,130,246,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SVG CONDUIT PATHWAYS (Pulsing Laser Energy Wires)
            ═══════════════════════════════════════════════════════════════════ */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Main Spine from Left Incident Card -> Semantic -> Knowledge -> Routing */}
          <path d="M 19% 38% L 33% 38%" stroke="#a855f7" strokeWidth="3" strokeDasharray="4 4" />
          <path d="M 33% 38% L 44% 38%" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4 4" />
          <path d="M 44% 38% L 55% 38%" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 4" />

          {/* Branch 1: KNOWN (Green) -> Playbook -> Verification -> Resolution -> Knowledge Lab */}
          <path
            d="M 68% 30% Q 70% 50%, 48% 68% L 23% 82%"
            fill="none"
            stroke={route === 'known' ? '#22c55e' : 'rgba(255,255,255,0.1)'}
            strokeWidth={route === 'known' ? 4 : 2}
          />
          <line x1="23%" y1="82%" x2="38%" y2="82%" stroke="#22c55e" strokeWidth="3" strokeDasharray="4 4" />
          <line x1="38%" y1="82%" x2="53%" y2="82%" stroke="#22c55e" strokeWidth="3" strokeDasharray="4 4" />
          <line x1="53%" y1="82%" x2="68%" y2="82%" stroke="#22c55e" strokeWidth="3" strokeDasharray="4 4" />

          {/* Branch 2: MID (Amber) -> Rises directly into Systems Engineer Desk */}
          <path
            d="M 68% 40% Q 74% 30%, 78% 18%"
            fill="none"
            stroke={route === 'mid' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}
            strokeWidth={route === 'mid' ? 4 : 2}
            strokeDasharray={route === 'mid' ? 'none' : '4 4'}
          />

          {/* Branch 3: UNKNOWN (Red) -> Drops into AI Diagnostics & Marcus Lee */}
          <path
            d="M 68% 50% Q 62% 55%, 53% 55% L 35% 55%"
            fill="none"
            stroke={route === 'unknown' ? '#ef4444' : 'rgba(255,255,255,0.1)'}
            strokeWidth={route === 'unknown' ? 4 : 2}
            strokeDasharray={route === 'unknown' ? 'none' : '4 4'}
          />
        </svg>

        {/* ═══════════════════════════════════════════════════════════════════
            PHYSICAL INCIDENT TOKEN TRAVELING ACROSS THE SCENE
            ═══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {scene.token.visible && (
            <motion.div
              className="absolute z-40 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border shadow-2xl"
              style={{
                left: `${scene.token.x}%`,
                top: `${scene.token.y}%`,
                borderColor: route === 'known' ? '#22c55e' : route === 'mid' ? '#f59e0b' : '#ef4444',
                boxShadow: `0 0 20px ${route === 'known' ? 'rgba(34,197,94,0.7)' : route === 'mid' ? 'rgba(245,158,11,0.7)' : 'rgba(239,68,68,0.7)'}`,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="text-[10px] font-mono font-bold text-white">{scene.token.label}</span>
              <span className="text-[8px] font-bold px-1 rounded bg-white/10 text-white">{scene.token.priority}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════════
            TOP ROW: ELENA (COMMAND / GOVERNANCE) | ORION INTAKE | SYSTEMS ENGINEER POOL
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-start justify-between gap-4 z-10 relative">
          {/* Elena Rodriguez (Incident Manager) */}
          <div
            onClick={() => onOpenHumanDrawer('commander')}
            className="w-56 rounded-2xl p-2.5 bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all flex items-center gap-3 shadow-xl"
          >
            <div className="w-14 h-14 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-center p-1 flex-shrink-0">
              <Image src="/assets/humans/Coworking-amico.svg" alt="Elena" width={52} height={52} className="object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold uppercase tracking-wider text-purple-400">COMMANDER</span>
                <span className="text-[8px] text-green-400 font-bold">● Reviewing</span>
              </div>
              <div className="text-xs font-bold text-white truncate mt-0.5">Elena Rodriguez</div>
              <div className="text-[8px] font-mono text-slate-400">SLA: 18m · Escalations</div>
            </div>
          </div>

          {/* Intake System Machine */}
          <div
            onClick={() => onOpenStationDrawer('intake')}
            className={`w-52 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xl ${
              ops.stations.find(s => s.id === 'intake')?.state === 'processing'
                ? 'bg-sky-950/60 border-sky-400 shadow-sky-500/20'
                : 'bg-slate-900/80 border-slate-800 hover:border-sky-500/40'
            }`}
            style={{ border: '1.5px solid' }}
          >
            <div className="text-[8px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1 mb-0.5">
              <Cpu size={11} /> INTAKE SYSTEM
            </div>
            <div className="text-[11px] font-bold text-white">Receiving Incident</div>
            <div className="text-[8px] font-mono text-slate-400">POST /orion-ai/intake</div>
          </div>

          {/* Systems Engineer Workstation (Shared Response Pool) */}
          <div
            onClick={() => setIsDevModalOpen(true)}
            className={`w-64 rounded-2xl p-2.5 transition-all flex flex-col gap-1.5 cursor-pointer shadow-xl ${
              systemsEngineer.state === 'investigating' || systemsEngineer.state === 'alerted'
                ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40 shadow-2xl shadow-amber-500/30 animate-pulse'
                : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50'
            }`}
            style={{ border: '1.5px solid' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400">SYSTEMS ENGINEER</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                systemsEngineer.state === 'investigating' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
              }`}>
                {systemsEngineer.state === 'investigating' ? '● Remediating' : '● Available'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-14 h-14 rounded-xl bg-amber-950/40 border border-amber-500/20 flex items-center justify-center p-1 flex-shrink-0">
                <Image src="/assets/humans/Developer activity-cuate.svg" alt="Systems Engineer" width={52} height={52} className="object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{systemsEngineer.name}</div>
                <div className="text-[9px] text-slate-400 truncate">Systems Engineer</div>
                <div className="text-[8px] text-amber-300 font-mono mt-0.5">{systemsEngineer.specialization || 'Network & Connectivity'}</div>
              </div>
            </div>

            {/* In-Card Interactive Action Button when Investigating */}
            {systemsEngineer.state === 'investigating' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDevModalOpen(true)
                }}
                className="w-full py-1 bg-amber-400 hover:bg-amber-300 text-black text-[9px] font-black rounded-lg flex items-center justify-center gap-1 shadow-md"
              >
                <Terminal size={10} /> [ INSPECT & FIX INCIDENT ]
              </button>
            ) : (
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[8px] text-slate-400">
                <span>Click to open engineer console</span>
                <ArrowRight size={9} />
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            MIDDLE ROW: INCIDENT CARD | SEMANTIC | KNOWLEDGE | ROUTING | BRANCHES
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-3 my-10 z-10 relative">
          {/* Active Incident Card (Left) */}
          <div className="w-56 rounded-2xl p-3 bg-purple-950/40 border border-purple-500/50 shadow-2xl flex flex-col gap-1">
            <div className="font-mono text-xs font-black text-purple-400">{incidentId}</div>
            <div className="text-[11px] font-bold text-white leading-tight truncate">{incidentTitle}</div>
            <div className="text-[9px] text-slate-400">Priority: Medium</div>
            <div className="text-[9px] text-slate-400">Source: Prometheus / Jira</div>
            <div className="text-[8px] font-mono text-purple-300 pt-1 border-t border-purple-500/20">11:42:01 AM</div>
          </div>

          {/* Semantic Engine (Brain) */}
          <div
            onClick={() => onOpenStationDrawer('semantic')}
            className={`w-44 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xl ${
              ops.stations.find(s => s.id === 'semantic')?.state === 'processing'
                ? 'bg-purple-950/60 border-purple-400 shadow-purple-500/20'
                : 'bg-slate-900/80 border-slate-800 hover:border-purple-500/40'
            }`}
            style={{ border: '1.5px solid' }}
          >
            <div className="text-[8px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1 mb-0.5">
              <Brain size={11} /> SEMANTIC ENGINE
            </div>
            <div className="text-[10px] font-bold text-white">Analyzing...</div>
            <div className="text-[8px] font-mono text-slate-400">1536 Dimensions</div>
          </div>

          {/* Knowledge Search (pgvector) */}
          <div
            onClick={() => onOpenStationDrawer('knowledge_search')}
            className={`w-48 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xl ${
              ops.stations.find(s => s.id === 'knowledge_search')?.state === 'processing'
                ? 'bg-blue-950/60 border-blue-400 shadow-blue-500/20'
                : 'bg-slate-900/80 border-slate-800 hover:border-blue-500/40'
            }`}
            style={{ border: '1.5px solid' }}
          >
            <div className="text-[8px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1 mb-0.5">
              <Search size={11} /> KNOWLEDGE SEARCH
            </div>
            <div className="text-[10px] font-bold text-white">Searching 1,248 solutions</div>
            <div className="text-[8px] font-mono text-slate-400">pgvector Cosine</div>
          </div>

          {/* Routing Engine (Lightning) */}
          <div
            onClick={() => onOpenStationDrawer('routing')}
            className="w-44 rounded-2xl p-2.5 bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xl"
          >
            <div className="text-[8px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 mb-0.5">
              <Zap size={11} /> ROUTING ENGINE
            </div>
            <div className="text-[10px] font-bold text-white">Similarity: {similarity}</div>
            <div className="text-[8px] font-mono text-slate-400">Confidence Logic</div>
          </div>

          {/* 3 Decision Badges */}
          <div className="flex flex-col gap-1.5 w-48">
            <div className={`px-2.5 py-1 rounded-xl flex items-center justify-between border ${
              route === 'known' ? 'bg-green-950/60 border-green-500/80 text-green-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'
            }`}>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold">KNOWN ≥ 0.85</span>
                <span className="text-[7px]">Auto Resolve</span>
              </div>
              {route === 'known' && <span className="text-[8px] font-bold text-green-400">Active</span>}
            </div>

            <div className={`px-2.5 py-1 rounded-xl flex items-center justify-between border ${
              route === 'mid' ? 'bg-amber-950/60 border-amber-500/80 text-amber-300 ring-2 ring-amber-400/30' : 'bg-slate-900/40 border-slate-800 text-slate-500'
            }`}>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold">MID 0.55 - 0.84</span>
                <span className="text-[7px]">Developer Assist</span>
              </div>
              {route === 'mid' && <span className="text-[8px] font-bold text-amber-400">Active</span>}
            </div>

            <div className={`px-2.5 py-1 rounded-xl flex items-center justify-between border ${
              route === 'unknown' ? 'bg-red-950/60 border-red-500/80 text-red-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'
            }`}>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold">UNKNOWN &lt; 0.55</span>
                <span className="text-[7px]">AI Diagnostics</span>
              </div>
              {route === 'unknown' && <span className="text-[8px] font-bold text-red-400">Active</span>}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CHARACTERS ROW (Marcus Lee, Maya Lin, AI Diagnostics, QA Lab)
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-3 my-6 z-10 relative">
          {/* Marcus Lee (DevOps / SRE Engineer) */}
          <div
            onClick={() => onOpenHumanDrawer('sre')}
            className={`w-48 rounded-2xl p-2 flex items-center gap-2 cursor-pointer shadow-lg transition-all ${
              marcus.state === 'investigating' || marcus.state === 'alerted'
                ? 'bg-red-950/60 border-red-500 ring-2 ring-red-400/30'
                : 'bg-slate-900/80 border-slate-800 hover:border-red-500/40'
            }`}
            style={{ border: '1.5px solid' }}
          >
            <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-500/20 flex items-center justify-center p-1 flex-shrink-0">
              <Image src="/assets/humans/Software engineer-amico.svg" alt="Marcus Lee" width={34} height={34} className="object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[8px] text-red-400 font-bold">
                {marcus.state === 'investigating' ? '● Probing' : '● Available'}
              </div>
              <div className="text-[10px] font-bold text-white truncate">Marcus Lee</div>
              <div className="text-[7px] text-slate-400 truncate">DevOps / SRE Engineer</div>
            </div>
          </div>

          {/* Maya Lin (QA Lead) */}
          <div
            onClick={() => onOpenHumanDrawer('curator')}
            className={`w-48 rounded-2xl p-2 flex items-center gap-2 cursor-pointer shadow-lg transition-all ${
              maya.state === 'action_required' || maya.state === 'reviewing'
                ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-400/30'
                : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
            }`}
            style={{ border: '1.5px solid' }}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center p-1 flex-shrink-0">
              <Image src="/assets/humans/In the office-amico.svg" alt="Maya Lin" width={34} height={34} className="object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[8px] text-emerald-400 font-bold">
                {maya.state === 'action_required' ? '✨ QA Review' : '● Available'}
              </div>
              <div className="text-[10px] font-bold text-white truncate">Maya Lin</div>
              <div className="text-[7px] text-slate-400 truncate">QA Lead</div>
            </div>
          </div>

          {/* AI Diagnostic Engine (Robot) */}
          <div
            onClick={() => onOpenStationDrawer('ai_diagnostics')}
            className="w-48 rounded-2xl p-2 bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
              <Bot size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[8px] font-bold uppercase tracking-wider text-purple-400">AI DIAGNOSTICS</div>
              <div className="text-[10px] font-bold text-white truncate">Analyzing Root Cause</div>
              <div className="text-[7px] text-slate-400">Telemetry & Stack Reasoning</div>
            </div>
          </div>

          {/* QA & Verification Lab (Noah Williams & Ananya Sen) */}
          <div
            onClick={() => onOpenHumanDrawer('curator')}
            className="w-48 rounded-2xl p-2 bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-950/40 border border-teal-500/20 flex items-center justify-center text-teal-400 flex-shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[8px] font-bold uppercase tracking-wider text-teal-400">QA VERIFICATION LAB</div>
              <div className="text-[10px] font-bold text-white truncate">Noah & Ananya</div>
              <div className="text-[7px] text-slate-400 truncate">Functional & Automated Checks</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            BOTTOM ROW: PLAYBOOK ➔ VERIFICATION ➔ RESOLUTION ➔ KNOWLEDGE LAB
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-4 gap-4 mt-6 z-10 relative">
          {/* 1. Playbook Engine */}
          <div
            onClick={() => onOpenStationDrawer('playbook')}
            className="rounded-2xl p-2.5 bg-slate-900/80 border border-slate-800 hover:border-green-500/40 flex items-center gap-2.5 cursor-pointer shadow-xl"
          >
            <div className="w-8 h-8 rounded-xl bg-green-950/60 border border-green-500/30 flex items-center justify-center text-green-400 flex-shrink-0">
              <Terminal size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[8px] font-bold uppercase tracking-wider text-green-400">PLAYBOOK ENGINE</div>
              <div className="text-[10px] font-bold text-white truncate">Executing Playbook</div>
              <div className="text-[7px] text-slate-400">VPN-AUTH-01</div>
            </div>
          </div>

          {/* 2. Verification Engine */}
          <div
            onClick={() => onOpenStationDrawer('verification')}
            className="rounded-2xl p-2.5 bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 flex items-center gap-2.5 cursor-pointer shadow-xl"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <ShieldCheck size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">VERIFICATION ENGINE</div>
              <div className="text-[10px] font-bold text-white truncate">Verifying Resolution</div>
              <div className="text-[7px] text-slate-400">5/5 Health Checks</div>
            </div>
          </div>

          {/* 3. Resolution */}
          <div
            onClick={() => onOpenStationDrawer('resolution')}
            className="rounded-2xl p-2.5 bg-slate-900/80 border border-slate-800 hover:border-green-500/40 flex items-center gap-2.5 cursor-pointer shadow-xl"
          >
            <div className="w-8 h-8 rounded-xl bg-green-950/60 border border-green-500/30 flex items-center justify-center text-green-400 flex-shrink-0">
              <CheckCircle size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[8px] font-bold uppercase tracking-wider text-green-400">RESOLUTION</div>
              <div className="text-[10px] font-bold text-white truncate">Incident Resolved</div>
              <div className="text-[7px] text-slate-400">Jira Ticket Synced</div>
            </div>
          </div>

          {/* 4. Knowledge Lab */}
          <div
            onClick={() => onOpenStationDrawer('knowledge_lab')}
            className="rounded-2xl p-2.5 bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 flex items-center gap-2.5 cursor-pointer shadow-xl"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
              <BookOpen size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[8px] font-bold uppercase tracking-wider text-purple-400">KNOWLEDGE LAB</div>
              <div className="text-[10px] font-bold text-white truncate">Capturing Resolution</div>
              <div className="text-[7px] text-slate-400">pgvector Indexing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
