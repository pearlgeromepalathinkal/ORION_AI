import { create } from 'zustand'
import type { HumanParticipant, HumanRole, HumanState, SoftwareStation, StationId, StationState, WorkflowEvent } from '@/types'

const INITIAL_HUMANS: HumanParticipant[] = [
  // Command & Management (HITL Authority)
  {
    id: 'elena',
    name: 'Elena Rostova',
    title: 'Incident Manager',
    role: 'Incident Manager',
    specialization: 'HITL Authority & Governance',
    avatar: '/assets/humans/Coworking-amico.svg',
    state: 'idle',
  },
  // Systems Engineering Pool (Shared Human Response Pool)
  {
    id: 'alex',
    name: 'Alex Rivera',
    title: 'Systems Engineer',
    role: 'Systems Engineer',
    specialization: 'Network & Connectivity',
    avatar: '/assets/humans/Developer activity-cuate.svg',
    state: 'idle',
  },
  {
    id: 'sam',
    name: 'Sam Taylor',
    title: 'Systems Engineer',
    role: 'Systems Engineer',
    specialization: 'Server & Operating Systems',
    avatar: '/assets/humans/Software engineer-amico.svg',
    state: 'idle',
  },
  {
    id: 'jordan',
    name: 'Jordan Hayes',
    title: 'Systems Engineer',
    role: 'Systems Engineer',
    specialization: 'Database & Storage',
    avatar: '/assets/humans/Developer activity-cuate.svg',
    state: 'idle',
  },
  {
    id: 'taylor',
    name: 'Taylor Morgan',
    title: 'Systems Engineer',
    role: 'Systems Engineer',
    specialization: 'Cloud & Infrastructure',
    avatar: '/assets/humans/Software engineer-amico.svg',
    state: 'idle',
  },
  {
    id: 'riley',
    name: 'Riley Brooks',
    title: 'Systems Engineer',
    role: 'Systems Engineer',
    specialization: 'Identity & Security',
    avatar: '/assets/humans/In the office-amico.svg',
    state: 'idle',
  },
  // Operations / SRE
  {
    id: 'marcus',
    name: 'Marcus Vance',
    title: 'DevOps / SRE Engineer',
    role: 'DevOps / SRE Engineer',
    specialization: 'Production Reliability & Telemetry',
    avatar: '/assets/humans/Software engineer-amico.svg',
    state: 'idle',
  },
  // QA / Verification Lab
  {
    id: 'maya',
    name: 'Maya Lin',
    title: 'QA Lead',
    role: 'QA Lead',
    specialization: 'Resolution Acceptance & Oversight',
    avatar: '/assets/humans/Coworking-amico.svg',
    state: 'idle',
  },
  {
    id: 'noah',
    name: 'Noah Sterling',
    title: 'QA Engineer',
    role: 'QA Engineer',
    specialization: 'Functional & System Testing',
    avatar: '/assets/humans/Shared workspace-amico.svg',
    state: 'idle',
  },
  {
    id: 'ananya',
    name: 'Ananya Sharma',
    title: 'Automation Engineer',
    role: 'Automation Engineer',
    specialization: 'Repeatable Validation & Automation',
    avatar: '/assets/humans/In the office-amico.svg',
    state: 'idle',
  },
]

const INITIAL_STATIONS: SoftwareStation[] = [
  { id: 'intake', label: 'ORION Intake', description: 'Receives and normalizes IT support tickets via POST /orion-ai/intake', state: 'idle' },
  { id: 'semantic', label: 'Intent Engine', description: 'Classifies intent, scope and service domain via semantic embeddings', state: 'idle' },
  { id: 'knowledge_search', label: 'Federated KB', description: 'Parallel retrieval across Confluence, SharePoint & distributed silos', state: 'idle' },
  { id: 'routing', label: 'Risk & Routing', description: 'Risk assessment & decision engine (Resolve · Clarify · Escalate · Reject)', state: 'idle' },
  { id: 'devops_infra', label: 'SRE Monitor', description: 'Continuous production health telemetry & operational signals', state: 'idle' },
  { id: 'ai_diagnostics', label: 'AI Diagnostics', description: 'Evidence-based root-cause analysis & remediation recommendations', state: 'idle' },
  { id: 'playbook', label: 'Playbook Engine', description: 'Remediation procedures & parameterization for systems engineers', state: 'idle' },
  { id: 'verification', label: 'Verification Engine', description: 'Closed-loop verification executing 5-point post-remediation health checks', state: 'idle' },
  { id: 'resolution', label: 'Resolution Engine', description: 'Finalizes incident resolution and updates external Jira ticket', state: 'idle' },
  { id: 'knowledge_lab', label: 'Provenance / Audit', description: 'Records immutable evidence citations, decisions, approvals and audit trail', state: 'idle' },
]

