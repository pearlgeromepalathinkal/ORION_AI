'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { FloorScene } from '@/pixi/FloorScene'
import { useIncidentSimulationEngine } from '@/store/incident-simulation-engine'
import { useHITLStore } from '@/store/hitl-store'
import { runOrionWorkflowSync } from '@/lib/orion-api'
import { ResolverInteractionModal } from './ResolverInteractionModal'
import { ClientJiraIngestionModal } from './ClientJiraIngestionModal'
import { OrionTerminal } from '../terminal/OrionTerminal'
import type { HumanRole, StationId } from '@/types'
import {
  Inbox, Play, RotateCcw, RefreshCw, CheckCircle2,
  Wifi, WifiOff, Maximize2, Terminal, ShieldAlert, Zap
} from 'lucide-react'

interface Props {
  onOpenHumanDrawer: (role: HumanRole) => void
  onOpenStationDrawer: (id: StationId) => void
}

export function PixiFloorCanvas({ onOpenHumanDrawer, onOpenStationDrawer }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const floorSceneRef = useRef<FloorScene | null>(null)
  const sim = useIncidentSimulationEngine()
  const activeHITL = useHITLStore((s) => s.activeHITL)

  const [isDevModalOpen,    setIsDevModalOpen]    = useState(false)
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false)
  const [isTerminalOpen,    setIsTerminalOpen]    = useState(false)
  const [isTriggeringHITL,  setIsTriggeringHITL]  = useState(false)

  // ── HITL REACTIVITY TO REAL WORKFLOWS ─────────────────────────────────────
  useEffect(() => {
    if (!floorSceneRef.current || !activeHITL) return

    const sc = floorSceneRef.current
    if (activeHITL.status === 'REQUIRED' || activeHITL.status === 'REVIEWING') {
      sc.setCharacterState('elena', 'alerted')
      sc.showCharacterBubble('elena', 'HITL REVIEW REQUIRED', 4500, 'alert')
      sc.walkCharacterToStation('elena', 'routing', 'Reviewing escalation...')
    } else if (activeHITL.status === 'DECISION_RECORDED') {
      sc.showCharacterBubble('elena', `DECISION: ${activeHITL.decision || 'RECORDED'}`, 3500, 'approval')
      sc.returnCharacterHome('elena')
      sc.setCharacterState('elena', 'idle')
    } else if (activeHITL.status === 'VERIFYING') {
      sc.showCharacterBubble('maya', '5-POINT HEALTH CHECKS', 3500, 'status')
      sc.walkCharacterToStation('maya', 'verification', 'Verifying...')
    } else if (activeHITL.status === 'COMPLETED') {
      sc.showCharacterBubble('elena', 'WORKFLOW RESOLVED', 3500, 'success')
      sc.returnCharacterHome('maya')
      sc.returnCharacterHome('elena')
    }
  }, [activeHITL?.status, activeHITL?.decision])

  // ── PIXI SCENE INITIALIZATION & OBSERVER REGISTRATION ──────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    let isCancelled = false

    const handleSelectEntity = (type: 'human' | 'station', id: string) => {
      if (type === 'human') onOpenHumanDrawer(id as HumanRole)
      else onOpenStationDrawer(id as StationId)
    }

    const floorScene = new FloorScene(containerRef.current, handleSelectEntity)
    floorSceneRef.current = floorScene
    floorScene.init().catch(err => {
      if (!isCancelled) console.error('Pixi init error:', err)
    })

    // Register Floor Scene as observer to the centralized Simulation Engine
    const unregisterObserver = sim.registerFloorObserver({
      onStationTransition: (station, incidentId) => {
        floorSceneRef.current?.animateIncidentTo(station, incidentId)
      },
      onRouteSelected: (route) => {
        floorSceneRef.current?.setTokenRoute(route)
      },
      onHumanStateChange: (human, state) => {
        floorSceneRef.current?.setCharacterState(human, state)
      },
      onHumanWalk: async (human, station, taskBubble) => {
        await floorSceneRef.current?.walkCharacterToStation(human, station, taskBubble)
      },
      onWalkCharacterToCharacter: async (src, dst, taskBubble) => {
        await floorSceneRef.current?.walkCharacterToCharacter(src, dst, taskBubble)
      },
      onHumanBubble: (human, text, type) => {
        floorSceneRef.current?.showCharacterBubble(human, text, 3800, type as import('@/pixi/SpeechBubbleOverlay').BubbleType | undefined)
      },
      onHumanReturnHome: async (human) => {
        await floorSceneRef.current?.returnCharacterHome(human)
      },
      onKnowledgeBubble: () => {
        floorSceneRef.current?.captureKnowledge()
      },
      onClientArrive: async (name, role) => {
        await floorSceneRef.current?.clientArrive(name, role)
      },
      onClientExit: async () => {
        await floorSceneRef.current?.clientExit()
      },
      onClientMail: async () => {
        await floorSceneRef.current?.sendClientMail()
      },
      onMailNotification: (title, incidentId, severity) => {
        floorSceneRef.current?.showMailNotification(title, incidentId, severity)
      },
      onDevOpsHighActivity: (active) => {
        floorSceneRef.current?.setDevOpsHighActivity(active)
      },
      onResetScene: () => {
        const sc = floorSceneRef.current
        if (sc) {
          sc.clearToken()
          sc.resetKbCounter()
          sc.setDevOpsHighActivity(false)
          sc.hideClientImmediate()
          const humanIds = ['elena', 'alex', 'sam', 'jordan', 'taylor', 'riley', 'marcus', 'maya', 'noah', 'ananya']
          humanIds.forEach(h => sc.setCharacterState(h, 'idle'))
          sc.autoFitToContainer()
        }
      },
    })

    return () => {
      isCancelled = true
      unregisterObserver()
      if (floorSceneRef.current) {
        floorSceneRef.current.destroy()
        floorSceneRef.current = null
      }
    }
  }, [onOpenHumanDrawer, onOpenStationDrawer, sim])

  // ── SCENARIO ACTIONS ──────────────────────────────────────────────────────
  const handleRunKnown = useCallback(() => {
    setIsDevModalOpen(false)
    sim.runKnownScenario()
  }, [sim])

  const handleRunMid = useCallback(() => {
    setIsDevModalOpen(false)
    sim.runMidScenario(() => {
      setIsDevModalOpen(true)
    })
  }, [sim])

  const handleRunUnknown = useCallback(() => {
    setIsDevModalOpen(false)
    sim.runUnknownScenario(() => {
      const state = useIncidentSimulationEngine.getState()
      useHITLStore.getState().setHITL({
        ticketId: state.incidentId || 'EPL-1088',
        status: 'REQUIRED',
        reviewType: 'UNKNOWN_DIAGNOSTIC',
        reviewStatus: 'PENDING',
        proposedAction: `AI Diagnostic Remediation: Investigate and remediate root cause for "${state.title || 'Novel Outage'}". Verified via multi-team SRE joint telemetry.`,
        riskScore: state.similarity ? Number((1 - state.similarity).toFixed(2)) : 0.72,
        riskLevel: 'HIGH',
        evidenceCount: 1,
      })
      useHITLStore.getState().setPanelOpen(true)
    })
  }, [sim])

  const handleRunFailure = useCallback(() => {
    setIsDevModalOpen(false)
    sim.runFailureScenario()
  }, [sim])

  const handleRunRandom = useCallback(() => {
    setIsDevModalOpen(false)
    sim.runRandomCorrectiveScenario(
      () => setIsDevModalOpen(true),
      () => sim.approveElenaSignoff()
    )
  }, [sim])

  const handleReplay = useCallback(() => {
    setIsDevModalOpen(false)
    sim.runReplayScenario()
  }, [sim])

  const handleReset = useCallback(() => {
    setIsDevModalOpen(false)
    setIsIngestModalOpen(false)
    sim.reset()
  }, [sim])

  const handleTriggerRealHITL = useCallback(async () => {
    setIsTriggeringHITL(true)
    try {
      const ticketId = `KAN-${Math.floor(1000 + Math.random() * 9000)}`
      floorSceneRef.current?.animateIncidentTo('intake', ticketId)
      await new Promise(r => setTimeout(r, 450))
      floorSceneRef.current?.animateIncidentTo('routing', ticketId)

      useHITLStore.getState().setHITL({
        ticketId,
        status: 'REQUIRED',
        reviewType: 'APPROVAL',
        reviewStatus: 'PENDING',
        proposedAction: 'High-risk database root privilege grant and audit log alteration requested.',
        riskScore: 0.95,
        riskLevel: 'CRITICAL',
        evidenceCount: 1,
      })
      useHITLStore.getState().setPanelOpen(true)

      // Call backend workflow endpoint asynchronously
      runOrionWorkflowSync({
        ticketId,
        issue: 'Need root database privileges. Grant me root db admin access and lock the audit control logs.',
        title: 'Emergency DB Root Access Request',
      }).catch(err => {
        console.warn('Real backend workflow notice:', err)
      })
    } finally {
      setIsTriggeringHITL(false)
    }
  }, [])

  return (
    <div className="relative w-full flex flex-col gap-2 select-none h-full min-h-0">
      {/* Human Decision Modal */}
      <ResolverInteractionModal
        isOpen={isDevModalOpen}
        onClose={(resolvedEngineerId) => {
          setIsDevModalOpen(false)
          floorSceneRef.current?.returnCharacterHome(resolvedEngineerId || 'jordan')
        }}
        onResolveSuccess={() => {
          setIsDevModalOpen(false)
          sim.approveHumanFix()
        }}
      />

      {/* Jira / Ingestion Modal */}
      <ClientJiraIngestionModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onIngest={(ticket) => {
          const override = {
            id: ticket.id,
            title: ticket.title,
            route: ticket.route,
            similarity: ticket.similarity,
            priority: ticket.priority,
            description: ticket.description,
            service: ticket.service || 'Production Microservice',
            category: (ticket.category || 'Backend') as any,
            clientName: ticket.clientName,
            clientRole: ticket.clientRole,
            logSnippet: ticket.logSnippet,
            rootCause: ticket.rootCause,
            resolution: ticket.resolution,
            latencyBefore: ticket.latencyBefore,
            latencyAfter: ticket.latencyAfter,
            errorRateBefore: ticket.errorRateBefore,
            errorRateAfter: ticket.errorRateAfter,
            saturationBefore: ticket.saturationBefore,
            saturationAfter: ticket.saturationAfter,
          }
          if (ticket.route === 'known') sim.runKnownScenario(override)
          else if (ticket.route === 'mid') {
            setIsDevModalOpen(false)
            sim.runMidScenario(() => setIsDevModalOpen(true), override)
          } else if (ticket.similarity < 0.35) {
            sim.runFailureScenario(override)
          } else {
            setIsDevModalOpen(false)
            sim.runUnknownScenario(() => {
              useHITLStore.getState().setHITL({
                ticketId: ticket.id || 'EPL-1088',
                status: 'REQUIRED',
                reviewType: 'UNKNOWN_DIAGNOSTIC',
                reviewStatus: 'PENDING',
                proposedAction: 'Apply deterministic lock ordering hotpatch across distributed database transactions & restart lock coordinator.',
                riskScore: 0.72,
                riskLevel: 'HIGH',
                evidenceCount: 1,
              })
              useHITLStore.getState().setPanelOpen(true)
            }, override)
          }
        }}
      />

      {/* ORION-AI Terminal (floating overlay) */}
      <OrionTerminal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        onViewOnFloor={(t) => {
          const assignStr = String(t.assignedHuman || '').toLowerCase()
          if (assignStr.includes('alex')) onOpenHumanDrawer('alex' as any)
          else if (assignStr.includes('sam')) onOpenHumanDrawer('sam' as any)
          else if (assignStr.includes('jordan') || assignStr.includes('david')) onOpenHumanDrawer('jordan' as any)
          else if (assignStr.includes('taylor')) onOpenHumanDrawer('taylor' as any)
          else if (assignStr.includes('riley')) onOpenHumanDrawer('riley' as any)
          else if (assignStr.includes('marcus')) onOpenHumanDrawer('marcus' as any)
          else if (assignStr.includes('maya')) onOpenHumanDrawer('maya' as any)
          else if (assignStr.includes('noah')) onOpenHumanDrawer('noah' as any)
          else if (assignStr.includes('ananya')) onOpenHumanDrawer('ananya' as any)
          else onOpenHumanDrawer('elena' as any)
        }}
      />

      {/* ── Compact Horizontal Control Strip ── */}
      <div
        className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border flex-shrink-0 overflow-x-auto whitespace-nowrap shadow-lg"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        {/* Left: Ingest / Mode */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIsIngestModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
            style={{ background: 'var(--color-unknown)', color: '#140c11' }}
          >
            <Inbox size={11} />
            <span>Ingest</span>
          </button>

          <button
            onClick={() => sim.setMode(sim.mode === 'LIVE' ? 'SIMULATION' : 'LIVE')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
            style={
              sim.mode === 'LIVE'
                ? { background: 'var(--color-known-bg)', border: '1px solid var(--color-known-border)', color: 'var(--color-known)' }
                : { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }
            }
          >
            {sim.mode === 'LIVE' ? <Wifi size={11} className="animate-pulse" /> : <WifiOff size={11} />}
            <span>{sim.mode === 'LIVE' ? 'Live' : 'Simulate'}</span>
          </button>
        </div>

        {/* Center: Scenarios */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleRunRandom}
            disabled={sim.isPlaying}
            title="Dispatch a random corrective maintenance issue from a new client"
            className="scenario-btn text-[10px] py-1 px-2 whitespace-nowrap flex items-center gap-1"
            style={{ background: 'var(--color-human-bg)', border: '1px solid var(--color-human-border)', color: 'var(--color-human)' }}
          >
            <span>🎲 Random Issue</span>
          </button>

          <button
            onClick={handleRunKnown}
            disabled={sim.isPlaying}
            className="scenario-btn known text-[10px] py-1 px-2 whitespace-nowrap"
          >
            <Play size={9} /> 1 · Known
          </button>

          <button
            onClick={handleRunMid}
            disabled={sim.isPlaying}
            className="scenario-btn mid text-[10px] py-1 px-2 whitespace-nowrap"
          >
            <Play size={9} /> 2 · Mid
          </button>

          <button
            onClick={handleRunUnknown}
            disabled={sim.isPlaying}
            className="scenario-btn unknown text-[10px] py-1 px-2 whitespace-nowrap"
          >
            <Play size={9} /> 3 · Unknown
          </button>

          <button
            onClick={handleRunFailure}
            disabled={sim.isPlaying}
            title="Graceful Failure — Insufficient Evidence"
            className="scenario-btn text-[10px] py-1 px-2 whitespace-nowrap flex items-center gap-1"
            style={{
              background: 'rgba(251,111,146,0.12)',
              borderColor: 'rgba(251,111,146,0.35)',
              color: 'var(--color-unknown)',
            }}
          >
            <ShieldAlert size={9} /> 4 · Fail
          </button>

          <button
            onClick={handleReplay}
            disabled={sim.isPlaying}
            className="scenario-btn text-[10px] py-1 px-2 whitespace-nowrap flex items-center gap-1"
            style={{
              background: 'linear-gradient(135deg, rgba(142,227,185,0.15), rgba(255,143,171,0.15))',
              borderColor: 'rgba(142,227,185,0.4)',
              color: 'var(--color-known)',
            }}
          >
            <RefreshCw size={9} className={sim.isPlaying ? 'animate-spin' : ''} />
            ↻ Replay
          </button>

          <button
            onClick={handleTriggerRealHITL}
            disabled={sim.isPlaying || isTriggeringHITL}
            title="Trigger Real Backend LangGraph HITL Escalation (KAN-38 Root Privileges)"
            className="scenario-btn text-[10px] py-1 px-2.5 whitespace-nowrap flex items-center gap-1 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(251,111,146,0.22), rgba(255,143,171,0.22))',
              borderColor: 'var(--color-unknown)',
              color: 'var(--text-primary)',
            }}
          >
            <ShieldAlert size={9} style={{ color: 'var(--color-unknown)' }} />
            <span>⚡ HITL (KAN-38)</span>
          </button>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => floorSceneRef.current?.autoFitToContainer()}
            title="Fit floor to canvas"
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <Maximize2 size={10} />
            <span>Fit</span>
          </button>

          <button
            onClick={handleReset}
            title="Reset scene"
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={10} />
            <span>Reset</span>
          </button>

          <button
            onClick={() => setIsTerminalOpen(v => !v)}
            title="ORION-AI Terminal"
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap"
            style={
              isTerminalOpen
                ? { background: 'var(--color-processing-bg)', border: '1px solid var(--color-processing-border)', color: 'var(--color-processing)' }
                : { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }
            }
          >
            <Terminal size={10} />
            <span>Terminal</span>
          </button>
        </div>
      </div>

      {/* Replay Banner */}
      {sim.replayBanner && (
        <div
          className="rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] font-medium flex-shrink-0 animate-fade-in"
          style={{
            background: 'var(--color-known-bg)',
            border: '1px solid var(--color-known-border)',
            color: 'var(--color-known)',
          }}
        >
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 size={13} className="flex-shrink-0" style={{ color: 'var(--color-known)' }} />
            <span className="truncate">{sim.replayBanner}</span>
          </div>
          <span
            className="font-mono text-[9px] px-2 py-0.5 rounded-full border flex-shrink-0"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--color-known-border)',
              color: 'var(--color-known)',
            }}
          >
            LEARNED · 0.41 ➔ 0.94
          </span>
        </div>
      )}

      {/* PixiJS 2D Engine Canvas */}
      <div
        ref={containerRef}
        className="w-full flex-1 min-h-[460px] rounded-2xl overflow-hidden relative shadow-2xl"
        style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)' }}
      />
    </div>
  )
}
