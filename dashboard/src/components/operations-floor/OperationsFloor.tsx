'use client'

import React, { useState } from 'react'
import { PixiFloorCanvas } from './PixiFloorCanvas'
import { LiveActivityPanel } from '../activity/LiveActivityPanel'
import { IncidentConsole } from './IncidentConsole'
import { HumanDrawer } from './HumanDrawer'
import { StationDrawer } from './StationDrawer'
import { HITLStatusIndicator } from './HITLStatusIndicator'
import { HITLReviewPanel } from './HITLReviewPanel'
import { useHITLStore } from '@/store/hitl-store'
import { useHITLWorkflow } from '@/hooks/useHITLWorkflow'
import type { HumanRole, StationId } from '@/types'

export function OperationsFloor() {
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'human' | 'station'; id: string } | null>(null)
  const activeHITL = useHITLStore((s) => s.activeHITL)

  // Live WebSocket orchestration for active HITL ticket
  useHITLWorkflow(activeHITL?.ticketId)

  const handleSelectHuman = (role: HumanRole) => {
    setSelectedEntity({ type: 'human', id: role })
  }

  const handleSelectStation = (id: StationId) => {
    setSelectedEntity({ type: 'station', id })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* ── Subheader Bar: Clean, uncluttered ── */}
      <div
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-unknown)' }} />
            ORION-AI Operations
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Live Engineering Floor</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          <HITLStatusIndicator />
          <span className="hidden sm:inline">Autonomous Incident Operations</span>
        </div>
      </div>

      {/* ── Main Floor + Right Feed ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* PixiJS Operations Floor (Hero Experience) */}
        <div className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden">
          <PixiFloorCanvas
            onOpenHumanDrawer={handleSelectHuman}
            onOpenStationDrawer={handleSelectStation}
          />
        </div>

        {/* Right Activity & Evidence Panel */}
        <div
          className="flex-shrink-0 hidden lg:flex flex-col"
          style={{
            width: 290,
            borderLeft: '1px solid var(--border-default)',
            background: 'var(--bg-surface)',
          }}
        >
          <LiveActivityPanel
            selectedEntity={selectedEntity}
            onClearSelection={() => setSelectedEntity(null)}
          />
        </div>
      </div>

      {/* ── Bottom Console (Compact & Collapsible) ── */}
      <IncidentConsole />

      {/* ── Interactive Drawers & HITL Review ── */}
      <HumanDrawer />
      <StationDrawer />
      <HITLReviewPanel />
    </div>
  )
}
