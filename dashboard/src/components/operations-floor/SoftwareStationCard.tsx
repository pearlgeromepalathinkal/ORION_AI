'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { useOperationsStore } from '@/store/operations-store'
import type { StationId } from '@/types'
import {
  Cpu, Brain, Search, GitBranch, Zap, Bot,
  ShieldCheck, CheckCircle, BookOpen, Activity, ExternalLink,
} from 'lucide-react'

const STATION_CONFIG: Record<StationId, {
  label: string
  sublabel: string
  icon: React.ElementType
}> = {
  intake:           { label: 'ORION INTAKE',         sublabel: 'POST /orion-ai/intake',              icon: Cpu },
  semantic:         { label: 'INTENT ENGINE',         sublabel: 'Domain & Intent Detection',          icon: Brain },
  knowledge_search: { label: 'FEDERATED KB',          sublabel: 'Confluence · SharePoint · Silos',    icon: Search },
  routing:          { label: 'RISK & ROUTING',        sublabel: 'Resolve · Clarify · Escalate',       icon: GitBranch },
  playbook:         { label: 'PLAYBOOK ENGINE',       sublabel: 'Remediation Procedures',             icon: Zap },
  ai_diagnostics:   { label: 'AI DIAGNOSTICS',        sublabel: 'Root-Cause Reasoning',               icon: Bot },
  devops_infra:     { label: 'SRE MONITOR',           sublabel: 'Production Reliability',             icon: Activity },
  qa_testing:       { label: 'QA VERIFICATION LAB',   sublabel: 'Testing & Validation',               icon: ShieldCheck },
  verification:     { label: 'VERIFICATION ENGINE',   sublabel: '5/5 Health Checks',                  icon: ShieldCheck },
  resolution:       { label: 'RESOLUTION ENGINE',     sublabel: 'Jira Synchronization',               icon: CheckCircle },
  knowledge_lab:    { label: 'PROVENANCE / AUDIT',    sublabel: 'Execution Trail & Audit',            icon: BookOpen },
}

interface Props {
  stationId: StationId
  onClick: (id: StationId) => void
  compact?: boolean
}

