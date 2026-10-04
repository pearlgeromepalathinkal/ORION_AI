'use client'
import React, { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOperationsStore } from '@/store/operations-store'
import type { StationId, HumanRole } from '@/types'
import { HumanWorkstationCard } from './HumanWorkstationCard'
import { SoftwareStationCard } from './SoftwareStationCard'
import { RoutingDecisionPanel } from './RoutingDecisionPanel'
import { IncidentTokenDisplay } from './IncidentTokenDisplay'
import { ArrowDown, GitBranch, Cpu, UserCheck, ShieldCheck, Zap, Sparkles } from 'lucide-react'

export function FloorCanvas() {
  const ops = useOperationsStore()

  const handleHumanClick = useCallback((role: HumanRole) => {
    ops.setOpenHumanDrawer(role)
  }, [ops])

  const handleStationClick = useCallback((id: StationId) => {
    ops.setOpenStationDrawer(id)
  }, [ops])

  const isKnown = ops.currentRoute === 'known'
  const isMid = ops.currentRoute === 'mid'
  const isUnknown = ops.currentRoute === 'unknown'

  return (
    <div
      className="relative w-full h-full overflow-y-auto p-4 flex flex-col gap-4 select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 10%, #0c1424 0%, #060a12 100%)',
        minHeight: '100%',
      }}
      role="region"
      aria-label="ORION-AI interactive operations floor"
    >
      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 1: HUMAN OPERATIONS FLOOR (4 Workstations)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <UserCheck size={13} />
            </span>
            <div>
              <span className="text-xs font-black text-white tracking-wide">HUMAN OPERATIONS LAYER</span>
              <span className="text-[10px] text-slate-400 ml-2">Humans react only when confidence or policy requires judgment</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-purple-300 bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded-full">
            4 Interactive Stations
          </span>
        </div>

        {/* 4 Workstations Grid */}
        <div className="grid grid-cols-4 gap-3">
          <HumanWorkstationCard role="commander" onClick={handleHumanClick} />
          <HumanWorkstationCard role="developer" onClick={handleHumanClick} />
          <HumanWorkstationCard role="sre" onClick={handleHumanClick} />
          <HumanWorkstationCard role="curator" onClick={handleHumanClick} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PHYSICAL CONDUIT ARROWS: HUMAN ↔ AUTOMATION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-8 text-[9px] font-mono font-bold tracking-widest text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-600" />
          <span>INCIDENT INGESTION ➔ SEMANTIC PIPELINE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-purple-400">HUMAN ESCALATION & CURATION LOOP ↕</span>
        </div>
        <div className="flex items-center gap-2">
          <span>AUTOMATED VERIFICATION & RESOLUTION</span>
          <div className="w-2 h-2 rounded-full bg-slate-600" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 2: SOFTWARE AUTOMATION PIPELINE (Stations & Conduits)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Cpu size={13} />
            </span>
            <div>
              <span className="text-xs font-black text-white tracking-wide">SOFTWARE AUTOMATION PIPELINE</span>
              <span className="text-[10px] text-slate-400 ml-2">Runs continuously and deterministically via n8n & pgvector</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-blue-300 bg-blue-950/40 border border-blue-500/20 px-2 py-0.5 rounded-full">
            9 Automated Stations
          </span>
        </div>

        {/* Top Processing Pipeline: Active Token -> Intake -> Semantic -> Knowledge -> Routing */}
        <div className="flex items-center gap-2">
          <IncidentTokenDisplay />

          <div className="flex items-center text-slate-600 font-bold px-1" aria-hidden="true">
            ➔
          </div>

          <div className="flex items-center gap-2 flex-1">
            <SoftwareStationCard stationId="intake" onClick={handleStationClick} />
            <div className="text-slate-600 font-bold" aria-hidden="true">➔</div>
            <SoftwareStationCard stationId="semantic" onClick={handleStationClick} />
            <div className="text-slate-600 font-bold" aria-hidden="true">➔</div>
            <SoftwareStationCard stationId="knowledge_search" onClick={handleStationClick} />
            <div className="text-slate-600 font-bold" aria-hidden="true">➔</div>
            <SoftwareStationCard stationId="routing" onClick={handleStationClick} />
          </div>
        </div>

        {/* Routing Decision Bar */}
        <RoutingDecisionPanel />

        {/* Branching Illuminated Conduit Paths */}
        <div className="grid grid-cols-3 gap-3 my-1">
          {/* Path 1: Known -> Autonomous Playbook */}
          <div
            className={`rounded-xl p-3 flex flex-col justify-between transition-all duration-300 ${
              isKnown
                ? 'border-green-500/60 bg-green-950/30 shadow-lg shadow-green-500/10'
                : 'border-white/5 bg-slate-900/40'
            }`}
            style={{ border: '1.5px solid' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-green-400 flex items-center gap-1">
                <Zap size={10} /> PATH 1: KNOWN (≥ 0.85)
              </span>
              {isKnown && <span className="text-[8px] font-mono font-bold text-green-400 animate-pulse">● ACTIVE ROUTE</span>}
            </div>
            <div className="text-xs font-bold text-white mt-1">Autonomous Playbook VPN-AUTH-01</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Executes 5 remediation steps · 2.04s MTTR · No humans needed</div>
          </div>

          {/* Path 2: Mid -> Developer Assist */}
          <div
            className={`rounded-xl p-3 flex flex-col justify-between transition-all duration-300 ${
              isMid
                ? 'border-amber-500/60 bg-amber-950/30 shadow-lg shadow-amber-500/10'
                : 'border-white/5 bg-slate-900/40'
            }`}
            style={{ border: '1.5px solid' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                <GitBranch size={10} /> PATH 2: MID (0.55–0.84)
              </span>
              {isMid && <span className="text-[8px] font-mono font-bold text-amber-400 animate-pulse">● ACTIVE ROUTE</span>}
            </div>
            <div className="text-xs font-bold text-white mt-1">Systems Engineer (Shared Response Pool)</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Surfaces top historical solutions · Systems Engineer approves and executes remediation</div>
          </div>

          {/* Path 3: Unknown -> AI Diagnostics + SRE */}
          <div
            className={`rounded-xl p-3 flex flex-col justify-between transition-all duration-300 ${
              isUnknown
                ? 'border-red-500/60 bg-red-950/30 shadow-lg shadow-red-500/10'
                : 'border-white/5 bg-slate-900/40'
            }`}
            style={{ border: '1.5px solid' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-red-400 flex items-center gap-1">
                <Sparkles size={10} /> PATH 3: UNKNOWN (&lt; 0.55)
              </span>
              {isUnknown && <span className="text-[8px] font-mono font-bold text-red-400 animate-pulse">● ACTIVE ROUTE</span>}
            </div>
            <div className="text-xs font-bold text-white mt-1">AI Diagnostics + Marcus Lee (Tier-3)</div>
            <div className="text-[9px] text-slate-400 mt-0.5">GPT-4o stack trace scanner · Human diagnostic override</div>
          </div>
        </div>

        {/* Bottom Resolution Pipeline: Playbook / AI Diag -> Verification -> Resolution -> Knowledge Lab */}
        <div className="flex items-center gap-2 mt-1">
          <SoftwareStationCard stationId="playbook" onClick={handleStationClick} compact />
          <div className="text-slate-600 font-bold" aria-hidden="true">➔</div>
          <SoftwareStationCard stationId="ai_diagnostics" onClick={handleStationClick} compact />
          <div className="text-slate-600 font-bold" aria-hidden="true">➔</div>
          <SoftwareStationCard stationId="verification" onClick={handleStationClick} compact />
          <div className="text-slate-600 font-bold" aria-hidden="true">➔</div>
          <SoftwareStationCard stationId="resolution" onClick={handleStationClick} compact />
          <div className="text-slate-600 font-bold" aria-hidden="true">➔</div>
          <SoftwareStationCard stationId="knowledge_lab" onClick={handleStationClick} compact />
        </div>
      </div>
    </div>
  )
}
