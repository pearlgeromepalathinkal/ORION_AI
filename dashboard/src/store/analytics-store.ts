/**
 * ORION-AI — Analytics Aggregation Store
 *
 * Accumulates live workflow telemetry ONLY when mode === 'LIVE'.
 * Zero simulation data leaks into analytics.
 */
import { create } from 'zustand'

export interface AnalyticsEvent {
  id: string
  ts: number
  timeStr: string
  incidentId: string
  eventType: string
  message: string
  route?: string
}

export interface MttrEntry {
  ts: number
  ms: number
  route: string
}

export interface AnalyticsState {
  totalIncidents: number
  knownCount: number
  midCount: number
  unknownCount: number
  highRiskCount: number
  outOfScopeCount: number

  autonomousCount: number
  assistedCount: number
  humanReviewCount: number
  escalatedCount: number

  verifiedCount: number
  verificationFailedCount: number

  aiDiagnosticsRun: number
  hitlApproved: number
  hitlModified: number
  hitlRejected: number
  verificationPassedAfterHitl: number

  mttrHistory: MttrEntry[]
  averageMttr: number | null

  averageEvidenceConfidence: number | null
  evidenceConfidenceSamples: number[]

  averageDiagnosticConfidence: number | null
  diagnosticConfidenceSamples: number[]

  latencyByStage: Record<string, number | null>

  recentEvents: AnalyticsEvent[]
  lastUpdated: number | null

  recordIncident: (payload: {
    incidentId: string
    route: 'known' | 'mid' | 'unknown' | 'high_risk' | 'out_of_scope'
    isHighRisk?: boolean
    mttrMs?: number
    evidenceConfidence?: number
  }) => void

  recordResolutionOutcome: (payload: {
    outcome: 'autonomous' | 'assisted' | 'human_review' | 'escalated'
    verificationPassed?: boolean
    mttrMs?: number
    route?: string
  }) => void

  recordHITLDecision: (decision: 'APPROVE' | 'MODIFY' | 'REJECT') => void
  recordAIDiagnostics: (confidence?: number) => void
  recordVerification: (passed: boolean) => void
  recordLatency: (stage: string, ms: number) => void
  addEvent: (event: Omit<AnalyticsEvent, 'id' | 'ts' | 'timeStr'>) => void
  clearLiveData: () => void
}

const INITIAL_LATENCY: Record<string, number | null> = {
  intake: null, intent: null, retrieval: null, evidence: null,
  decision: null, ai_diagnostics: null, human_review: null,
  verification: null, jira: null,
}

function avg(arr: number[]): number | null {
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

const INITIAL_STATE = {
  totalIncidents: 0, knownCount: 0, midCount: 0, unknownCount: 0,
  highRiskCount: 0, outOfScopeCount: 0, autonomousCount: 0,
  assistedCount: 0, humanReviewCount: 0, escalatedCount: 0,
  verifiedCount: 0, verificationFailedCount: 0, aiDiagnosticsRun: 0,
  hitlApproved: 0, hitlModified: 0, hitlRejected: 0,
  verificationPassedAfterHitl: 0, mttrHistory: [] as MttrEntry[],
  averageMttr: null, averageEvidenceConfidence: null,
  evidenceConfidenceSamples: [] as number[], averageDiagnosticConfidence: null,
  diagnosticConfidenceSamples: [] as number[],
  latencyByStage: { ...INITIAL_LATENCY }, recentEvents: [] as AnalyticsEvent[],
  lastUpdated: null,
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  ...INITIAL_STATE,

  recordIncident: (payload) =>
    set((s) => {
      const next = { ...s, totalIncidents: s.totalIncidents + 1, lastUpdated: Date.now() }
      if (payload.isHighRisk || payload.route === 'high_risk') next.highRiskCount += 1
      else if (payload.route === 'known') next.knownCount += 1
      else if (payload.route === 'mid') next.midCount += 1
      else if (payload.route === 'unknown') next.unknownCount += 1
      else if (payload.route === 'out_of_scope') next.outOfScopeCount += 1

      if (payload.evidenceConfidence != null) {
        const samples = [...s.evidenceConfidenceSamples, payload.evidenceConfidence]
        next.evidenceConfidenceSamples = samples
        next.averageEvidenceConfidence = avg(samples)
      }
      if (payload.mttrMs != null) {
        const hist = [...s.mttrHistory, { ts: Date.now(), ms: payload.mttrMs, route: payload.route }].slice(-200)
        next.mttrHistory = hist
        next.averageMttr = avg(hist.map((e) => e.ms))
      }
      return next
    }),

  recordResolutionOutcome: (payload) =>
    set((s) => {
      const next = { ...s, lastUpdated: Date.now() }
      if (payload.outcome === 'autonomous') next.autonomousCount += 1
      else if (payload.outcome === 'assisted') next.assistedCount += 1
      else if (payload.outcome === 'human_review') next.humanReviewCount += 1
      else if (payload.outcome === 'escalated') next.escalatedCount += 1
      if (payload.verificationPassed === true) next.verifiedCount += 1
      if (payload.verificationPassed === false) next.verificationFailedCount += 1
      if (payload.mttrMs != null) {
        const hist = [...s.mttrHistory, { ts: Date.now(), ms: payload.mttrMs, route: payload.route || 'unknown' }].slice(-200)
        next.mttrHistory = hist
        next.averageMttr = avg(hist.map((e) => e.ms))
      }
      return next
    }),

  recordHITLDecision: (decision) =>
    set((s) => {
      const next = { ...s, lastUpdated: Date.now() }
      if (decision === 'APPROVE') next.hitlApproved += 1
      else if (decision === 'MODIFY') next.hitlModified += 1
      else if (decision === 'REJECT') { next.hitlRejected += 1; next.escalatedCount += 1 }
      return next
    }),

  recordAIDiagnostics: (confidence) =>
    set((s) => {
      const next = { ...s, aiDiagnosticsRun: s.aiDiagnosticsRun + 1, lastUpdated: Date.now() }
      if (confidence != null) {
        const samples = [...s.diagnosticConfidenceSamples, confidence]
        next.diagnosticConfidenceSamples = samples
        next.averageDiagnosticConfidence = avg(samples)
      }
      return next
    }),

  recordVerification: (passed) =>
    set((s) => ({
      verifiedCount: passed ? s.verifiedCount + 1 : s.verifiedCount,
      verificationFailedCount: !passed ? s.verificationFailedCount + 1 : s.verificationFailedCount,
      verificationPassedAfterHitl: passed ? s.verificationPassedAfterHitl + 1 : s.verificationPassedAfterHitl,
      lastUpdated: Date.now(),
    })),

  recordLatency: (stage, ms) =>
    set((s) => ({ latencyByStage: { ...s.latencyByStage, [stage]: ms }, lastUpdated: Date.now() })),

  addEvent: (event) =>
    set((s) => {
      const now = Date.now()
      const entry: AnalyticsEvent = {
        ...event,
        id: crypto.randomUUID(),
        ts: now,
        timeStr: new Date(now).toLocaleTimeString('en-US', { hour12: false }),
      }
      return { recentEvents: [entry, ...s.recentEvents].slice(0, 100), lastUpdated: now }
    }),

  clearLiveData: () => set({ ...INITIAL_STATE, latencyByStage: { ...INITIAL_LATENCY } }),
}))
