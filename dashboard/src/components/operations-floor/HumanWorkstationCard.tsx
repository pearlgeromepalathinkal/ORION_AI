'use client'
import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useOperationsStore } from '@/store/operations-store'
import type { HumanRole } from '@/types'
import { ArrowRight, Play, Eye, Sparkles, Check } from 'lucide-react'

// Warm office semantic colors per role
const ROLE_CONFIG: Record<HumanRole, {
  label: string
  color: string          // text / dot color
  bgColor: string        // card tint when active
  borderColor: string    // card border when active
  stationName: string
}> = {
  elena: {
    label: 'INCIDENT MANAGER',
    color: '#7B3F45',              // burgundy
    bgColor: 'rgba(123,63,69,0.07)',
    borderColor: 'rgba(123,63,69,0.30)',
    stationName: 'Command & Governance',
  },
  alex: {
    label: 'SYSTEMS ENGINEER · NETWORK',
    color: '#6496AA',              // soft blue
    bgColor: 'rgba(175,199,213,0.15)',
    borderColor: 'rgba(175,199,213,0.55)',
    stationName: 'Network & Connectivity',
  },
  sam: {
    label: 'SYSTEMS ENGINEER · SERVER',
    color: '#6496AA',
    bgColor: 'rgba(175,199,213,0.15)',
    borderColor: 'rgba(175,199,213,0.55)',
    stationName: 'Server & OS Desk',
  },
  jordan: {
    label: 'SYSTEMS ENGINEER · DATABASE',
    color: '#B8894A',              // amber
    bgColor: 'rgba(217,179,108,0.12)',
    borderColor: 'rgba(217,179,108,0.40)',
    stationName: 'Database & Storage',
  },
  taylor: {
    label: 'SYSTEMS ENGINEER · CLOUD',
    color: '#6496AA',
    bgColor: 'rgba(175,199,213,0.15)',
    borderColor: 'rgba(175,199,213,0.55)',
    stationName: 'Cloud & Infrastructure',
  },
  riley: {
    label: 'SYSTEMS ENGINEER · IDENTITY',
    color: '#6496AA',
    bgColor: 'rgba(175,199,213,0.15)',
    borderColor: 'rgba(175,199,213,0.55)',
    stationName: 'Identity & Security',
  },
  marcus: {
    label: 'DEVOPS / SRE ENGINEER',
    color: '#B8894A',              // amber
    bgColor: 'rgba(217,179,108,0.12)',
    borderColor: 'rgba(217,179,108,0.40)',
    stationName: 'Operations / SRE Lab',
  },
  maya: {
    label: 'QA LEAD',
    color: '#5E8A5A',              // sage
    bgColor: 'rgba(169,195,160,0.15)',
    borderColor: 'rgba(169,195,160,0.50)',
    stationName: 'QA & Verification Lab',
  },
  noah: {
    label: 'QA ENGINEER',
    color: '#5E8A5A',
    bgColor: 'rgba(169,195,160,0.15)',
    borderColor: 'rgba(169,195,160,0.50)',
    stationName: 'Functional Testing',
  },
  ananya: {
    label: 'AUTOMATION ENGINEER',
    color: '#5E8A5A',
    bgColor: 'rgba(169,195,160,0.15)',
    borderColor: 'rgba(169,195,160,0.50)',
    stationName: 'Automation Verification',
  },
  // compatibility aliases
  commander: {
    label: 'INCIDENT MANAGER',
    color: '#7B3F45',
    bgColor: 'rgba(123,63,69,0.07)',
    borderColor: 'rgba(123,63,69,0.30)',
    stationName: 'Command & Governance',
  },
  developer: {
    label: 'SYSTEMS ENGINEER',
    color: '#B8894A',
    bgColor: 'rgba(217,179,108,0.12)',
    borderColor: 'rgba(217,179,108,0.40)',
    stationName: 'Systems Engineering',
  },
  sre: {
    label: 'DEVOPS / SRE ENGINEER',
    color: '#B8894A',
    bgColor: 'rgba(217,179,108,0.12)',
    borderColor: 'rgba(217,179,108,0.40)',
    stationName: 'Operations / SRE Lab',
  },
  curator: {
    label: 'QA LEAD',
    color: '#5E8A5A',
    bgColor: 'rgba(169,195,160,0.15)',
    borderColor: 'rgba(169,195,160,0.50)',
    stationName: 'QA & Verification Lab',
  },
}

