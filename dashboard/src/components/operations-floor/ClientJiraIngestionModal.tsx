'use client'

import React, { useState } from 'react'
import {
  Inbox, Send, AlertTriangle, FileText, CheckCircle,
  Sparkles, Database, ShieldAlert, X, ArrowRight, Dices,
  Server, Cpu, Activity, User, ChevronRight, Terminal
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  CORRECTIVE_MAINTENANCE_POOL,
  CLIENT_PERSONAS,
  CorrectiveIncidentDefinition
} from '@/store/incident-simulation-engine'

export interface IngestedTicket {
  id: string
  title: string
  source: 'Jira' | 'Client Webhook' | 'Prometheus' | 'Datadog'
  priority: 'P1' | 'P2' | 'P3' | 'P4'
  description: string
  similarity: number
  route: 'known' | 'mid' | 'unknown'
  service?: string
  category?: string
  clientName?: string
  clientRole?: string
  logSnippet?: string
  rootCause?: string
  resolution?: string
  latencyBefore?: number
  latencyAfter?: number
  errorRateBefore?: number
  errorRateAfter?: number
  saturationBefore?: number
  saturationAfter?: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onIngest: (ticket: IngestedTicket) => void
}

export function ClientJiraIngestionModal({ isOpen, onClose, onIngest }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0)
  const [selectedPersonaIdx, setSelectedPersonaIdx] = useState<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  const categories = ['ALL', 'Database', 'Backend', 'Cache', 'Streaming', 'Infrastructure', 'Security']

  const filteredPool = selectedCategory === 'ALL'
    ? CORRECTIVE_MAINTENANCE_POOL
    : CORRECTIVE_MAINTENANCE_POOL.filter(p => p.category === selectedCategory)

  const activeDef = filteredPool[selectedIdx] || filteredPool[0] || CORRECTIVE_MAINTENANCE_POOL[0]
  const activePersona = CLIENT_PERSONAS[selectedPersonaIdx % CLIENT_PERSONAS.length]

  const handleTriggerIngest = (def: CorrectiveIncidentDefinition, persona = activePersona) => {
    const ticket: IngestedTicket = {
      id: def.id,
      title: def.title,
      source: def.route === 'unknown' ? 'Client Webhook' : 'Jira',
      priority: def.priority,
      description: def.description,
      similarity: def.similarity,
      route: def.route,
      service: def.service,
      category: def.category,
      clientName: persona.name,
      clientRole: persona.role,
      logSnippet: def.logSnippet,
      rootCause: def.rootCause,
      resolution: def.resolution,
      latencyBefore: def.latencyBefore,
      latencyAfter: def.latencyAfter,
      errorRateBefore: def.errorRateBefore,
      errorRateAfter: def.errorRateAfter,
      saturationBefore: def.saturationBefore,
      saturationAfter: def.saturationAfter,
    }
    onIngest(ticket)
    onClose()
  }

  const handleRandomDispatch = () => {
    const randDef = CORRECTIVE_MAINTENANCE_POOL[Math.floor(Math.random() * CORRECTIVE_MAINTENANCE_POOL.length)]
    const randPersona = CLIENT_PERSONAS[Math.floor(Math.random() * CLIENT_PERSONAS.length)]
    handleTriggerIngest(randDef, randPersona)
  }

  const rotatePersona = () => {
    setSelectedPersonaIdx((prev) => (prev + 1) % CLIENT_PERSONAS.length)
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="overflow-y-auto"
        style={{
          width: 520,
          background: 'var(--bg-surface)',
          border: 'none',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: '-12px 0 45px rgba(0,0,0,0.85)',
        }}
        aria-label="Corrective Maintenance Incident Intake"
      >
        <SheetHeader className="pb-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2">
            <span
              style={{
                background: 'var(--color-processing-bg)',
                color: 'var(--color-unknown)',
                border: '1px solid var(--color-processing-border)',
              }}
              className="p-1.5 rounded-lg"
            >
              <Inbox size={16} />
            </span>
            <div>
              <span style={{ color: 'var(--color-unknown)' }} className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                CORRECTIVE MAINTENANCE GATEWAY
              </span>
              <SheetTitle style={{ color: 'var(--text-primary)' }} className="text-sm font-bold">
                Client Ticket & Anomaly Ingestion
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <div className="py-3 flex flex-col gap-3.5">
          {/* 🎲 RANDOM DISPATCH PROMINENT ACTION */}
          <button
            onClick={handleRandomDispatch}
            style={{
              background: 'linear-gradient(135deg, var(--color-unknown), var(--color-processing))',
              color: '#140c11',
              boxShadow: '0 4px 14px rgba(251,111,146,0.25)',
            }}
            className="w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border-none"
          >
            <div className="flex items-center gap-2">
              <Dices size={16} className="text-[#140c11]" />
              <div className="text-left">
                <div className="text-[11px] font-bold">🎲 Dispatch Random Client &amp; Issue</div>
                <div className="text-[8.5px] opacity-80 font-normal">
                  Picks a random customer persona and realistic corrective maintenance problem
                </div>
              </div>
            </div>
            <ArrowRight size={13} className="text-[#140c11]" />
          </button>

          {/* CLIENT PERSONA SELECTOR */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
            }}
            className="p-2.5 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                style={{
                  background: 'var(--color-human-bg)',
                  borderColor: 'var(--color-human-border)',
                  color: 'var(--color-human)',
                }}
                className="w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs flex-shrink-0"
              >
                <User size={13} />
              </div>
              <div className="min-w-0">
                <div style={{ color: 'var(--text-muted)' }} className="text-[9px] uppercase font-bold flex items-center gap-1">
                  Active Client Reporter
                </div>
                <div style={{ color: 'var(--text-primary)' }} className="text-[11px] font-bold truncate">{activePersona.name}</div>
                <div style={{ color: 'var(--color-processing)' }} className="text-[8.5px] truncate">{activePersona.role}</div>
              </div>
            </div>
            <button
              onClick={rotatePersona}
              style={{
                color: 'var(--text-secondary)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
              className="text-[9px] hover:text-[var(--text-primary)] px-2 py-1 rounded cursor-pointer flex-shrink-0"
            >
              Rotate Client ↻
            </button>
          </div>

          {/* CATEGORY FILTER PILLS */}
          <div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[9px] font-bold uppercase tracking-wider mb-1.5">
              CORRECTIVE ISSUE CATALOG ({CORRECTIVE_MAINTENANCE_POOL.length} Real Scenarios)
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setSelectedIdx(0); }}
                  style={{
                    background: selectedCategory === cat ? 'var(--color-processing-bg)' : 'var(--bg-elevated)',
                    color: selectedCategory === cat ? 'var(--color-processing)' : 'var(--text-muted)',
                    borderColor: selectedCategory === cat ? 'var(--color-processing-border)' : 'var(--border-default)',
                  }}
                  className="text-[8.5px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer whitespace-nowrap"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* INCIDENT SELECTION LIST */}
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-0.5">
            {filteredPool.map((t, idx) => {
              const isSelected = selectedIdx === idx
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedIdx(idx)}
                  style={{
                    background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    borderColor: isSelected ? 'var(--color-unknown)' : 'var(--border-subtle)',
                    borderWidth: '1.2px',
                    borderStyle: 'solid',
                  }}
                  className="rounded-xl p-2.5 cursor-pointer transition-all flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-processing)' }} className="font-mono text-[9px] font-bold flex items-center gap-1.5">
                      <span>{t.id}</span>
                      <span style={{ color: 'var(--text-muted)' }}>•</span>
                      <span
                        style={{
                          background: 'var(--bg-overlay)',
                          color: 'var(--text-secondary)',
                        }}
                        className="text-[8px] px-1.5 py-0.2 rounded"
                      >
                        {t.category}
                      </span>
                    </span>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                      t.route === 'known' ? 'bg-[rgba(142,227,185,0.2)] text-[#8ee3b9]' :
                      t.route === 'mid' ? 'bg-[rgba(255,194,209,0.2)] text-[#ffc2d1]' : 'bg-[rgba(251,111,146,0.2)] text-[#fb6f92]'
                    }`}>
                      {t.route === 'known' ? `KNOWN (${t.similarity.toFixed(2)})` :
                       t.route === 'mid' ? `MID (${t.similarity.toFixed(2)})` : `UNKNOWN (${t.similarity.toFixed(2)})`}
                    </span>
                  </div>

                  <div style={{ color: 'var(--text-primary)' }} className="text-xs font-bold mt-0.5">{t.title}</div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-[9.5px] line-clamp-2 leading-relaxed font-sans">{t.description}</div>

                  {isSelected && (
                    <div
                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                      className="mt-1 pt-1.5 space-y-1 font-mono text-[8.5px]"
                    >
                      <div className="truncate">
                        <span style={{ color: 'var(--text-muted)' }}>Service: </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{t.service}</span>
                      </div>
                      <div
                        style={{
                          background: 'var(--bg-base)',
                          color: 'var(--color-mid)',
                        }}
                        className="p-1 rounded text-[8px] truncate"
                      >
                        <span style={{ color: 'var(--color-unknown)' }}>[LOG] </span>{t.logSnippet}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* INGEST BUTTON */}
          <Button
            onClick={() => handleTriggerIngest(activeDef)}
            style={{
              background: 'linear-gradient(135deg, var(--color-unknown), var(--color-processing))',
              color: '#140c11',
              boxShadow: '0 4px 14px rgba(251,111,146,0.25)',
            }}
            className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-none cursor-pointer mt-1"
          >
            <Send size={13} />
            Ingest {activeDef.id} ({activePersona.name.split(' ')[0]}) into Floor
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
