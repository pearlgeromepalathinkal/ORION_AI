'use client'

import React, { useState, useEffect } from 'react'
import { Activity, Wifi, WifiOff } from 'lucide-react'
import { useIncidentSimulationEngine } from '@/store/incident-simulation-engine'

export function Header() {
  const sim = useIncidentSimulationEngine()
  const [timeStr, setTimeStr] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }))
      setDateStr(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
      className="h-12 px-5 flex items-center justify-between select-none text-xs flex-shrink-0 z-50"
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-baseline gap-2">
          <span
            style={{ color: '#263238', fontFamily: 'var(--font-ui)' }}
            className="text-sm font-bold leading-none tracking-tight"
          >
            ORION-AI
          </span>
          <span
            style={{
              width: 1,
              height: 14,
              background: 'var(--border-default)',
              display: 'inline-block',
              verticalAlign: 'middle',
            }}
          />
          <span
            style={{ color: '#7B3F45', fontFamily: 'var(--font-ui)' }}
            className="text-[11px] font-semibold"
          >
            Operations
          </span>
        </div>
      </div>

      {/* ── Center: System Health + Mode ── */}
      <div className="flex items-center gap-3">
        {/* System Status */}
        <div
          style={{
            background: '#E4EBDD',
            border: '1px solid #C8D6C2',
            borderRadius: 4,
          }}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1"
        >
          <span className="status-dot green pulse" />
          <span
            style={{ color: '#66865F', fontFamily: 'var(--font-ui)' }}
            className="text-[10px] font-semibold tracking-wide"
          >
            OPERATIONAL
          </span>
        </div>

        {/* Execution Mode */}
        <div
          style={{
            background: sim.mode === 'LIVE' ? '#E4EBDD' : '#F3EAE5',
            border: `1px solid ${sim.mode === 'LIVE' ? '#C8D6C2' : '#D8C8C0'}`,
            borderRadius: 4,
          }}
          className="flex items-center gap-1.5 px-2.5 py-1"
        >
          <span style={{ color: '#7A7470' }} className="text-[9px] uppercase tracking-wide">
            Mode:
          </span>
          {sim.mode === 'LIVE' ? (
            <span style={{ color: '#66865F', fontFamily: 'var(--font-mono)' }} className="flex items-center gap-1 text-[10px] font-bold">
              <Wifi size={10} />
              LIVE
            </span>
          ) : (
            <span style={{ color: '#7B3F45', fontFamily: 'var(--font-mono)' }} className="flex items-center gap-1 text-[10px] font-bold">
              <WifiOff size={10} />
              SIMULATION
            </span>
          )}
        </div>

        {/* Active Incident */}
        {sim.incidentId && (
          <div
            style={{
              background: 'var(--color-human-bg)',
              border: '1px solid var(--color-human-border)',
              borderRadius: 4,
            }}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1"
          >
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }} className="text-[10px] font-bold">
              {sim.incidentId}
            </span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }} className="text-[9px] uppercase">
              {sim.currentStage}
            </span>
          </div>
        )}
      </div>

      {/* ── Right: Clock ── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <div style={{ color: '#263238', fontFamily: 'var(--font-mono)' }} className="text-[11px] font-semibold leading-none">
            {timeStr}
          </div>
          <div style={{ color: '#7A7470', fontFamily: 'var(--font-mono)' }} className="text-[8px] leading-none mt-0.5">
            {dateStr}
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-warm)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-muted)',
            borderRadius: 5,
          }}
          className="w-7 h-7 flex items-center justify-center"
        >
          <Activity size={13} />
        </div>
      </div>
    </header>
  )
}
