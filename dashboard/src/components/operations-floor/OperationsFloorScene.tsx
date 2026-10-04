'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useOperationsStore } from '@/store/operations-store'
import { useFloorSceneStore } from '@/store/floor-scene-store'
import type { HumanRole, StationId } from '@/types'
import {
  Cpu, Brain, Search, GitBranch, Zap, Bot, ShieldCheck,
  CheckCircle, Play, Sparkles, ArrowRight, Check,
} from 'lucide-react'

interface Props {
  onOpenHumanDrawer: (role: HumanRole) => void
  onOpenStationDrawer: (id: StationId) => void
}

// ── Pastel Design Palette ──────────────────────────────────────────────
const P = {
  bg:       '#1e1d1b',
  surface:  '#272521',
  elevated: '#302e2b',
  border:   'rgba(210,190,160,0.12)',

  sage:        '#7dba8c',
  sageBg:      'rgba(125,186,140,0.10)',
  sageBdr:     'rgba(125,186,140,0.28)',

  periwinkle:    '#8baad4',
  periwinkleBg:  'rgba(139,170,212,0.10)',
  periwinkleBdr: 'rgba(139,170,212,0.28)',

  amber:     '#e0a96d',
  amberBg:   'rgba(224,169,109,0.10)',
  amberBdr:  'rgba(224,169,109,0.28)',

  rose:      '#d4847a',
  roseBg:    'rgba(212,132,122,0.10)',
  roseBdr:   'rgba(212,132,122,0.28)',

  lilac:     '#b49fcf',
  lilacBg:   'rgba(180,159,207,0.10)',
  lilacBdr:  'rgba(180,159,207,0.28)',

  gold:      '#c9a84c',
  goldBg:    'rgba(201,168,76,0.10)',
  goldBdr:   'rgba(201,168,76,0.28)',

  textPrimary:   '#f0ebe3',
  textSecondary: '#b8ad9e',
  textMuted:     '#7a6f62',
}

function agentCard(active: boolean, bg: string, bdr: string) {
  return {
    background: active ? bg : P.surface,
    border: `1.5px solid ${active ? bdr : P.border}`,
    boxShadow: active ? `0 8px 32px ${bg}` : 'none',
    transition: 'all 0.3s ease',
  }
}
function stationCard(active: boolean, bg: string, bdr: string) {
  return {
    background: active ? bg : P.elevated,
    border: `1.5px solid ${active ? bdr : P.border}`,
    boxShadow: active ? `0 6px 20px ${bg}` : 'none',
    transition: 'all 0.3s ease',
  }
}

