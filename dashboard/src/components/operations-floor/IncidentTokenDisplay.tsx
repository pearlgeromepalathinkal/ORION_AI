'use client'
import { useOperationsStore } from '@/store/operations-store'
import { motion, AnimatePresence } from 'framer-motion'

const PRIORITY_COLOR: Record<string, string> = {
  P1: 'var(--color-unknown)',
  P2: 'var(--color-mid)',
  P3: 'var(--color-processing)',
  P4: 'var(--text-muted)',
}

const STAGE_INCIDENT_MAP: Record<string, string> = {
  'INC-1042': 'VPN Authentication Failure',
  'INC-1067': 'Database Connection Pool Exhaustion',
  'INC-1088': 'Novel Database Deadlock Pattern',
}

export function IncidentTokenDisplay() {
  const { activeIncidentId, currentStage, currentRoute, currentSimilarity } = useOperationsStore()

  if (!activeIncidentId) {
    return (
      <div
        className="incident-token flex flex-col gap-1"
        style={{ minWidth: 130, opacity: 0.4 }}
        aria-label="No active incident"
      >
        <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          ACTIVE INCIDENT
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Awaiting incident...
        </span>
      </div>
    )
  }

  const title = STAGE_INCIDENT_MAP[activeIncidentId] || 'Incident Processing'
  const priority = activeIncidentId === 'INC-1088' ? 'P1' : activeIncidentId === 'INC-1067' ? 'P2' : 'P3'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeIncidentId}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="incident-token flex flex-col gap-1 flex-shrink-0"
        style={{ minWidth: 148 }}
        role="status"
        aria-live="polite"
        aria-label={`Active incident: ${activeIncidentId} — ${title} — Stage: ${currentStage}`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-processing)' }}>
            ACTIVE INCIDENT
          </span>
          <span
            className="text-[8px] font-black"
            style={{ color: PRIORITY_COLOR[priority] }}
          >
            {priority}
          </span>
        </div>

        <div className="font-mono text-xs font-bold" style={{ color: 'var(--color-processing)' }}>
          {activeIncidentId}
        </div>

        <div className="text-[10px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </div>

        {currentStage && (
          <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
            Stage: {currentStage}
          </div>
        )}

        {currentRoute && currentSimilarity !== null && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`route-badge ${currentRoute}`} style={{ fontSize: 8 }}>
              {currentRoute.toUpperCase()}
            </span>
            <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
              {currentSimilarity.toFixed(2)}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