// Human-readable state labels (office terminology)
const STATE_LABEL: Record<string, string> = {
  idle:            '● AVAILABLE',
  alerted:         '🔔 ALERTED',
  reviewing:       '🔍 REVIEWING',
  investigating:   '⚙ INVESTIGATING',
  action_required: '⚡ ACTION REQUIRED',
  resolving:       '🛠 RESOLVING',
  approved:        '✓ APPROVED',
  rejected:        '✗ REJECTED',
  escalated:       '↗ ESCALATED',
  completed:       '✓ COMPLETED',
  standing:        '● AVAILABLE',
  walking:         '→ IN TRANSIT',
  working:         '⚙ WORKING',
  returning:       '← RETURNING',
  talking:         '💬 DISCUSSING',
  waiting:         '⏳ WAITING',
}

interface Props {
  role: HumanRole
  onClick: (role: HumanRole) => void
  onDirectAction?: (role: HumanRole, action: string) => void
}

export function HumanWorkstationCard({ role, onClick }: Props) {
  const ops = useOperationsStore()
  const human = ops.humans.find(h => h.id === role)!
  const config = ROLE_CONFIG[role]

  const isActive    = human.state !== 'idle' && human.state !== 'standing'
  const isAlerted   = human.state === 'alerted' || human.state === 'action_required'
  const isCompleted = human.state === 'approved' || human.state === 'completed'

  const statusLabel = STATE_LABEL[human.state] || '● AVAILABLE'

  // State dot color
  const dotColor =
    isAlerted   ? '#B45F63' :
    isCompleted ? '#66865F' :
    isActive    ? config.color :
    '#7A7470'

  // Card styling — office desk feel
  const cardBg     = isActive ? config.bgColor     : '#FFFDF8'
  const cardBorder = isActive ? config.borderColor : '#D8D1C5'

  return (
    <motion.div
      className="relative flex flex-col justify-between overflow-hidden transition-all duration-300 cursor-default"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 5,
        boxShadow: isAlerted
          ? `0 2px 10px rgba(123,63,69,0.18), 0 0 0 1.5px ${config.borderColor}`
          : '0 1px 4px rgba(50,40,30,0.08)',
        minHeight: 190,
        padding: '11px 13px',
      }}
      animate={isAlerted ? { scale: [1, 1.012, 1] } : {}}
      transition={{ repeat: isAlerted ? Infinity : 0, duration: 2.5 }}
    >
      {/* ── Physical desk label header ── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: dotColor,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: isActive ? config.color : '#8A8177',
              fontFamily: 'var(--font-ui)',
            }}
            className="text-[9px] font-bold uppercase tracking-wider"
          >
            {config.label}
          </span>
        </div>

        {/* Status chip */}
        <span
          style={{
            background: isAlerted
              ? 'rgba(213,139,139,0.15)'
              : isCompleted
              ? 'rgba(169,195,160,0.18)'
              : isActive
              ? `${config.bgColor}`
              : 'rgba(138,129,119,0.10)',
            color: isAlerted
              ? '#B45F63'
              : isCompleted
              ? '#66865F'
              : isActive
              ? config.color
              : '#7A7470',
            border: `1px solid ${
              isAlerted
                ? 'rgba(213,139,139,0.40)'
                : isCompleted
                ? 'rgba(169,195,160,0.40)'
                : isActive
                ? config.borderColor
                : 'rgba(138,129,119,0.25)'
            }`,
            borderRadius: 4,
            padding: '2px 6px',
          }}
          className="text-[9px] font-bold whitespace-nowrap"
        >
          {statusLabel}
        </span>
      </div>

      {/* ── Avatar + Name plate ── */}
      <div className="flex items-center gap-3 my-1.5">
        <div
          onClick={() => onClick(role)}
          className="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-105 flex-shrink-0"
          style={{
            width: 76,
            height: 76,
            background: isActive ? config.bgColor : 'rgba(238,233,224,0.8)',
            border: `1px solid ${isActive ? config.borderColor : '#D8D1C5'}`,
            borderRadius: 5,
            padding: 3,
          }}
        >
          <Image
            src={human.avatar}
            alt={human.name}
            width={72}
            height={72}
            className="object-contain"
            priority={false}
          />
          {isAlerted && (
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
              style={{ background: '#D58B8B', animation: 'pulse-dot 1.5s infinite' }}
            />
          )}
        </div>

        {/* Desk name plate */}
        <div className="flex-1 min-w-0">
          <div
            style={{
              color: '#263238',
              fontFamily: 'var(--font-ui)',
            }}
            className="text-xs font-bold truncate"
          >
            {human.name}
          </div>
          <div
            style={{ color: '#54636B' }}
            className="text-[10px] truncate mt-0.5"
          >
            {human.title}
          </div>
          <div
            style={{ color: '#7A7470', fontFamily: 'var(--font-mono)' }}
            className="text-[9px] mt-0.5 truncate"
          >
            {config.stationName}
          </div>

          {human.currentIncidentId && isActive && (
            <div
              style={{
                background: config.bgColor,
                color: config.color,
                border: `1px solid ${config.borderColor}`,
                borderRadius: 3,
                padding: '1px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 4,
              }}
              className="text-[9px] font-mono font-bold"
            >
              ⚡ {human.currentIncidentId}
            </div>
          )}
        </div>
      </div>

      {/* ── Action area ── */}
      <div
        style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginTop: 2 }}
      >
        {role === 'developer' && human.state === 'investigating' && (
          <div className="flex flex-col gap-1.5">
            <div style={{ color: '#B8894A' }} className="text-[9px] font-medium truncate">
              Suggested: Restart connection pool manager
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  ops.setHumanState('developer', 'approved', ops.activeIncidentId ?? undefined)
                  ops.addManualActivity({
                    stage: 'executing',
                    eventType: 'DEVELOPER_PLAN_APPROVED',
                    message: `${human.name} approved plan — executing DB-CONN-02 playbook`,
                    incidentId: ops.activeIncidentId ?? 'INC-1067',
                  })
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
                className="flex-1 py-1 px-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-opacity hover:opacity-85"
                style={{
                  background: '#D9B36C',
                  color: '#40351F',
                  border: '1px solid #C4A05A',
                  borderRadius: 4,
                }}
              >
                <Check size={10} /> Approve Plan
              </button>
              <button
                onClick={() => onClick('developer')}
                style={{
                  background: 'var(--bg-warm)',
                  color: '#B8894A',
                  border: '1px solid rgba(217,179,108,0.40)',
                  borderRadius: 4,
                }}
                className="py-1 px-2 text-[10px] font-bold transition-opacity hover:opacity-85"
              >
                <Eye size={10} />
              </button>
            </div>
          </div>
        )}

        {role === 'sre' && human.state === 'investigating' && (
          <div className="flex flex-col gap-1.5">
            <div style={{ color: '#B5605F' }} className="text-[9px] font-medium truncate">
              {ops.marcusInvestigation.isComplete ? 'Root Cause: Connection Pool Exhausted' : 'Novel Deadlock — 14 logs identified'}
            </div>
            <div className="flex items-center gap-1.5">
              {!ops.marcusInvestigation.isComplete ? (
                <button
                  onClick={() => {
                    ops.startMarcusInvestigation()
                    ops.addManualActivity({
                      stage: 'diagnosing',
                      eventType: 'SRE_INVESTIGATION_STARTED',
                      message: 'Marcus Lee running diagnostic checks across 14 stack traces...',
                      incidentId: ops.activeIncidentId ?? 'INC-1088',
                    })
                    setTimeout(() => {
                      ops.completeMarcusInvestigation('Database connection pool exhausted')
                      ops.setHumanState('sre', 'action_required')
                    }, 1200)
                  }}
                  className="flex-1 py-1 px-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-opacity hover:opacity-85"
                  style={{
                    background: '#D58B8B',
                    color: '#4B2929',
                    border: '1px solid #C07A7A',
                    borderRadius: 4,
                  }}
                >
                  <Play size={10} /> Start Investigation
                </button>
              ) : (
                <button
                  onClick={() => {
                    ops.setHumanState('sre', 'completed')
                    ops.setStationState('verification', 'processing')
                    ops.addManualActivity({
                      stage: 'executing',
                      eventType: 'SRE_RESOLUTION_APPLIED',
                      message: 'Marcus Lee created resolution: Expand pool max_size to 100 with 5s retry',
                      incidentId: ops.activeIncidentId ?? 'INC-1088',
                    })
                    setTimeout(() => {
                      ops.setStationState('verification', 'done')
                      ops.setStationState('resolution', 'done')
                      ops.setHumanState('curator', 'action_required', ops.activeIncidentId ?? undefined)
                    }, 600)
                  }}
                  className="flex-1 py-1 px-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-opacity hover:opacity-85"
                  style={{
                    background: '#A9C3A0',
                    color: '#30412D',
                    border: '1px solid #8FAE86',
                    borderRadius: 4,
                  }}
                >
                  <Check size={10} /> Apply Fix
                </button>
              )}
              <button
                onClick={() => onClick('sre')}
                style={{
                  background: 'var(--bg-warm)',
                  color: '#B5605F',
                  border: '1px solid rgba(213,139,139,0.40)',
                  borderRadius: 4,
                }}
                className="py-1 px-2 text-[10px] font-bold transition-opacity hover:opacity-85"
              >
                <Eye size={10} />
              </button>
            </div>
          </div>
        )}

        {role === 'curator' && (human.state === 'action_required' || human.state === 'reviewing') && (
          <div className="flex flex-col gap-1.5">
            <div style={{ color: '#5E8A5A' }} className="text-[9px] font-medium truncate">
              Draft KB-1249 ready for pgvector approval
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  ops.setHumanState('curator', 'completed')
                  ops.incrementSolutionsCount()
                  ops.setStationState('knowledge_lab', 'done')
                  ops.addManualActivity({
                    stage: 'learned',
                    eventType: 'KNOWLEDGE_APPROVED',
                    message: `Dr. Alisha Patel approved KB-1249 — indexed into pgvector (${ops.totalSolutionsCount + 1} solutions)`,
                    incidentId: ops.activeIncidentId ?? 'INC-1088',
                  })
                }}
                className="flex-1 py-1 px-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-opacity hover:opacity-85"
                style={{
                  background: '#A9C3A0',
                  color: '#30412D',
                  border: '1px solid #8FAE86',
                  borderRadius: 4,
                }}
              >
                <Sparkles size={10} /> Approve into pgvector
              </button>
              <button
                onClick={() => onClick('curator')}
                style={{
                  background: 'var(--bg-warm)',
                  color: '#5E8A5A',
                  border: '1px solid rgba(169,195,160,0.50)',
                  borderRadius: 4,
                }}
                className="py-1 px-2 text-[10px] font-bold transition-opacity hover:opacity-85"
              >
                <Eye size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Default: open console */}
        {!(role === 'developer' && human.state === 'investigating') &&
         !(role === 'sre' && human.state === 'investigating') &&
         !(role === 'curator' && (human.state === 'action_required' || human.state === 'reviewing')) && (
          <button
            onClick={() => onClick(role)}
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 0',
            }}
            className="text-[10px] transition-colors hover:text-[var(--text-primary)]"
          >
            <span>Open Workstation Console</span>
            <ArrowRight size={10} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