interface ActivityEntry {
  id: string
  time: string
  eventType: string
  message: string
  stage: string
  incidentId: string
  color?: string
}

export interface InvestigationCheck {
  name: string
  status: 'pending' | 'checking' | 'passed' | 'failed'
}

interface OperationsState {
  // Human participants
  humans: HumanParticipant[]
  setHumanState: (role: HumanRole, state: HumanState, incidentId?: string, actionMessage?: string, progress?: number) => void
  resetHumans: () => void

  // Software stations
  stations: SoftwareStation[]
  setStationState: (id: StationId, state: StationState, incidentId?: string, operation?: string) => void
  resetStations: () => void

  // Active incident
  activeIncidentId: string | null
  setActiveIncidentId: (id: string | null) => void
  activeIncidentTitle: string | null
  setActiveIncidentTitle: (title: string | null) => void
  activeIncidentPriority: 'P1' | 'P2' | 'P3' | 'P4'
  setActiveIncidentPriority: (p: 'P1' | 'P2' | 'P3' | 'P4') => void

  // Current workflow stage
  currentStage: string
  setCurrentStage: (stage: string) => void

  // Current route
  currentRoute: 'known' | 'mid' | 'unknown' | null
  setCurrentRoute: (route: 'known' | 'mid' | 'unknown' | null) => void

  // Similarity score & search metrics
  currentSimilarity: number | null
  setCurrentSimilarity: (score: number | null) => void
  searchLatencyMs: number
  setSearchLatencyMs: (ms: number) => void
  totalSolutionsCount: number
  incrementSolutionsCount: () => void

  // Marcus SRE Investigation Interactive State
  marcusInvestigation: {
    isRunning: boolean
    isComplete: boolean
    checks: InvestigationCheck[]
    rootCauseFound: string | null
  }
  startMarcusInvestigation: () => void
  setMarcusInvestigationChecks: (checks: InvestigationCheck[]) => void
  completeMarcusInvestigation: (rootCause: string) => void
  resetMarcusInvestigation: () => void

  // David Developer Interactive State
  davidSelectedSolution: string | null
  setDavidSelectedSolution: (sol: string | null) => void

  // Live activity feed
  activityFeed: ActivityEntry[]
  addActivityEntry: (event: WorkflowEvent) => void
  addManualActivity: (entry: Omit<ActivityEntry, 'id' | 'time'>) => void

  // Open drawers
  openHumanDrawer: HumanRole | null
  setOpenHumanDrawer: (role: HumanRole | null) => void
  openStationDrawer: StationId | null
  setOpenStationDrawer: (id: StationId | null) => void

  // Reset everything
  resetAll: () => void
}

const INITIAL_CHECKS: InvestigationCheck[] = [
  { name: 'Gateway health probe', status: 'pending' },
  { name: 'Authentication token validity', status: 'pending' },
  { name: 'Network socket latency', status: 'pending' },
  { name: 'Database connection pool locks', status: 'pending' },
]