export function OperationsFloorScene({ onOpenHumanDrawer, onOpenStationDrawer }: Props) {
  const ops   = useOperationsStore()
  const scene = useFloorSceneStore()
  const [_hovered, setHovered] = useState<string | null>(null)

  const elena = ops.humans.find(h => h.id === 'elena' || h.id === 'commander') || ops.humans[0]
  const systemsEngineer = ops.humans.find(h => (h.state === 'investigating' || h.state === 'alerted' || h.state === 'resolving') && ['alex', 'sam', 'jordan', 'taylor', 'riley', 'developer'].includes(h.id))
    || ops.humans.find(h => h.id === 'jordan')
    || ops.humans[1]
  const marcus = ops.humans.find(h => h.id === 'marcus' || h.id === 'sre') || ops.humans[6]
  const maya = ops.humans.find(h => h.id === 'maya' || h.id === 'curator') || ops.humans[7]

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        background: `radial-gradient(ellipse at 50% 10%, #2a2620 0%, ${P.bg} 70%)`,
        minHeight: '760px',
        border: `1px solid ${P.border}`,
        boxShadow: `inset 0 0 80px rgba(0,0,0,0.35), 0 20px 50px rgba(0,0,0,0.25)`,
      }}
      role="region"
      aria-label="ORION-AI Virtual Operations Floor"
    >
      {/* Warm office grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
        backgroundImage: `linear-gradient(to right, rgba(210,190,160,0.25) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(210,190,160,0.25) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,170,212,0.04) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/3 left-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(180,159,207,0.04) 0%, transparent 70%)' }} />

      {/* Left rack */}
      <div className="absolute top-8 left-3 w-10 rounded-xl p-2 flex flex-col gap-1 pointer-events-none hidden md:flex"
        style={{ background: P.surface, border: `1px solid ${P.border}` }}>
        <div className="text-[6px] font-mono text-center font-bold mb-0.5" style={{ color: P.textMuted }}>SRV-A</div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-3 rounded flex items-center justify-between px-1"
            style={{ background: P.bg, border: `1px solid ${P.border}` }}>
            <span className="w-1 h-1 rounded-full" style={{ background: i % 3 === 0 ? P.sage : P.periwinkle }} />
            <span className="text-[5px] font-mono" style={{ color: P.textMuted }}>{i}</span>
          </div>
        ))}
      </div>

      {/* Right rack */}
      <div className="absolute top-8 right-3 w-10 rounded-xl p-2 flex flex-col gap-1 pointer-events-none hidden md:flex"
        style={{ background: P.surface, border: `1px solid ${P.border}` }}>
        <div className="text-[6px] font-mono text-center font-bold mb-0.5" style={{ color: P.textMuted }}>SRV-B</div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-3 rounded flex items-center justify-between px-1"
            style={{ background: P.bg, border: `1px solid ${P.border}` }}>
            <span className="w-1 h-1 rounded-full" style={{ background: i % 2 === 0 ? P.lilac : P.amber }} />
            <span className="text-[5px] font-mono" style={{ color: P.textMuted }}>{i}</span>
          </div>
        ))}
      </div>

      {/* SVG pipeline paths */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Spine */}
        <line x1="50%" y1="120" x2="50%" y2="168" stroke={P.periwinkle} strokeWidth="2" strokeDasharray="5 4" opacity="0.35"/>
        <line x1="50%" y1="228" x2="50%" y2="276" stroke={P.lilac}      strokeWidth="2" strokeDasharray="5 4" opacity="0.35"/>
        <line x1="50%" y1="336" x2="50%" y2="386" stroke={P.periwinkle} strokeWidth="2" strokeDasharray="5 4" opacity="0.35"/>
        {/* Branches */}
        <path d="M 50% 430 Q 34% 462, 21% 500" fill="none"
          stroke={ops.currentRoute === 'known'   ? P.sage   : P.border}
          strokeWidth={ops.currentRoute === 'known'   ? 3 : 1.5}
          strokeDasharray={ops.currentRoute === 'known'   ? 'none' : '5 4'} />
        <path d="M 50% 430 Q 62% 320, 78% 175" fill="none"
          stroke={ops.currentRoute === 'mid'     ? P.amber  : P.border}
          strokeWidth={ops.currentRoute === 'mid'     ? 3 : 1.5}
          strokeDasharray={ops.currentRoute === 'mid'     ? 'none' : '5 4'} />
        <path d="M 50% 430 Q 68% 462, 80% 500" fill="none"
          stroke={ops.currentRoute === 'unknown' ? P.rose   : P.border}
          strokeWidth={ops.currentRoute === 'unknown' ? 3 : 1.5}
          strokeDasharray={ops.currentRoute === 'unknown' ? 'none' : '5 4'} />
        {/* Bottom convergence */}
        <line x1="21%" y1="570" x2="42%" y2="594" stroke={P.sage} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.3"/>
        <line x1="80%" y1="570" x2="58%" y2="594" stroke={P.rose} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.3"/>
        <line x1="50%" y1="644" x2="50%" y2="670" stroke={P.sage} strokeWidth="2" opacity="0.35"/>
      </svg>

      {/* Animated incident token */}
      <AnimatePresence>
        {scene.token.visible && (
          <motion.div
            className="absolute z-40 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              left: `${scene.token.x}%`, top: `${scene.token.y}%`,
              background: P.elevated,
              border: `1.5px solid ${ops.currentRoute === 'known' ? P.sageBdr : ops.currentRoute === 'mid' ? P.amberBdr : P.roseBdr}`,
              boxShadow: `0 0 20px ${ops.currentRoute === 'known' ? P.sageBg : ops.currentRoute === 'mid' ? P.amberBg : P.roseBg}`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <span className="w-2 h-2 rounded-full animate-ping"
              style={{ background: ops.currentRoute === 'known' ? P.sage : ops.currentRoute === 'mid' ? P.amber : P.rose }} />
            <span className="text-[10px] font-mono font-bold" style={{ color: P.textPrimary }}>{scene.token.label}</span>
            <span className="text-[8px] font-black px-1.5 rounded"
              style={{ background: scene.token.priority === 'P1' ? P.roseBg : P.amberBg,
                       color: scene.token.priority === 'P1' ? P.rose : P.amber }}>
              {scene.token.priority}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOP ROW: Elena (Incident Manager) | ORION Intake | Systems Engineer Pool ═══ */}

      {/* Elena Rodriguez — Incident Manager & HITL Authority */}
      <div onClick={() => onOpenHumanDrawer('commander')}
        onMouseEnter={() => setHovered('elena')} onMouseLeave={() => setHovered(null)}
        className="absolute top-5 left-16 md:left-20 w-56 rounded-2xl p-3 flex flex-col gap-2 cursor-pointer"
        style={agentCard(elena.state === 'reviewing' || elena.state === 'alerted', P.lilacBg, P.lilacBdr)}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black tracking-widest" style={{ color: P.lilac }}>COMMAND / GOVERNANCE</span>
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: elena.state === 'idle' ? P.elevated : P.lilacBg,
                     color: elena.state === 'idle' ? P.textMuted : P.lilac,
                     border: `1px solid ${elena.state === 'idle' ? P.border : P.lilacBdr}` }}>
            {elena.state === 'idle' ? '● STANDBY' : `● ${elena.state.toUpperCase()}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center p-1 flex-shrink-0"
            style={{ background: P.lilacBg, border: `1px solid ${P.lilacBdr}` }}>
            <Image src="/assets/humans/Coworking-amico.svg" alt="Elena" width={58} height={58} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold" style={{ color: P.textPrimary }}>Elena Rodriguez</div>
            <div className="text-[9px]" style={{ color: P.textSecondary }}>Incident Manager</div>
            <div className="text-[8px] font-mono mt-1" style={{ color: P.lilac }}>HITL Authority · Escalations</div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1.5 text-[9px]"
          style={{ borderTop: `1px solid ${P.border}`, color: P.textMuted }}>
          <span>Click to open command console</span><ArrowRight size={10} />
        </div>
      </div>

      {/* ORION Intake Ingestion Station */}
      <div onClick={() => onOpenStationDrawer('intake')}
        className="absolute top-5 left-1/2 -translate-x-1/2 w-52 rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer"
        style={stationCard(ops.stations.find(s => s.id === 'intake')?.state === 'processing', P.periwinkleBg, P.periwinkleBdr)}>
        <div className="flex items-center gap-1.5 mb-1 text-[8px] font-black tracking-widest" style={{ color: P.periwinkle }}>
          <Cpu size={12} /> ORION INTAKE
        </div>
        <div className="text-[11px] font-mono font-bold" style={{ color: P.textPrimary }}>POST /orion-ai/intake</div>
        <div className="text-[8px] mt-0.5" style={{ color: P.textSecondary }}>Ticket Ingestion & Normalization</div>
      </div>

      {/* Systems Engineer Workstation (Shared Response Pool) */}
      <div onClick={() => onOpenHumanDrawer('developer')}
        onMouseEnter={() => setHovered('systemsEngineer')} onMouseLeave={() => setHovered(null)}
        className="absolute top-5 right-16 md:right-20 w-56 rounded-2xl p-3 flex flex-col gap-2 cursor-pointer"
        style={agentCard(systemsEngineer.state === 'investigating' || systemsEngineer.state === 'alerted', P.amberBg, P.amberBdr)}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black tracking-widest" style={{ color: P.amber }}>SYSTEMS ENGINEERING POOL</span>
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: systemsEngineer.state === 'idle' ? P.elevated : systemsEngineer.state === 'investigating' ? P.amberBg : P.sageBg,
                     color: systemsEngineer.state === 'idle' ? P.textMuted : systemsEngineer.state === 'investigating' ? P.amber : P.sage,
                     border: `1px solid ${systemsEngineer.state === 'idle' ? P.border : systemsEngineer.state === 'investigating' ? P.amberBdr : P.sageBdr}` }}>
            {systemsEngineer.state === 'idle' ? '● STANDBY' : systemsEngineer.state === 'investigating' ? '⬡ REMEDIATING' : systemsEngineer.state === 'approved' ? '✓ APPROVED' : `● ${systemsEngineer.state.toUpperCase()}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center p-1 flex-shrink-0"
            style={{ background: P.amberBg, border: `1px solid ${P.amberBdr}` }}>
            <Image src="/assets/humans/Developer activity-cuate.svg" alt="Systems Engineer" width={58} height={58} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold" style={{ color: P.textPrimary }}>{systemsEngineer.name}</div>
            <div className="text-[9px]" style={{ color: P.textSecondary }}>Systems Engineer</div>
            <div className="text-[8px] font-mono mt-1" style={{ color: P.amber }}>{systemsEngineer.specialization || 'Network & Connectivity'}</div>
          </div>
        </div>
        {systemsEngineer.state === 'investigating' ? (
          <button onClick={(e) => {
            e.stopPropagation()
            ops.setHumanState('developer', 'approved', ops.activeIncidentId ?? undefined)
            ops.addManualActivity({ stage: 'executing', eventType: 'DEVELOPER_PLAN_APPROVED',
              message: `${systemsEngineer.name} approved plan — executing remediation playbook`,
              incidentId: ops.activeIncidentId ?? 'INC-1067' })
            ops.setStationState('playbook', 'processing', ops.activeIncidentId ?? undefined, 'Executing approved remediation')
            setTimeout(() => {
              ops.setStationState('verification', 'processing')
              setTimeout(() => {
                ops.setStationState('verification', 'done')
                ops.setStationState('resolution', 'done')
                ops.setHumanState('curator', 'action_required', ops.activeIncidentId ?? undefined)
              }, 600)
            }, 600)
          }}
            className="w-full py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all"
            style={{ background: P.amber, color: '#1e1d1b' }}>
            <Check size={11} /> APPROVE PLAN & EXECUTE
          </button>
        ) : (
          <div className="flex items-center justify-between pt-1.5 text-[9px]"
            style={{ borderTop: `1px solid ${P.border}`, color: P.textMuted }}>
            <span>Click to open engineer console</span><ArrowRight size={10} />
          </div>
        )}
      </div>

      {/* ═══ CENTRAL SPINE: Intent Engine → Federated KB → Risk & Routing ═══ */}

      {/* Intent Engine */}
      <div onClick={() => onOpenStationDrawer('semantic')}
        className="absolute top-44 left-1/2 -translate-x-1/2 w-64 rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer"
        style={stationCard(ops.stations.find(s => s.id === 'semantic')?.state === 'processing', P.lilacBg, P.lilacBdr)}>
        <div className="flex items-center gap-1.5 mb-1 text-[8px] font-black tracking-widest" style={{ color: P.lilac }}>
          <Brain size={12} /> INTENT ENGINE
        </div>
        <div className="text-[11px] font-mono font-bold" style={{ color: P.textPrimary }}>Incident Classification</div>
        <div className="text-[8px] mt-0.5" style={{ color: P.textSecondary }}>Domain Detection · Semantic Scope</div>
      </div>

      {/* Federated KB */}
      <div onClick={() => onOpenStationDrawer('knowledge_search')}
        className="absolute top-72 left-1/2 -translate-x-1/2 w-64 rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer"
        style={stationCard(ops.stations.find(s => s.id === 'knowledge_search')?.state === 'processing', P.periwinkleBg, P.periwinkleBdr)}>
        <div className="flex items-center gap-1.5 mb-1 text-[8px] font-black tracking-widest" style={{ color: P.periwinkle }}>
          <Search size={12} /> FEDERATED KB
        </div>
        <div className="text-[11px] font-mono font-bold" style={{ color: P.textPrimary }}>Confluence · SharePoint · Silos</div>
        <div className="text-[8px] mt-0.5" style={{ color: P.textSecondary }}>Distributed Organizational Knowledge</div>
      </div>

      {/* Risk & Routing Hub */}
      <div onClick={() => onOpenStationDrawer('routing')}
        className="absolute top-96 left-1/2 -translate-x-1/2 w-72 rounded-2xl p-3.5 flex flex-col items-center text-center cursor-pointer"
        style={{ background: ops.currentRoute ? P.goldBg : P.elevated,
                 border: `2px solid ${ops.currentRoute ? P.goldBdr : P.border}`,
                 boxShadow: ops.currentRoute ? `0 8px 28px ${P.goldBg}` : 'none',
                 transition: 'all 0.3s ease' }}>
        <div className="flex items-center gap-1.5 mb-1 text-[9px] font-black tracking-widest" style={{ color: P.gold }}>
          <GitBranch size={13} /> RISK & ROUTING
        </div>
        <div className="text-sm font-mono font-black" style={{ color: P.textPrimary }}>
          {ops.currentSimilarity !== null ? `SIMILARITY: ${ops.currentSimilarity.toFixed(2)}` : 'AWAITING SCORE'}
        </div>
        <div className="text-[8px] mt-0.5" style={{ color: P.textSecondary }}>
          Resolve · Clarify · Escalate · Reject
        </div>
        {ops.currentRoute && (
          <div className="mt-1.5 px-3 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: ops.currentRoute === 'known' ? P.sageBg : ops.currentRoute === 'mid' ? P.amberBg : P.roseBg,
                     color: ops.currentRoute === 'known' ? P.sage : ops.currentRoute === 'mid' ? P.amber : P.rose,
                     border: `1px solid ${ops.currentRoute === 'known' ? P.sageBdr : ops.currentRoute === 'mid' ? P.amberBdr : P.roseBdr}` }}>
            DECISION → {ops.currentRoute.toUpperCase()}
          </div>
        )}
      </div>

      {/* ═══ MIDDLE BRANCHES ═══ */}

      {/* Playbook Engine — KNOWN path */}
      <div onClick={() => onOpenStationDrawer('playbook')}
        className="absolute w-56 rounded-2xl p-3 flex flex-col gap-1.5 cursor-pointer"
        style={{ top: '490px', left: '3.5rem',
                 ...stationCard(ops.stations.find(s => s.id === 'playbook')?.state === 'processing', P.sageBg, P.sageBdr) }}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black tracking-widest flex items-center gap-1" style={{ color: P.sage }}>
            <Zap size={10} /> PLAYBOOK ENGINE
          </span>
          <span className="text-[8px] font-mono" style={{ color: P.sage }}>AUTO</span>
        </div>
        <div className="text-xs font-bold" style={{ color: P.textPrimary }}>VPN-AUTH-01 Execution</div>
        <div className="text-[8px]" style={{ color: P.textSecondary }}>5/5 Steps · 2.04s MTTR</div>
      </div>

      {/* AI Diagnostics Station */}
      <div onClick={() => onOpenStationDrawer('ai_diagnostics')}
        className="absolute w-48 rounded-2xl p-3 flex flex-col gap-1 cursor-pointer"
        style={{ top: '490px', right: '3.5rem',
                 ...stationCard(ops.stations.find(s => s.id === 'ai_diagnostics')?.state === 'processing', P.roseBg, P.roseBdr) }}>
        <div className="flex items-center gap-1 text-[8px] font-black tracking-widest" style={{ color: P.rose }}>
          <Bot size={10} /> AI DIAGNOSTICS
        </div>
        <div className="text-[10px] font-mono font-bold" style={{ color: P.textPrimary }}>14 Stack Patterns</div>
        <div className="text-[8px]" style={{ color: P.textSecondary }}>Root Cause Hypothesis</div>
      </div>

      {/* Marcus Lee — DevOps / SRE Engineer */}
      <div onClick={() => onOpenHumanDrawer('sre')}
        onMouseEnter={() => setHovered('marcus')} onMouseLeave={() => setHovered(null)}
        className="absolute w-60 rounded-2xl p-3 flex flex-col gap-2 cursor-pointer"
        style={{ top: '562px', right: '3.5rem',
                 ...agentCard(marcus.state === 'investigating' || marcus.state === 'alerted', P.roseBg, P.roseBdr) }}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black tracking-widest" style={{ color: P.rose }}>OPERATIONS / SRE</span>
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: marcus.state === 'idle' ? P.elevated : marcus.state === 'completed' ? P.sageBg : P.roseBg,
                     color: marcus.state === 'idle' ? P.textMuted : marcus.state === 'completed' ? P.sage : P.rose,
                     border: `1px solid ${marcus.state === 'idle' ? P.border : marcus.state === 'completed' ? P.sageBdr : P.roseBdr}` }}>
            {marcus.state === 'idle' ? '● STANDBY' : marcus.state === 'investigating' ? '⬡ PROBING' : marcus.state === 'completed' ? '✓ RESOLVED' : `● ${marcus.state.toUpperCase()}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center p-1 flex-shrink-0"
            style={{ background: P.roseBg, border: `1px solid ${P.roseBdr}` }}>
            <Image src="/assets/humans/Software engineer-amico.svg" alt="Marcus" width={50} height={50} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold" style={{ color: P.textPrimary }}>Marcus Lee</div>
            <div className="text-[9px]" style={{ color: P.textSecondary }}>DevOps / SRE Engineer</div>
            <div className="text-[8px] font-mono mt-0.5" style={{ color: P.rose }}>Production Reliability</div>
          </div>
        </div>
        {marcus.state === 'investigating' ? (
          !ops.marcusInvestigation.isComplete ? (
            <button onClick={(e) => {
              e.stopPropagation()
              ops.startMarcusInvestigation()
              ops.addManualActivity({ stage: 'diagnosing', eventType: 'SRE_INVESTIGATION_STARTED',
                message: 'Marcus Lee running diagnostic probes across system traces...',
                incidentId: ops.activeIncidentId ?? 'INC-1088' })
              setTimeout(() => { ops.completeMarcusInvestigation('DB connection pool exhausted'); ops.setHumanState('sre', 'action_required') }, 1200)
            }}
              className="w-full py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all"
              style={{ background: P.rose, color: '#f0ebe3' }}>
              <Play size={11} /> RUN DIAGNOSTIC PROBE
            </button>
          ) : (
            <button onClick={(e) => {
              e.stopPropagation()
              ops.setHumanState('sre', 'completed')
              ops.setStationState('verification', 'processing')
              ops.addManualActivity({ stage: 'executing', eventType: 'SRE_RESOLUTION_APPLIED',
                message: 'Marcus Lee applied fix: Expand pool max_size=100 with 5s retry',
                incidentId: ops.activeIncidentId ?? 'INC-1088' })
              setTimeout(() => { ops.setStationState('verification', 'done'); ops.setStationState('resolution', 'done'); ops.setHumanState('curator', 'action_required', ops.activeIncidentId ?? undefined) }, 600)
            }}
              className="w-full py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all"
              style={{ background: P.sage, color: '#1e1d1b' }}>
              <Check size={11} /> APPLY RELIABILITY FIX
            </button>
          )
        ) : (
          <div className="flex items-center justify-between pt-1.5 text-[9px]"
            style={{ borderTop: `1px solid ${P.border}`, color: P.textMuted }}>
            <span>Click to inspect AI diagnostic traces</span><ArrowRight size={10} />
          </div>
        )}
      </div>

      {/* ═══ BOTTOM ROW: Verification Engine | Resolution Engine | Maya Lin (QA Lead) ═══ */}

      {/* Verification Engine */}
      <div onClick={() => onOpenStationDrawer('verification')}
        className="absolute w-52 rounded-2xl p-3 flex flex-col gap-1 cursor-pointer"
        style={{ bottom: '6px', left: '3.5rem',
                 ...stationCard(ops.stations.find(s => s.id === 'verification')?.state === 'processing', P.sageBg, P.sageBdr) }}>
        <div className="flex items-center gap-1.5 text-[8px] font-black tracking-widest" style={{ color: P.sage }}>
          <ShieldCheck size={12} /> VERIFICATION ENGINE
        </div>
        <div className="text-[11px] font-mono font-bold" style={{ color: P.textPrimary }}>5/5 Health Checks</div>
        <div className="text-[8px]" style={{ color: P.textSecondary }}>Service · Impact · Error Rate · SLA</div>
      </div>

      {/* Resolution Engine */}
      <div onClick={() => onOpenStationDrawer('resolution')}
        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-52 rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer"
        style={stationCard(ops.stations.find(s => s.id === 'resolution')?.state === 'done', P.sageBg, P.sageBdr)}>
        <div className="flex items-center gap-1.5 text-[8px] font-black tracking-widest" style={{ color: P.sage }}>
          <CheckCircle size={12} /> RESOLUTION ENGINE
        </div>
        <div className="text-[11px] font-mono font-bold" style={{ color: P.textPrimary }}>Jira Ticket: DONE</div>
        <div className="text-[8px]" style={{ color: P.textSecondary }}>Auto-Closed & Provenance Synced</div>
      </div>

      {/* Maya Lin — QA Lead / Verification Lab */}
      <div onClick={() => onOpenHumanDrawer('curator')}
        onMouseEnter={() => setHovered('maya')} onMouseLeave={() => setHovered(null)}
        className="absolute bottom-1.5 right-16 md:right-20 w-60 rounded-2xl p-3 flex flex-col gap-2 cursor-pointer"
        style={agentCard(maya.state === 'action_required' || maya.state === 'reviewing', P.sageBg, P.sageBdr)}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black tracking-widest" style={{ color: P.sage }}>QA / VERIFICATION LAB</span>
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: maya.state === 'idle' ? P.elevated : P.sageBg,
                     color: maya.state === 'idle' ? P.textMuted : P.sage,
                     border: `1px solid ${maya.state === 'idle' ? P.border : P.sageBdr}` }}>
            {maya.state === 'idle' ? '● STANDBY' : maya.state === 'action_required' ? '✦ QA REVIEW' : maya.state === 'completed' ? '✓ VERIFIED' : `● ${maya.state.toUpperCase()}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center p-1 flex-shrink-0"
            style={{ background: P.sageBg, border: `1px solid ${P.sageBdr}` }}>
            <Image src="/assets/humans/In the office-amico.svg" alt="Maya" width={50} height={50} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold" style={{ color: P.textPrimary }}>Maya Lin</div>
            <div className="text-[9px]" style={{ color: P.textSecondary }}>QA Lead</div>
            <div className="text-[8px] font-mono mt-0.5" style={{ color: P.sage }}>Acceptance & Validation</div>
          </div>
        </div>
        {maya.state === 'action_required' || maya.state === 'reviewing' ? (
          <button onClick={(e) => {
            e.stopPropagation()
            ops.setHumanState('curator', 'completed')
            ops.incrementSolutionsCount()
            scene.setLearnedInPgvector(true)
            ops.setStationState('knowledge_lab', 'done')
            ops.addManualActivity({ stage: 'learned', eventType: 'KNOWLEDGE_APPROVED',
              message: `Maya Lin verified resolution — provenance & KB updated`,
              incidentId: ops.activeIncidentId ?? 'INC-1088' })
          }}
            className="w-full py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all"
            style={{ background: P.sage, color: '#1e1d1b' }}>
            <Sparkles size={11} /> VERIFY & SYNC AUDIT TRAIL
          </button>
        ) : (
          <div className="flex items-center justify-between pt-1.5 text-[9px]"
            style={{ borderTop: `1px solid ${P.border}`, color: P.textMuted }}>
            <span>Click to inspect QA verification</span><ArrowRight size={10} />
          </div>
        )}
      </div>
    </div>
  )
}
