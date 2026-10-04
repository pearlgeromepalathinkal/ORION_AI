'use client'

import React, { useState } from 'react'
import { useIncidentSimulationEngine } from '@/store/incident-simulation-engine'
import { EvidenceProvenancePanel } from '../operations-floor/EvidenceProvenancePanel'
import { Radio, Activity, FileText } from 'lucide-react'

interface Props {
  selectedEntity?: { type: 'human' | 'station'; id: string } | null
  onClearSelection?: () => void
}

// Stage dot: warm semantic colors only
const STAGE_DOT_COLOR: Record<string, string> = {
  received:         '#5F8192',
  normalized:       '#5F8192',
  embedded:         '#5F8192',
  knowledge_search: '#B18435',
  routing:          '#B18435',
  remediation:      '#66865F',
  verification:     '#66865F',
  resolution:       '#66865F',
  knowledge_capture:'#7B3F45',
  hitl:             '#7B3F45',
  error:            '#B45F63',
}

export function LiveActivityPanel({ selectedEntity, onClearSelection }: Props) {
  const sim = useIncidentSimulationEngine()
  const [activeTab, setActiveTab] = useState<'events' | 'evidence'>('events')
  const events = sim.timeline
  const hasEvents = events.length > 0

  const effectiveTab = selectedEntity ? 'evidence' : activeTab

  return (
    <div
      className="flex flex-col h-full overflow-hidden select-none text-xs"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* ── Tab Switcher ── */}
      <div
        className="px-2 py-1.5 flex items-center justify-between flex-shrink-0"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}
      >
        <div
          className="flex items-center gap-0.5 p-0.5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 5,
          }}
        >
          {/* Events tab */}
          <button
            onClick={() => setActiveTab('events')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer"
            style={
              effectiveTab === 'events'
                ? {
                    background: '#F3D9D7',
                    border: '1px solid #B98989',
                    color: '#7B3F45',
                    borderRadius: 4,
                  }
                : {
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: '#54636B',
                    borderRadius: 4,
                  }
            }
          >
            <Activity size={10} />
            <span>Events</span>
          </button>

          {/* Evidence tab */}
          <button
            onClick={() => setActiveTab('evidence')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer"
            style={
              effectiveTab === 'evidence'
                ? {
                    background: '#F3D9D7',
                    border: '1px solid #B98989',
                    color: '#7B3F45',
                    borderRadius: 4,
                  }
                : {
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: '#54636B',
                    borderRadius: 4,
                  }
            }
          >
            <FileText size={10} />
            <span>Evidence</span>
          </button>
        </div>

        {/* Event count badge */}
        <span
          style={{
            color: '#7A7470',
            background: 'var(--bg-warm)',
            border: '1px solid var(--border-default)',
            borderRadius: 3,
            padding: '1px 7px',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
          }}
        >
          {hasEvents ? `${events.length} events` : 'Standby'}
        </span>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto">
        {effectiveTab === 'evidence' ? (
          <EvidenceProvenancePanel
            selectedEntity={selectedEntity}
            onClearSelection={onClearSelection}
          />
        ) : hasEvents ? (
          <div className="p-2 space-y-0.5">
            {events.slice(-14).map((e) => {
              const dotColor = STAGE_DOT_COLOR[e.stage] || '#7A7470'
              return (
                <div
                  key={e.id}
                  className="flex items-start gap-2 py-1.5 text-[11px]"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  {/* Timestamp */}
                  <span
                    style={{
                      color: '#7A7470',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      flexShrink: 0,
                      paddingTop: 2,
                      width: 52,
                    }}
                  >
                    {e.timestamp}
                  </span>

                  {/* Stage dot */}
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                      marginTop: 4,
                      display: 'inline-block',
                    }}
                  />

                  {/* Message */}
                  <div className="flex-1 min-w-0">
                    <div
                      style={{
                        color: '#54636B',
                        lineHeight: 1.45,
                        wordBreak: 'break-word',
                      }}
                    >
                      {/* Actor/source in burgundy if present */}
                      {e.actor && (
                        <span
                          style={{ color: '#7B3F45', fontWeight: 600, marginRight: 4 }}
                        >
                          {e.actor}
                        </span>
                      )}
                      <span>{e.message}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4 py-8">
            <Radio
              size={18}
              style={{ color: '#7A7470', marginBottom: 8 }}
              className="animate-pulse"
            />
            <div
              style={{ color: '#263238', fontFamily: 'var(--font-mono)' }}
              className="font-bold text-xs"
            >
              STANDBY
            </div>
            <div
              style={{ color: '#7A7470', fontFamily: 'var(--font-mono)' }}
              className="text-[10px] mt-1"
            >
              Awaiting incident
            </div>
          </div>
        )}
      </div>

      {/* ── Status Card ── */}
      <div
        className="p-2 flex flex-col gap-1.5 flex-shrink-0"
        style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-default)' }}
      >
        <div
          className="grid grid-cols-2 gap-x-3 gap-y-1 px-2 py-1.5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
          }}
        >
          <div>
            <span style={{ color: '#7A7470', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>MODE</span>
            <span style={{ color: '#7B3F45', fontWeight: 700 }}>{sim.mode}</span>
          </div>
          <div>
            <span style={{ color: '#7A7470', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>INCIDENT</span>
            <span style={{ color: '#263238', fontWeight: 700 }} className="truncate block">{sim.incidentId || '—'}</span>
          </div>
          <div>
            <span style={{ color: '#7A7470', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>STAGE</span>
            <span style={{ color: '#54636B', fontWeight: 600 }} className="uppercase truncate block">{sim.currentStage || '—'}</span>
          </div>
          <div>
            <span style={{ color: '#7A7470', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CONFIDENCE</span>
            <span
              style={{
                fontWeight: 700,
                color: sim.route === 'known' ? '#66865F' : sim.route === 'mid' ? '#B18435' : '#B45F63',
              }}
            >
              {sim.similarity !== null ? sim.similarity.toFixed(2) : '—'}
            </span>
          </div>
        </div>

        {/* Engine status */}
        <div
          className="flex items-center justify-between"
          style={{ fontSize: 8, color: '#7A7470', fontFamily: 'var(--font-mono)' }}
        >
          <span>ORION-AI Engine</span>
          <span style={{ color: '#66865F', fontWeight: 700 }}>{sim.status}</span>
        </div>
      </div>
    </div>
  )
}
