'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  AlertTriangle,
  BookOpen,
  Cpu,
  ShieldAlert,
  BarChart3,
  Zap,
  Settings,
} from 'lucide-react'
import { useIncidentSimulationEngine } from '@/store/incident-simulation-engine'

const NAV_ITEMS = [
  { href: '/operations', label: 'Operations', icon: LayoutDashboard },
  { href: '/incidents',  label: 'Incidents',  icon: AlertTriangle },
  { href: '/knowledge',  label: 'Knowledge',  icon: BookOpen },
  { href: '/playbooks',  label: 'Playbooks',  icon: Zap },
  { href: '/automation', label: 'Automation', icon: Cpu },
  { href: '/reliability',label: 'Reliability',icon: ShieldAlert },
  { href: '/analytics',  label: 'Analytics',  icon: BarChart3 },
  { href: '/settings',   label: 'Settings',   icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const sim = useIncidentSimulationEngine()

  const hasActiveIncident = Boolean(sim.incidentId)
  const incidentId = sim.incidentId
  const title = sim.title || 'System Standby'
  const stage = sim.currentStage || 'Idle'
  const similarity = sim.similarity !== null ? sim.similarity.toFixed(2) : '--'
  const route = sim.route || 'STANDBY'

  const routeColor =
    route === 'known'   ? '#66865F' :
    route === 'mid'     ? '#B18435' :
    route === 'unknown' ? '#B45F63' :
    '#7A7470'

  return (
    <aside className="app-sidebar select-none" aria-label="Main Navigation">
      {/* ── Navigation Links ── */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto" role="navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/operations' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={isActive ? { color: '#7B3F45', background: '#E2D5D0' } : { color: '#4F5558' }}
            >
              <Icon size={14} className="flex-shrink-0" />
              <span className="flex-1 truncate text-xs">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom: Active Incident + Manager Card ── */}
      <div
        style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}
        className="p-3 flex flex-col gap-3"
      >
        {/* Active Incident or Standby Card */}
        <div
          style={{
            background: hasActiveIncident ? 'var(--color-human-bg)' : 'var(--bg-elevated)',
            border: `1px solid ${hasActiveIncident ? 'var(--color-human-border)' : 'var(--border-default)'}`,
            borderRadius: 5,
            boxShadow: 'var(--shadow-sm)',
          }}
          className="p-2.5 flex flex-col gap-1 transition-all"
        >
          {/* Status row */}
          <div className="flex items-center justify-between">
            <span
              style={{
                color: hasActiveIncident ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
              className="text-[9px] font-bold uppercase tracking-wider"
            >
              {hasActiveIncident ? 'ACTIVE INCIDENT' : 'SYSTEM STATUS'}
            </span>
            <span className="flex items-center gap-1">
              <span
                className={hasActiveIncident ? 'status-dot pulse' : 'status-dot green'}
                style={{
                  background: hasActiveIncident ? 'var(--color-human)' : 'var(--color-known)',
                }}
              />
              <span
                style={{
                  color: hasActiveIncident ? 'var(--accent)' : 'var(--color-known)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {hasActiveIncident ? incidentId : 'READY'}
              </span>
            </span>
          </div>

          {/* Title */}
          <div
            style={{ color: '#263238' }}
            className="text-[11px] font-semibold leading-tight truncate"
          >
            {title}
          </div>

          {hasActiveIncident ? (
            <>
              {/* Metrics grid */}
              <div
                style={{ borderTop: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}
                className="grid grid-cols-2 gap-1 pt-1.5 mt-0.5 text-[8px]"
              >
                <div>
                  <span style={{ color: '#7A7470' }} className="uppercase block">Stage</span>
                  <span style={{ color: '#54636B' }} className="font-bold uppercase">{stage}</span>
                </div>
                <div>
                  <span style={{ color: '#7A7470' }} className="uppercase block">Similarity</span>
                  <span style={{ color: routeColor, fontWeight: 700 }}>{similarity}</span>
                </div>
                <div className="col-span-2">
                  <span style={{ color: '#7A7470' }} className="uppercase block">Route</span>
                  <span style={{ color: routeColor, fontWeight: 700 }} className="uppercase">{route}</span>
                </div>
              </div>

              {/* Inspect link */}
              <Link
                href={`/incidents/${incidentId}`}
                style={{
                  background: '#7B3F45',
                  color: '#FFFFFF',
                  borderRadius: 4,
                }}
                className="mt-1.5 w-full py-1.5 text-[9px] font-bold text-center block transition-all hover:opacity-85"
              >
                Inspect Incident →
              </Link>
            </>
          ) : (
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                color: '#54636B',
              }}
              className="pt-1 mt-0.5 text-[9px]"
            >
              ● Operational — awaiting incident
            </div>
          )}
        </div>

        {/* ── Elena Rodriguez Profile ── */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 5,
            padding: '8px 10px',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="flex items-center gap-2.5"
        >
          <div
            style={{
              background: 'var(--bg-warm)',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
            }}
            className="w-8 h-8 flex items-center justify-center overflow-hidden flex-shrink-0"
          >
            <Image
              src="/assets/humans/Coworking-amico.svg"
              alt="Elena"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ color: '#263238' }} className="text-xs font-semibold truncate">
              Elena Rodriguez
            </div>
            <div style={{ color: '#54636B' }} className="text-[9px] flex items-center gap-1 mt-0.5">
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#66865F',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span>Incident Manager</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