export const useOperationsStore = create<OperationsState>((set) => ({
  humans: INITIAL_HUMANS,
  setHumanState: (role, state, incidentId, actionMessage, progress) =>
    set((s) => ({
      humans: s.humans.map((h) => {
        const matches =
          h.id === role ||
          (role === 'commander' && h.id === 'elena') ||
          (role === 'sre' && h.id === 'marcus') ||
          (role === 'developer' && (s.humans.some(x => x.id === 'alex' && x.state !== 'idle') ? h.id === 'alex' : h.id === 'alex' || h.id === 'jordan')) ||
          (role === 'curator' && h.id === 'maya')

        return matches
          ? {
              ...h,
              state,
              currentIncidentId: incidentId !== undefined ? incidentId : h.currentIncidentId,
              actionMessage: actionMessage !== undefined ? actionMessage : h.actionMessage,
              taskProgress: progress !== undefined ? progress : h.taskProgress,
              activeSince: state !== 'idle' ? (h.activeSince || new Date().toISOString()) : undefined,
            }
          : h
      }),
    })),
  resetHumans: () => set({ humans: INITIAL_HUMANS }),

  stations: INITIAL_STATIONS,
  setStationState: (id, state, incidentId, operation) =>
    set((s) => ({
      stations: s.stations.map((st) =>
        st.id === id ? { ...st, state, currentIncidentId: incidentId, lastOperation: operation } : st
      ),
    })),
  resetStations: () => set({ stations: INITIAL_STATIONS }),

  activeIncidentId: null,
  setActiveIncidentId: (id) => set({ activeIncidentId: id }),
  activeIncidentTitle: null,
  setActiveIncidentTitle: (title) => set({ activeIncidentTitle: title }),
  activeIncidentPriority: 'P3',
  setActiveIncidentPriority: (p) => set({ activeIncidentPriority: p }),

  currentStage: '',
  setCurrentStage: (stage) => set({ currentStage: stage }),

  currentRoute: null,
  setCurrentRoute: (route) => set({ currentRoute: route }),

  currentSimilarity: null,
  setCurrentSimilarity: (score) => set({ currentSimilarity: score }),
  searchLatencyMs: 142,
  setSearchLatencyMs: (ms) => set({ searchLatencyMs: ms }),
  totalSolutionsCount: 1248,
  incrementSolutionsCount: () => set((s) => ({ totalSolutionsCount: s.totalSolutionsCount + 1 })),

  marcusInvestigation: {
    isRunning: false,
    isComplete: false,
    checks: INITIAL_CHECKS,
    rootCauseFound: null,
  },
  startMarcusInvestigation: () =>
    set((s) => ({
      marcusInvestigation: {
        ...s.marcusInvestigation,
        isRunning: true,
        isComplete: false,
        checks: INITIAL_CHECKS.map((c) => ({ ...c, status: 'checking' })),
      },
    })),
  setMarcusInvestigationChecks: (checks) =>
    set((s) => ({
      marcusInvestigation: { ...s.marcusInvestigation, checks },
    })),
  completeMarcusInvestigation: (rootCause) =>
    set((s) => ({
      marcusInvestigation: {
        isRunning: false,
        isComplete: true,
        checks: INITIAL_CHECKS.map((c) => ({ ...c, status: 'passed' })),
        rootCauseFound: rootCause,
      },
    })),
  resetMarcusInvestigation: () =>
    set({
      marcusInvestigation: {
        isRunning: false,
        isComplete: false,
        checks: INITIAL_CHECKS,
        rootCauseFound: null,
      },
    }),

  davidSelectedSolution: 'Restart connection pool manager & increase timeout to 30s',
  setDavidSelectedSolution: (sol) => set({ davidSelectedSolution: sol }),

  activityFeed: [],
  addActivityEntry: (event) =>
    set((s) => ({
      activityFeed: [
        {
          id: event.id,
          time: new Date(event.createdAt).toLocaleTimeString('en-US', { hour12: false }),
          eventType: event.eventType,
          message: event.message,
          stage: event.stage,
          incidentId: event.incidentId,
        },
        ...s.activityFeed.slice(0, 49),
      ],
    })),
  addManualActivity: (entry) =>
    set((s) => ({
      activityFeed: [
        { ...entry, id: crypto.randomUUID(), time: new Date().toLocaleTimeString('en-US', { hour12: false }) },
        ...s.activityFeed.slice(0, 49),
      ],
    })),

  openHumanDrawer: null,
  setOpenHumanDrawer: (role) => set({ openHumanDrawer: role }),
  openStationDrawer: null,
  setOpenStationDrawer: (id) => set({ openStationDrawer: id }),

  resetAll: () =>
    set({
      humans: INITIAL_HUMANS,
      stations: INITIAL_STATIONS,
      activeIncidentId: null,
      activeIncidentTitle: null,
      activeIncidentPriority: 'P3',
      currentStage: '',
      currentRoute: null,
      currentSimilarity: null,
      searchLatencyMs: 142,
      totalSolutionsCount: 1248,
      marcusInvestigation: {
        isRunning: false,
        isComplete: false,
        checks: INITIAL_CHECKS,
        rootCauseFound: null,
      },
      davidSelectedSolution: 'Restart connection pool manager & increase timeout to 30s',
      activityFeed: [],
      openHumanDrawer: null,
      openStationDrawer: null,
    }),
}))
