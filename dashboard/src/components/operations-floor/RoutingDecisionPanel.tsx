'use client'
import { useOperationsStore } from '@/store/operations-store'
import { motion, AnimatePresence } from 'framer-motion'

export function RoutingDecisionPanel() {
  const { currentRoute, currentSimilarity } = useOperationsStore()

  if (!currentRoute || currentSimilarity === null) {
    return (
      <div
        className="mt-2 rounded-lg px-3 py-2 flex items-center gap-3"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
        aria-label="Routing decision panel — waiting for incident"
      >
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Routing Engine: Awaiting incident
        </span>
      </div>
    )
  }

  const routeConfig = {
    known: {
      label: 'KNOWN',
      threshold: '≥ 0.85',
      action: 'AUTO RESOLVE',
      description: 'Confidence above threshold — autonomous playbook execution',
      color: 'var(--color-known)',
      bg: 'var(--color-known-bg)',
      border: 'var(--color-known-border)',
    },
    mid: {
      label: 'MID',
      threshold: '0.55–0.84',
      action: 'DEVELOPER ASSIST',
      description: 'Partial confidence — human developer judgment required',
      color: 'var(--color-mid)',
      bg: 'var(--color-mid-bg)',
      border: 'var(--color-mid-border)',
    },
    unknown: {
      label: 'UNKNOWN',
      threshold: '< 0.55',
      action: 'AI DIAGNOSIS + HUMAN',
      description: 'Novel incident — AI hypothesis generation + Tier-3 SRE review',
      color: 'var(--color-unknown)',
      bg: 'var(--color-unknown-bg)',
      border: 'var(--color-unknown-border)',
    },
  }

  const cfg = routeConfig[currentRoute]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentRoute}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-2 rounded-lg px-4 py-2 flex items-center gap-4"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        role="status"
        aria-live="polite"
        aria-label={`Routing decision: similarity ${currentSimilarity?.toFixed(2)} — route ${currentRoute} — action ${cfg.action}`}
      >
        <div className="flex flex-col" style={{ minWidth: 80 }}>
          <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            SIMILARITY
          </span>
          <span className="text-xl font-black font-mono" style={{ color: cfg.color }}>
            {currentSimilarity?.toFixed(2)}
          </span>
        </div>

        <div
          className="w-px self-stretch"
          style={{ background: cfg.border }}
          aria-hidden="true"
        />

        <div className="flex flex-col">
          <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            ROUTE
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="route-badge"
              style={{ fontSize: 11, padding: '3px 8px' }}
              data-route={currentRoute}
            >
              {cfg.label} {cfg.threshold}
            </span>
            <span className="text-[10px] font-bold" style={{ color: cfg.color }}>
              → {cfg.action}
            </span>
          </div>
        </div>

        <div
          className="w-px self-stretch"
          style={{ background: cfg.border }}
          aria-hidden="true"
        />

        <div className="text-[10px] flex-1" style={{ color: 'var(--text-secondary)' }}>
          {cfg.description}
        </div>

        <div className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
          Deterministic · Auditable
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