export function SoftwareStationCard({ stationId, onClick, compact = false }: Props) {
  const ops = useOperationsStore()
  const station = ops.stations.find(s => s.id === stationId)!
  const config = STATION_CONFIG[stationId]
  const Icon = config.icon

  const isProcessing = station.state === 'processing'
  const isDone       = station.state === 'done'
  const isError      = station.state === 'error'

  // Warm semantic colors per state
  const dotColor =
    isError      ? '#B5605F'  :
    isDone       ? '#5E8A5A'  :
    isProcessing ? '#6496AA'  :
    '#8A8177'

  const cardBg =
    isProcessing ? 'rgba(175,199,213,0.12)' :
    isDone       ? 'rgba(169,195,160,0.10)' :
    '#FFFDF8'

  const cardBorder =
    isError      ? 'rgba(213,139,139,0.45)' :
    isProcessing ? 'rgba(175,199,213,0.55)' :
    isDone       ? 'rgba(169,195,160,0.50)' :
    '#D8D1C5'

  const statusText =
    isError      ? 'ERROR'    :
    isProcessing ? 'ACTIVE'   :
    isDone       ? 'DONE'     :
    'IDLE'

  const statusBg =
    isError      ? 'rgba(213,139,139,0.15)' :
    isProcessing ? 'rgba(175,199,213,0.20)' :
    isDone       ? 'rgba(169,195,160,0.18)' :
    'rgba(138,129,119,0.10)'

  const statusColor =
    isError      ? '#B5605F' :
    isProcessing ? '#6496AA' :
    isDone       ? '#5E8A5A' :
    '#8A8177'

  return (
    <motion.div
      onClick={() => onClick(stationId)}
      className="relative flex flex-col justify-between cursor-pointer transition-all duration-200 select-none overflow-hidden"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 5,
        boxShadow: isProcessing
          ? '0 2px 8px rgba(100,150,170,0.15)'
          : '0 1px 4px rgba(50,40,30,0.07)',
        minWidth: compact ? 120 : 140,
        flex: 1,
        padding: 10,
      }}
      whileHover={{ scale: 1.015, y: -1 }}
      transition={{ duration: 0.15 }}
    >
      {/* ── Workstation label header ── */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5">
          {/* State dot */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              display: 'inline-block',
              flexShrink: 0,
              ...(isProcessing ? { animation: 'pulse-dot 1.8s infinite' } : {}),
            }}
          />
          <span
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
            }}
            className="text-[9px] font-bold uppercase tracking-wider truncate"
          >
            {config.label}
          </span>
        </div>

        {/* State badge */}
        <span
          style={{
            background: statusBg,
            color: statusColor,
            border: `1px solid ${cardBorder}`,
            borderRadius: 3,
            padding: '1px 5px',
            fontFamily: 'var(--font-mono)',
          }}
          className="text-[8px] font-bold whitespace-nowrap flex-shrink-0"
        >
          {statusText}
        </span>
      </div>

      {/* ── Dynamic station content ── */}
      <div className="my-1 flex flex-col gap-0.5">
        {stationId === 'intake' && (
          <>
            <div style={{ color: '#6496AA', fontFamily: 'var(--font-mono)' }} className="text-[9px] truncate">
              POST /orion-ai/intake
            </div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[8px]">
              Payload Validated · Enqueued
            </div>
          </>
        )}

        {stationId === 'semantic' && (
          <>
            <div className="flex justify-between text-[8px]" style={{ fontFamily: 'var(--font-mono)', color: '#6496AA' }}>
              <span>Embedding Vector</span>
              <span>1536 dim</span>
            </div>
            <div className="warm-bar-track w-full">
              <motion.div
                className="warm-bar-fill-blue"
                animate={{ width: isProcessing ? '85%' : isDone ? '100%' : '0%' }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </>
        )}

        {stationId === 'knowledge_search' && (
          <>
            <div className="flex justify-between text-[8px]" style={{ fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#6496AA' }}>{ops.totalSolutionsCount} solutions</span>
              <span style={{ color: 'var(--text-muted)' }}>{ops.searchLatencyMs}ms</span>
            </div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[8px] truncate">
              pgvector Cosine Search
            </div>
          </>
        )}

        {stationId === 'routing' && (
          <>
            <div className="flex justify-between items-center">
              <span style={{ color: '#B8894A', fontFamily: 'var(--font-mono)' }} className="text-[8px] font-bold">
                {ops.currentSimilarity ? `Sim: ${ops.currentSimilarity.toFixed(2)}` : 'Thresholding'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} className="text-[8px]">
                ≥0.85 / 0.55
              </span>
            </div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[8px] truncate">
              {ops.currentRoute ? `→ ${ops.currentRoute.toUpperCase()}` : 'Awaiting score'}
            </div>
          </>
        )}

        {stationId === 'playbook' && (
          <>
            <div style={{ color: '#5E8A5A', fontFamily: 'var(--font-mono)' }} className="text-[8px]">
              VPN-AUTH-01
            </div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[8px] truncate">
              5/5 Steps Auto-Executed
            </div>
          </>
        )}

        {stationId === 'ai_diagnostics' && (
          <>
            <div style={{ color: '#B5605F', fontFamily: 'var(--font-mono)' }} className="text-[8px]">
              14 Logs Analyzed
            </div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[8px] truncate">
              Hypothesis Generator
            </div>
          </>
        )}

        {stationId === 'verification' && (
          <>
            <div style={{ color: '#5E8A5A', fontFamily: 'var(--font-mono)' }} className="text-[8px]">
              5/5 Health Checks
            </div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[8px] truncate">
              Service · SLA · Error Rate
            </div>
          </>
        )}

        {stationId === 'resolution' && (
          <>
            <div style={{ color: '#5E8A5A', fontFamily: 'var(--font-mono)' }} className="text-[8px]">
              Jira Sync: Done
            </div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[8px] truncate">
              Ticket closed automatically
            </div>
          </>
        )}

        {stationId === 'knowledge_lab' && (
          <>
            <div style={{ color: '#6496AA', fontFamily: 'var(--font-mono)' }} className="text-[8px]">
              Vector Index Capture
            </div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[8px] truncate">
              Closed-Loop Learning
            </div>
          </>
        )}

        {/* Generic sublabel for unspecified stations */}
        {!['intake','semantic','knowledge_search','routing','playbook','ai_diagnostics','verification','resolution','knowledge_lab'].includes(stationId) && (
          <div style={{ color: 'var(--text-muted)' }} className="text-[8px] truncate">
            {config.sublabel}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          marginTop: 4,
          paddingTop: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-muted)',
        }}
        className="text-[8px]"
      >
        <span>Technical console</span>
        <ExternalLink size={8} />
      </div>
    </motion.div>
  )
}
