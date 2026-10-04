/**
 * ORION-AI — Deterministic Incident Simulation Engine
 * 
 * Centralized, typed finite state machine driving:
 * - 10 Human team members + 1 Client visitor:
 *   Elena, Alex, Sam, Jordan, Taylor, Riley, Marcus, Maya, Noah, Ananya, Client.
 * - Realistic office interaction:
 *   1. Client arrives at Reception / Visiting Hall
 *   2. Elena physically walks to Reception to meet Client
 *   3. Client hands off physical animated incident envelope to Elena
 *   4. Elena evaluates classification and physically walks to the assigned engineer
 *   5. Engineer acknowledges assignment and walks to workstation/playbook
 *   6. QA verifies
 *   7. Engineer reports to Elena
 *   8. Elena confirms: SITE LIVE!
 *   9. Everyone returns home smoothly
 * - Synced Live Event Feed with [SIMULATION] / [LIVE EXECUTION] tag.
 */
import { create } from 'zustand'
import { runOrionWorkflowSync } from '@/lib/orion-api'

export type ExecutionMode = 'SIMULATION' | 'LIVE'
export type IncidentSeverity = 'P1' | 'P2' | 'P3' | 'P4'
export type IncidentRoute = 'known' | 'mid' | 'unknown'

export type IncidentStatus =
  | 'idle'
  | 'received'
  | 'normalizing'
  | 'embedding'
  | 'searching'
  | 'routing'
  | 'awaiting_human'
  | 'investigating'
  | 'executing'
  | 'verifying'
  | 'resolved'
  | 'knowledge_capture'
  | 'failed'

export type CanonicalStage =
  | 'idle'
  | 'received'
  | 'normalized'
  | 'embedded'
  | 'knowledge_search'
  | 'routing'
  | 'remediation'
  | 'verification'
  | 'resolution'
  | 'knowledge_capture'

export type StationId =
  | 'commander'
  | 'intake'
  | 'semantic'
  | 'knowledge_search'
  | 'routing'
  // 5 Systems Engineers Desks
  | 'engineer_alex'
  | 'engineer_sam'
  | 'engineer_jordan'
  | 'engineer_taylor'
  | 'engineer_riley'
  // Compatibility aliases
  | 'developer_david'
  | 'developer_priya'
  | 'developer_arjun'
  | 'developer_sofia'
  | 'developer_daniel'
  | 'devops_marcus'
  | 'devops_infra'
  | 'ai_diagnostics'
  | 'qa_maya'
  | 'qa_noah'
  | 'qa_ananya'
  | 'qa_testing'
  | 'playbook'
  | 'verification'
  | 'resolution'
  | 'knowledge_lab'
  | 'client_entrance'
  | 'client_reception'
  | 'reception_meet'

export type HumanRole =
  | 'elena'
  | 'alex'
  | 'sam'
  | 'jordan'
  | 'taylor'
  | 'riley'
  | 'marcus'
  | 'maya'
  | 'noah'
  | 'ananya'
  | 'client'
  // legacy aliases
  | 'david'
  | 'priya'
  | 'arjun'
  | 'sofia'
  | 'daniel'

export type EventType =
  | 'incident_received'
  | 'incident_normalized'
  | 'embedding_generated'
  | 'knowledge_search_completed'
  | 'routing_decision'
  | 'station_activated'
  | 'human_assigned'
  | 'human_accepted'
  | 'task_bubble_shown'
  | 'playbook_started'
  | 'playbook_step_completed'
  | 'verification_started'
  | 'verification_passed'
  | 'verification_failed'
  | 'incident_resolved'
  | 'knowledge_candidate_created'
  | 'knowledge_approved'

export interface IncidentEvent {
  id: string
  type: EventType
  incidentId: string
  timestamp: string
  stage: CanonicalStage
  station?: StationId
  actor?: string
  message: string
  metadata?: Record<string, unknown>
}

export interface IncidentState {
  incidentId: string | null
  title: string | null
  severity: IncidentSeverity | null
  similarity: number | null
  route: IncidentRoute | null
  currentStage: CanonicalStage
  currentStation: StationId | null
  status: IncidentStatus
  mode: ExecutionMode
  assignedHuman: HumanRole | null
  playbookId: string | null
  verificationStatus: 'pending' | 'verifying' | 'passed' | 'failed'
  knowledgeCandidate: {
    id: string
    title: string
    resolution: string
    similarityBefore: number
    similarityAfter: number
  } | null
  timeline: IncidentEvent[]
  startedAt: string | null
  completedAt: string | null
  clientName?: string
  clientRole?: string
  activeLogSnippet?: string
  activeMetrics?: {
    latencyBefore: number
    latencyAfter: number
    errorRateBefore: number
    errorRateAfter: number
    saturationBefore: number
    saturationAfter: number
  }
}

export interface FloorObserver {
  onStationTransition?: (station: StationId, incidentId: string) => void
  onRouteSelected?: (route: IncidentRoute) => void
  onHumanStateChange?: (human: HumanRole, state: 'idle' | 'alerted' | 'standing' | 'walking' | 'working' | 'talking' | 'waiting' | 'entering' | 'handing_over' | 'reviewing' | 'investigating' | 'approved' | 'success' | 'returning') => void
  onHumanWalk?: (human: HumanRole, station: StationId, taskBubble?: string) => Promise<void>
  onWalkCharacterToCharacter?: (src: HumanRole, dst: HumanRole, taskBubble?: string) => Promise<void>
  onHumanBubble?: (human: HumanRole, text: string, type?: string) => void
  onHumanReturnHome?: (human: HumanRole) => Promise<void>
  onKnowledgeBubble?: () => void
  onResetScene?: () => void
  onClientArrive?: (name?: string, role?: string) => Promise<void>
  onClientExit?: () => Promise<void>
  onClientMail?: () => Promise<void>
  onMailNotification?: (title: string, incidentId: string, severity: string) => void
  onDevOpsHighActivity?: (active: boolean) => void
}

export interface SimulationEngineStore extends IncidentState {
  isPlaying: boolean
  replayBanner: string | null
  executionSpeedMs: number

  setMode: (mode: ExecutionMode) => void
  setSpeed: (ms: number) => void
  reset: () => void

  runKnownScenario: (override?: Partial<CorrectiveIncidentDefinition> & { clientName?: string; clientRole?: string }) => Promise<void>
  runMidScenario: (onAwaitingDecision?: () => void, override?: Partial<CorrectiveIncidentDefinition> & { clientName?: string; clientRole?: string }) => Promise<void>
  runUnknownScenario: (onAwaitingApproval?: () => void, override?: Partial<CorrectiveIncidentDefinition> & { clientName?: string; clientRole?: string }) => Promise<void>
  runReplayScenario: () => Promise<void>
  runFailureScenario: (override?: Partial<CorrectiveIncidentDefinition> & { clientName?: string; clientRole?: string }) => Promise<void>
  runRandomCorrectiveScenario: (onAwaitingDecision?: () => void, onAwaitingApproval?: () => void) => Promise<void>
  loadTicketForInspection: (ticket: {
    id: string
    title: string
    route?: 'known' | 'mid' | 'unknown'
    similarity?: number
    assignedHuman?: HumanRole | string
    status?: string
    priority?: string
    timeline?: IncidentEvent[]
  }) => void

  approveHumanFix: () => Promise<void>
  approveElenaSignoff: () => Promise<void>

  registerFloorObserver: (observer: FloorObserver) => () => void
}

export interface CorrectiveIncidentDefinition {
  id: string
  title: string
  service: string
  category: 'Backend' | 'Database' | 'Infrastructure' | 'Cache' | 'Streaming' | 'Security'
  priority: IncidentSeverity
  route: IncidentRoute
  similarity: number
  description: string
  playbookId?: string
  logSnippet: string
  rootCause: string
  resolution: string
  latencyBefore: number
  latencyAfter: number
  errorRateBefore: number
  errorRateAfter: number
  saturationBefore: number
  saturationAfter: number
}

export const CLIENT_PERSONAS = [
  { name: 'Sarah Lin', role: 'VP Engineering, CloudScale' },
  { name: 'Robert Chen', role: 'Ops Director, RetailCorp' },
  { name: 'Marcus Brody', role: 'FinPay Infra Lead' },
  { name: 'Amina Morales', role: 'Head of Cloud Infra, DataFlow' },
  { name: 'James Wilson', role: 'Lead Architect, LogisticsX' },
  { name: 'Chloe Dupont', role: 'Staff SRE, PayGlobal' },
]

export function resolveSystemsEngineer(incident: {
  category?: string
  title?: string
  service?: string
  description?: string
}): {
  id: HumanRole
  name: string
  role: string
  specialization: string
  deskStation: StationId
} {
  const text = `${incident.category || ''} ${incident.title || ''} ${incident.service || ''} ${incident.description || ''}`.toLowerCase()

  // 1. Network & Connectivity -> Alex
  if (text.includes('vpn') || text.includes('dns') || text.includes('network') || text.includes('socket') || text.includes('firewall') || text.includes('gateway') || text.includes('connectivity') || text.includes('route')) {
    return {
      id: 'alex',
      name: 'Alex Rivera',
      role: 'Systems Engineer',
      specialization: 'Network & Connectivity',
      deskStation: 'engineer_alex',
    }
  }

  // 2. Database & Storage -> Jordan
  if (text.includes('database') || text.includes('db') || text.includes('postgres') || text.includes('sql') || text.includes('pool') || text.includes('storage') || text.includes('disk') || text.includes('deadlock') || text.includes('redis') || text.includes('cache')) {
    return {
      id: 'jordan',
      name: 'Jordan Hayes',
      role: 'Systems Engineer',
      specialization: 'Database & Storage',
      deskStation: 'engineer_jordan',
    }
  }

  // 3. Server & OS -> Sam
  if (text.includes('server') || text.includes('linux') || text.includes('windows') || text.includes('process') || text.includes('daemon') || text.includes('system service') || text.includes('host') || text.includes('unavailable')) {
    return {
      id: 'sam',
      name: 'Sam Taylor',
      role: 'Systems Engineer',
      specialization: 'Server & Operating Systems',
      deskStation: 'engineer_sam',
    }
  }

  // 4. Cloud & Infrastructure -> Taylor
  if (text.includes('cloud') || text.includes('vm') || text.includes('virtual machine') || text.includes('compute') || text.includes('infra') || text.includes('cluster') || text.includes('kafka') || text.includes('kubernetes') || text.includes('node') || text.includes('deployment')) {
    return {
      id: 'taylor',
      name: 'Taylor Morgan',
      role: 'Systems Engineer',
      specialization: 'Cloud & Infrastructure',
      deskStation: 'engineer_taylor',
    }
  }

  // 5. Identity & Security -> Riley
  if (text.includes('auth') || text.includes('security') || text.includes('token') || text.includes('crypto') || text.includes('cert') || text.includes('sso') || text.includes('identity') || text.includes('access') || text.includes('privilege') || text.includes('handshake')) {
    return {
      id: 'riley',
      name: 'Riley Brooks',
      role: 'Systems Engineer',
      specialization: 'Identity & Security',
      deskStation: 'engineer_riley',
    }
  }

  // Default to Alex (Network & Connectivity)
  return {
    id: 'alex',
    name: 'Alex Rivera',
    role: 'Systems Engineer',
    specialization: 'Network & Connectivity',
    deskStation: 'engineer_alex',
  }
}

export const CORRECTIVE_MAINTENANCE_POOL: CorrectiveIncidentDefinition[] = [
  {
    id: 'INC-1042',
    title: 'VPN Gateway Session Cache Invalidation',
    service: 'Gateway Auth Daemon',
    category: 'Backend',
    priority: 'P2',
    route: 'known',
    similarity: 0.94,
    description: 'VPN auth daemon returning invalid session handshake. High concurrency token expiry triggering connection drops.',
    playbookId: 'VPN-AUTH-01',
    logSnippet: 'SessionAuthError: Handshake token 0x8f2 expired prematurely. 142 clients dropped in 30s.',
    rootCause: 'Stale session cache caused token invalidation race under concurrency.',
    resolution: 'Flushed Redis session cache and restarted auth daemon.',
    latencyBefore: 1420,
    latencyAfter: 12,
    errorRateBefore: 18.4,
    errorRateAfter: 0.00,
    saturationBefore: 94,
    saturationAfter: 8,
  },
  {
    id: 'EPL-1067',
    title: 'Database Connection Pool Exhaustion on Checkout',
    service: 'Checkout DB Cluster',
    category: 'Database',
    priority: 'P1',
    route: 'mid',
    similarity: 0.78,
    description: 'PostgreSQL connection pool exhausted at 100% capacity under batch order processing, causing HTTP 504 timeouts.',
    playbookId: 'DB-POOL-RESIZE',
    logSnippet: 'TimeoutException: Connection acquisition timed out after 30000ms [active=30, idle=0, waiting=184].',
    rootCause: 'Batch checkout transactions holding idle-in-transaction locks without timeout.',
    resolution: 'Drained saturated pool, expanded max_pool_size from 30 to 90, and set statement_timeout to 8s.',
    latencyBefore: 3120,
    latencyAfter: 24,
    errorRateBefore: 32.1,
    errorRateAfter: 0.00,
    saturationBefore: 100,
    saturationAfter: 18,
  },
  {
    id: 'EPL-1088',
    title: 'Cross-Cluster Distributed Lock Deadlock',
    service: 'Payment Transaction Engine',
    category: 'Infrastructure',
    priority: 'P1',
    route: 'unknown',
    similarity: 0.41,
    description: 'Circular lock wait detected between inventory reservations and payment settlements under distributed transaction commit.',
    playbookId: 'DEADLOCK-BREAK-TX',
    logSnippet: 'DeadlockDetected: Transaction 8412 waiting on ShareLock for relation inventory held by 8419.',
    rootCause: 'Inconsistent locking order between inventory and ledger microservices.',
    resolution: 'Enforced sorted primary-key locking hierarchy and released deadlock cycle.',
    latencyBefore: 8540,
    latencyAfter: 42,
    errorRateBefore: 45.6,
    errorRateAfter: 0.01,
    saturationBefore: 98,
    saturationAfter: 22,
  },
  {
    id: 'EPL-1099',
    title: 'Cryptographic Signature Verification Anomaly',
    service: 'Security Handshake Gateway',
    category: 'Security',
    priority: 'P1',
    route: 'unknown',
    similarity: 0.28,
    description: 'Anomaly in cryptographic signature exchange causing cascading validation failures across edge ingress nodes.',
    logSnippet: 'CryptoSignatureVerificationFailed: Algorithm curve secp256k1 digest mismatch on payload block 94.',
    rootCause: 'Corrupted public key bundle propagation across edge nodes.',
    resolution: 'Manual forensic review completed; rolled back edge key distribution.',
    latencyBefore: 2400,
    latencyAfter: 18,
    errorRateBefore: 100.0,
    errorRateAfter: 0.00,
    saturationBefore: 88,
    saturationAfter: 12,
  },
  {
    id: 'INC-2014',
    title: 'Redis Cluster Memory Saturation & Cache Stampede',
    service: 'Product Catalog Cache',
    category: 'Cache',
    priority: 'P2',
    route: 'known',
    similarity: 0.92,
    description: 'Simultaneous TTL expiration on top-100 product categories causing direct database hammering and Redis OOM alerts.',
    playbookId: 'CACHE-WARM-TTL',
    logSnippet: 'OOM command not allowed when used memory > maxmemory (98.4% used of 16GB).',
    rootCause: 'Synchronized TTLs without jitter caused instantaneous cache stampede.',
    resolution: 'Applied probabilistic early expiration with jitter and doubled Redis maxmemory.',
    latencyBefore: 1890,
    latencyAfter: 8,
    errorRateBefore: 22.8,
    errorRateAfter: 0.00,
    saturationBefore: 98,
    saturationAfter: 34,
  },
  {
    id: 'INC-2028',
    title: 'Kafka Consumer Group Partition Rebalance Infinite Loop',
    service: 'Event Ingestion Pipeline',
    category: 'Streaming',
    priority: 'P2',
    route: 'mid',
    similarity: 0.74,
    description: 'Long-running deserialization tasks exceeding max.poll.interval.ms, causing recurring partition rebalancing and lag spikes.',
    playbookId: 'KAFKA-REBALANCE-FIX',
    logSnippet: 'CommitFailedException: Offset commit cannot be completed since group has already rebalanced.',
    rootCause: 'Heavy batch processing exceeded consumer heartbeat timeout.',
    resolution: 'Increased max.poll.interval.ms to 600s and decreased max.poll.records to 250.',
    latencyBefore: 4200,
    latencyAfter: 35,
    errorRateBefore: 15.2,
    errorRateAfter: 0.00,
    saturationBefore: 89,
    saturationAfter: 20,
  },
  {
    id: 'INC-2035',
    title: 'Nginx Reverse Proxy Buffer Overflow on Ingress',
    service: 'Edge Ingress Gateway',
    category: 'Infrastructure',
    priority: 'P2',
    route: 'known',
    similarity: 0.88,
    description: 'Large upstream response headers exceeding proxy_buffer_size causing HTTP 502 Bad Gateway errors on mobile clients.',
    playbookId: 'NGINX-BUFFER-TUNE',
    logSnippet: 'upstream sent too big header while reading response header from upstream, client: 10.0.4.12.',
    rootCause: 'Header payload exceeded default 4k buffer allocation.',
    resolution: 'Increased proxy_buffer_size to 16k and proxy_buffers to 4 32k in nginx ingress.',
    latencyBefore: 1100,
    latencyAfter: 14,
    errorRateBefore: 12.4,
    errorRateAfter: 0.00,
    saturationBefore: 85,
    saturationAfter: 11,
  },
  {
    id: 'INC-2041',
    title: 'JWT Refresh Token Concurrency Race Condition',
    service: 'Identity Microservice',
    category: 'Backend',
    priority: 'P2',
    route: 'mid',
    similarity: 0.76,
    description: 'Parallel frontend requests during token expiry trigger double-refresh, revoking valid refresh tokens and forcing user logout.',
    playbookId: 'AUTH-RACE-MUTEX',
    logSnippet: 'InvalidRefreshTokenException: Token family reuse detected, revoking all tokens for subject.',
    rootCause: 'Lack of distributed mutex lock on refresh token rotation endpoint.',
    resolution: 'Added a 15-second grace period for rotated refresh tokens and implemented frontend mutex.',
    latencyBefore: 2150,
    latencyAfter: 16,
    errorRateBefore: 28.0,
    errorRateAfter: 0.00,
    saturationBefore: 92,
    saturationAfter: 15,
  }
]

let clientRotationIndex = 0
let incidentRotationIndex = 0
let knownRotationIndex = 0
let midRotationIndex = 0
let unknownRotationIndex = 0

const getNextPoolIncident = (route: IncidentRoute): CorrectiveIncidentDefinition => {
  const matching = CORRECTIVE_MAINTENANCE_POOL.filter(i => i.route === route)
  if (matching.length === 0) {
    return CORRECTIVE_MAINTENANCE_POOL[0]
  }
  if (route === 'known') {
    return matching[knownRotationIndex++ % matching.length]
  } else if (route === 'mid') {
    return matching[midRotationIndex++ % matching.length]
  } else {
    return matching[unknownRotationIndex++ % matching.length]
  }
}

const INITIAL_STATE: IncidentState = {
  incidentId: null,
  title: null,
  severity: null,
  similarity: null,
  route: null,
  currentStage: 'idle',
  currentStation: null,
  status: 'idle',
  mode: 'SIMULATION',
  assignedHuman: null,
  playbookId: null,
  verificationStatus: 'pending',
  knowledgeCandidate: null,
  timeline: [],
  startedAt: null,
  completedAt: null,
}

const observers: Set<FloorObserver> = new Set()

const formatTime = () => {
  const d = new Date()
  return d.toTimeString().split(' ')[0]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useIncidentSimulationEngine = create<SimulationEngineStore>((set, get) => ({
  ...INITIAL_STATE,
  isPlaying: false,
  replayBanner: null,
  executionSpeedMs: 450,

  setMode: (mode) => set({ mode }),
  setSpeed: (executionSpeedMs) => set({ executionSpeedMs }),

  registerFloorObserver: (observer) => {
    observers.add(observer)
    return () => {
      observers.delete(observer)
    }
  },

  reset: () => {
    const currentMode = get().mode
    observers.forEach((obs) => {
      obs.onResetScene?.()
      obs.onClientExit?.()
      obs.onDevOpsHighActivity?.(false)
    })
    set({
      ...INITIAL_STATE,
      mode: currentMode,
      isPlaying: false,
      replayBanner: null,
    })
  },

  loadTicketForInspection: (ticket) => {
    const normRoute = (ticket.route?.toLowerCase() as IncidentRoute) || 'known'
    let role: HumanRole = 'elena'
    const assignStr = String(ticket.assignedHuman || '').toLowerCase()
    if (assignStr.includes('alex') || assignStr.includes('david') || assignStr.includes('network')) role = 'alex'
    else if (assignStr.includes('sam') || assignStr.includes('server')) role = 'sam'
    else if (assignStr.includes('jordan') || assignStr.includes('arjun') || assignStr.includes('database')) role = 'jordan'
    else if (assignStr.includes('taylor') || assignStr.includes('sofia') || assignStr.includes('cloud')) role = 'taylor'
    else if (assignStr.includes('riley') || assignStr.includes('daniel') || assignStr.includes('security')) role = 'riley'
    else if (assignStr.includes('marcus') || assignStr.includes('sre')) role = 'marcus'
    else if (assignStr.includes('maya') || assignStr.includes('noah') || assignStr.includes('ananya')) role = 'maya'
    else {
      const eng = resolveSystemsEngineer({ title: ticket.title })
      role = eng.id
    }

    observers.forEach((obs) => {
      obs.onRouteSelected?.(normRoute)
      obs.onHumanStateChange?.(role, 'working')
    })

    set({
      incidentId: ticket.id,
      title: ticket.title,
      route: normRoute,
      similarity: ticket.similarity ?? (normRoute === 'known' ? 0.94 : normRoute === 'mid' ? 0.78 : 0.41),
      assignedHuman: role,
      severity: (ticket.priority?.toUpperCase().includes('P1') || ticket.priority?.toUpperCase().includes('CRIT') ? 'P1' : 'P2') as IncidentSeverity,
      status: (ticket.status?.toLowerCase().includes('res') || ticket.status?.toLowerCase().includes('done') ? 'resolved' : 'investigating') as IncidentStatus,
      currentStage: (ticket.status?.toLowerCase().includes('res') || ticket.status?.toLowerCase().includes('done') ? 'resolution' : 'routing') as CanonicalStage,
      currentStation: normRoute === 'known' ? 'playbook' : normRoute === 'mid' ? 'routing' : 'ai_diagnostics',
      isPlaying: false,
      timeline: ticket.timeline && ticket.timeline.length > 0 ? ticket.timeline : get().timeline,
    })
  },

  // ── 1. KNOWN SCENARIO (Evidence-Grounded Resolution — Dynamic Routing) ────────
  runKnownScenario: async (override) => {
    const s = get()
    if (s.isPlaying) return

    get().reset()
    const poolDefault = getNextPoolIncident('known')
    const activeData = { ...poolDefault, ...override }

    const client = override?.clientName
      ? { name: override.clientName, role: override.clientRole || 'External Customer' }
      : CLIENT_PERSONAS[clientRotationIndex++ % CLIENT_PERSONAS.length]

    const incidentId = activeData.id
    const title = activeData.title
    const similarity = activeData.similarity ?? 0.94
    const severity = activeData.priority || 'P2'
    const playbookId = activeData.playbookId || 'VPN-AUTH-01'
    const now = formatTime()
    const delay = s.executionSpeedMs

    // Fire-and-forget: create real Jira ticket + run backend workflow in parallel
    runOrionWorkflowSync({ issue: activeData.description || title, title }).then(res => {
      if (res?.ticket_id) set({ incidentId: res.ticket_id })
    }).catch(() => { /* backend offline — simulation continues with local ID */ })

    // Dynamic Systems Engineer Routing based on incident domain
    const engineer = resolveSystemsEngineer({
      category: activeData.category || 'Network',
      title,
      service: activeData.service || 'Gateway Auth Daemon',
      description: activeData.description || 'VPN auth daemon returning invalid session handshake.',
    })

    set({
      isPlaying: true,
      incidentId,
      title,
      severity,
      similarity,
      route: 'known',
      assignedHuman: engineer.id,
      playbookId,
      mode: get().mode,
      startedAt: now,
      status: 'received',
      currentStage: 'received',
      currentStation: 'intake',
      clientName: client.name,
      clientRole: client.role,
      activeLogSnippet: activeData.logSnippet || 'SessionAuthError: Handshake token 0x8f2 expired prematurely.',
      activeMetrics: {
        latencyBefore: activeData.latencyBefore || 1420,
        latencyAfter: activeData.latencyAfter || 12,
        errorRateBefore: activeData.errorRateBefore || 18.4,
        errorRateAfter: activeData.errorRateAfter || 0.0,
        saturationBefore: activeData.saturationBefore || 94,
        saturationAfter: activeData.saturationAfter || 8,
      },
    })

    // 1. Client arrives from entrance to reception desk
    for (const obs of observers) {
      if (obs.onClientArrive) await obs.onClientArrive(client.name, client.role)
    }
    const event0: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_received', incidentId,
      timestamp: formatTime(), stage: 'received', station: 'client_reception',
      message: `[SIMULATION] Client ${client.name} arrived at Visitor Reception Hall`,
    }
    set(state => ({ timeline: [...state.timeline, event0] }))

    observers.forEach(obs => {
      obs.onHumanStateChange?.('client', 'waiting')
      obs.onHumanBubble?.('client', `${title}: urgent production outage!`, 'alert')
    })
    await sleep(delay + 200)

    // 2. Elena notified, walks to Reception to meet Client
    observers.forEach(obs => {
      obs.onHumanStateChange?.('elena', 'alerted')
    })
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('elena', 'reception_meet')
    }
    observers.forEach(obs => {
      obs.onHumanStateChange?.('elena', 'talking')
    })

    // 3. Client hands over envelope to Elena in Reception
    for (const obs of observers) {
      if (obs.onClientMail) await obs.onClientMail()
    }
    const event1: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_received', incidentId,
      timestamp: formatTime(), stage: 'received', station: 'intake',
      message: `[SIMULATION] Incident received from Client: ${incidentId} — ${title}`,
    }
    set(state => ({ timeline: [...state.timeline, event1] }))

    observers.forEach(obs => {
      obs.onMailNotification?.(title, incidentId, severity)
      obs.onHumanBubble?.('elena', 'Incident received. Evaluating classification...', 'status')
    })
    await sleep(delay + 300)

    // Elena reviewing classification
    const eventEval: IncidentEvent = {
      id: crypto.randomUUID(), type: 'routing_decision', incidentId,
      timestamp: formatTime(), stage: 'routing', station: 'routing',
      message: `[SIMULATION] Elena evaluated classification: ${override?.category || 'Network & Connectivity'} Incident. Routing to ${engineer.name} (${engineer.specialization}).`,
    }
    set(state => ({ timeline: [...state.timeline, eventEval] }))

    // 4. Software Stations: Intake -> Semantic -> Federated KB Search
    observers.forEach(obs => obs.onRouteSelected?.('known'))
    observers.forEach(obs => obs.onStationTransition?.('intake', incidentId))
    await sleep(delay)

    set({ status: 'normalizing', currentStage: 'normalized', currentStation: 'semantic' })
    observers.forEach(obs => obs.onStationTransition?.('semantic', incidentId))
    await sleep(delay)

    set({ status: 'searching', currentStage: 'knowledge_search', currentStation: 'knowledge_search' })
    observers.forEach(obs => obs.onStationTransition?.('knowledge_search', incidentId))
    const event2: IncidentEvent = {
      id: crypto.randomUUID(), type: 'knowledge_search_completed', incidentId,
      timestamp: formatTime(), stage: 'knowledge_search', station: 'knowledge_search',
      message: `[SIMULATION] FEDERATED KB match: KB-089 similarity 0.94 >= 0.85 (High Confidence)`,
    }
    set(state => ({ timeline: [...state.timeline, event2] }))
    await sleep(delay)

    // 5. Elena physically walks to Systems Engineer to assign
    observers.forEach(obs => obs.onStationTransition?.('routing', incidentId))
    set({ status: 'routing', currentStage: 'routing', currentStation: 'routing' })

    for (const obs of observers) {
      if (obs.onWalkCharacterToCharacter) {
        await obs.onWalkCharacterToCharacter('elena', engineer.id, `${engineer.name.split(' ')[0]}, take ${incidentId}. ${title}.`)
      } else if (obs.onHumanWalk) {
        await obs.onHumanWalk('elena', engineer.deskStation, `${engineer.name.split(' ')[0]}, take ${incidentId}. ${title}.`)
      }
    }
    observers.forEach(obs => {
      obs.onHumanBubble?.('elena', `${engineer.name.split(' ')[0]}, take ${incidentId}. Run remediation playbook.`, 'assignment')
    })
    await sleep(delay + 200)

    // Engineer acknowledges assignment
    observers.forEach(obs => obs.onHumanStateChange?.(engineer.id, 'alerted'))
    const event4: IncidentEvent = {
      id: crypto.randomUUID(), type: 'human_assigned', incidentId,
      actor: engineer.name, timestamp: formatTime(), stage: 'remediation', station: engineer.deskStation,
      message: `[SIMULATION] Elena routed to ${engineer.name} (${engineer.specialization}): "${incidentId} ${title}." Acknowledged.`,
    }
    set(state => ({ timeline: [...state.timeline, event4] }))
    observers.forEach(obs => obs.onHumanBubble?.(engineer.id, 'Got it, Elena. Checking configuration and running playbook.', 'message'))
    await sleep(350)

    // Elena returns to her office
    for (const obs of observers) {
      if (obs.onHumanReturnHome) await obs.onHumanReturnHome('elena')
    }

    // 6. Engineer walks to Playbook station
    set({ status: 'investigating', currentStage: 'remediation', currentStation: 'playbook' })
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk(engineer.id, 'playbook', `Applying ${playbookId} remediation playbook...`)
    }
    observers.forEach(obs => obs.onStationTransition?.('playbook', incidentId))
    await sleep(delay + 200)

    // Engineer investigates and applies fix
    observers.forEach(obs => {
      obs.onHumanStateChange?.(engineer.id, 'investigating')
      obs.onHumanBubble?.(engineer.id, 'Root cause isolated. Playbook remediation applied!', 'investigation')
    })
    await sleep(delay + 300)

    // 7. Engineer walks to QA Lab (Maya Lin, QA Lead) for verification
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk(engineer.id, 'qa_testing', 'Maya, can you validate this fix?')
    }
    observers.forEach(obs => {
      obs.onHumanBubble?.(engineer.id, 'Maya, can you validate the fix in Verification Engine?', 'handoff')
      obs.onHumanStateChange?.('maya', 'alerted')
    })
    await sleep(400)

    // Maya runs 5/5 health checks
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('maya', 'qa_testing', 'Running 5/5 closed-loop health checks...')
    }
    set({ status: 'verifying', currentStage: 'verification', currentStation: 'verification', verificationStatus: 'verifying' })
    observers.forEach(obs => obs.onStationTransition?.('verification', incidentId))
    await sleep(delay + 200)

    set({ verificationStatus: 'passed' })
    observers.forEach(obs => obs.onHumanBubble?.('maya', '5/5 health checks passed! All green.', 'success'))
    const event5: IncidentEvent = {
      id: crypto.randomUUID(), type: 'verification_passed', incidentId,
      actor: 'Maya Lin', timestamp: formatTime(), stage: 'verification', station: 'qa_testing',
      message: `[SIMULATION] Maya Lin (QA Lead): Closed-loop 5/5 checks passed — ready for closure.`,
    }
    set(state => ({ timeline: [...state.timeline, event5] }))
    await sleep(delay)

    // 8. Engineer reports back to Elena
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk(engineer.id, 'commander', 'Fix verified by QA. Ready for signoff.')
    }
    observers.forEach(obs => obs.onHumanBubble?.(engineer.id, 'Closed-loop verification complete. Ready to go live.', 'handoff'))
    await sleep(delay)

    // 9. Elena confirms: SITE LIVE!
    observers.forEach(obs => {
      obs.onHumanStateChange?.('elena', 'approved')
      obs.onHumanBubble?.('elena', 'Approved. SITE LIVE!', 'approval')
    })
    const event6: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_resolved', incidentId,
      actor: 'Elena Rostova', timestamp: formatTime(), stage: 'resolution', station: 'commander',
      message: `[SIMULATION] Elena Rostova: "SITE LIVE" — ${incidentId} closed successfully. Provenance recorded.`,
    }
    set(state => ({
      timeline: [...state.timeline, event6],
      status: 'resolved',
      currentStage: 'resolution',
      currentStation: 'resolution',
      completedAt: formatTime(),
      isPlaying: false,
    }))
    observers.forEach(obs => obs.onStationTransition?.('resolution', incidentId))

    // Knowledge capture
    observers.forEach(obs => obs.onKnowledgeBubble?.())

    // All team members return home and client exits office
    await sleep(delay + 300)
    for (const obs of observers) {
      if (obs.onHumanReturnHome) {
        await obs.onHumanReturnHome(engineer.id)
        await obs.onHumanReturnHome('maya')
        await obs.onHumanReturnHome('elena')
      }
      if (obs.onClientExit) {
        await obs.onClientExit()
      }
    }
    observers.forEach(obs => {
      obs.onHumanStateChange?.('elena', 'idle')
    })
  },


  // ── 2. MID SCENARIO (Evidence-Aware Routing — Systems Engineer Dynamic) ──────
  runMidScenario: async (onAwaitingDecision, override) => {
    const s = get()
    if (s.isPlaying) return

    get().reset()
    const poolDefault = getNextPoolIncident('mid')
    const activeData = { ...poolDefault, ...override }

    const client = override?.clientName
      ? { name: override.clientName, role: override.clientRole || 'External Customer' }
      : CLIENT_PERSONAS[clientRotationIndex++ % CLIENT_PERSONAS.length]

    const incidentId = activeData.id
    const title = activeData.title
    const similarity = activeData.similarity ?? 0.78
    const severity = activeData.priority || 'P2'
    const now = formatTime()
    const delay = s.executionSpeedMs

    // Fire-and-forget: create real Jira ticket + run backend workflow in parallel
    runOrionWorkflowSync({ issue: activeData.description || title, title }).then(res => {
      if (res?.ticket_id) set({ incidentId: res.ticket_id })
    }).catch(() => { /* backend offline — simulation continues with local ID */ })

    // Dynamic Systems Engineer routing based on domain
    const engineer = resolveSystemsEngineer({
      category: activeData.category || 'Database',
      title,
      service: activeData.service || 'Checkout DB Cluster',
      description: activeData.description || 'Database connection pool exhausted under surge',
    })

    set({
      isPlaying: true,
      incidentId,
      title,
      severity,
      similarity,
      route: 'mid',
      assignedHuman: engineer.id,
      playbookId: activeData.playbookId || 'DB-POOL-RESIZE',
      mode: get().mode,
      startedAt: now,
      status: 'received',
      currentStage: 'received',
      currentStation: 'intake',
      clientName: client.name,
      clientRole: client.role,
      activeLogSnippet: activeData.logSnippet || 'TimeoutException: Connection acquisition timed out after 30000ms.',
      activeMetrics: {
        latencyBefore: activeData.latencyBefore || 3120,
        latencyAfter: activeData.latencyAfter || 24,
        errorRateBefore: activeData.errorRateBefore || 32.1,
        errorRateAfter: activeData.errorRateAfter || 0.0,
        saturationBefore: activeData.saturationBefore || 100,
        saturationAfter: activeData.saturationAfter || 18,
      },
    })

    // 1. Client arrives at Reception
    for (const obs of observers) {
      if (obs.onClientArrive) await obs.onClientArrive(client.name, client.role)
    }
    const event0: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_received', incidentId,
      timestamp: formatTime(), stage: 'received', station: 'client_reception',
      message: `[SIMULATION] Client ${client.name} arrived at Visitor Reception Hall`,
    }
    set(state => ({ timeline: [...state.timeline, event0] }))

    observers.forEach(obs => {
      obs.onHumanStateChange?.('client', 'waiting')
      obs.onHumanBubble?.('client', `${title}: checkout timeouts spike!`, 'alert')
    })
    await sleep(delay + 200)

    // 2. Elena meets Client in Reception
    observers.forEach(obs => obs.onHumanStateChange?.('elena', 'alerted'))
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('elena', 'reception_meet')
    }
    observers.forEach(obs => obs.onHumanStateChange?.('elena', 'talking'))

    // 3. Client hands envelope to Elena
    for (const obs of observers) {
      if (obs.onClientMail) await obs.onClientMail()
    }
    const event1: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_received', incidentId,
      timestamp: formatTime(), stage: 'received', station: 'intake',
      message: `[SIMULATION] Client reported ${incidentId}: ${title}`,
    }
    set(state => ({ timeline: [...state.timeline, event1] }))

    observers.forEach(obs => {
      obs.onMailNotification?.(title, incidentId, severity)
      obs.onHumanBubble?.('elena', `${severity} issue reported. Reviewing classification...`, 'status')
    })
    await sleep(delay + 300)

    // Elena classification evaluation
    const eventEval: IncidentEvent = {
      id: crypto.randomUUID(), type: 'routing_decision', incidentId,
      timestamp: formatTime(), stage: 'routing', station: 'routing',
      message: `[SIMULATION] Elena evaluated classification: Database & Storage Pool Incident. Routing to ${engineer.name} (${engineer.specialization}).`,
    }
    set(state => ({ timeline: [...state.timeline, eventEval] }))

    observers.forEach(obs => {
      obs.onRouteSelected?.('mid')
      obs.onStationTransition?.('intake', incidentId)
    })
    await sleep(delay)

    observers.forEach(obs => obs.onStationTransition?.('semantic', incidentId))
    await sleep(delay)

    observers.forEach(obs => obs.onStationTransition?.('knowledge_search', incidentId))
    const event2: IncidentEvent = {
      id: crypto.randomUUID(), type: 'knowledge_search_completed', incidentId,
      timestamp: formatTime(), stage: 'knowledge_search', station: 'knowledge_search',
      message: `[SIMULATION] FEDERATED KB search: similarity 0.78 (Human engineer decision required)`,
    }
    set(state => ({ timeline: [...state.timeline, event2] }))
    await sleep(delay)

    // 4. Elena physically walks to Systems Engineer (Jordan)
    observers.forEach(obs => obs.onStationTransition?.('routing', incidentId))
    set({ status: 'routing', currentStage: 'routing', currentStation: 'routing' })

    for (const obs of observers) {
      if (obs.onWalkCharacterToCharacter) {
        await obs.onWalkCharacterToCharacter('elena', engineer.id, `${engineer.name.split(' ')[0]}, checkout DB pool is exhausted. Review suggested fix.`)
      } else if (obs.onHumanWalk) {
        await obs.onHumanWalk('elena', engineer.deskStation, `${engineer.name.split(' ')[0]}, checkout DB pool is exhausted. Review suggested fix.`)
      }
    }
    observers.forEach(obs => {
      obs.onHumanBubble?.('elena', `${engineer.name.split(' ')[0]}, checkout DB pool is exhausted. Review fix.`, 'assignment')
    })
    await sleep(delay + 200)

    observers.forEach(obs => obs.onHumanStateChange?.(engineer.id, 'alerted'))
    const event3: IncidentEvent = {
      id: crypto.randomUUID(), type: 'human_assigned', incidentId,
      actor: engineer.name, timestamp: formatTime(), stage: 'remediation', station: engineer.deskStation,
      message: `[SIMULATION] Elena routed to ${engineer.name} (${engineer.specialization}): "Review connection pool expansion". Acknowledged.`,
    }
    set(state => ({ timeline: [...state.timeline, event3] }))
    observers.forEach(obs => obs.onHumanBubble?.(engineer.id, 'Analyzing connection pool metrics and lock queues now.', 'message'))
    await sleep(350)

    // Elena returns to her office
    for (const obs of observers) {
      if (obs.onHumanReturnHome) await obs.onHumanReturnHome('elena')
    }

    // 5. Engineer walks to Risk & Routing Core
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk(engineer.id, 'routing', 'Reviewing connection pool fix')
    }
    set({ status: 'awaiting_human', currentStage: 'remediation', currentStation: 'routing' })

    // Open human decision interface
    onAwaitingDecision?.()
  },

  approveHumanFix: async () => {
    const s = get()
    const incidentId = s.incidentId || 'EPL-1067'
    const delay = s.executionSpeedMs
    const engineer = resolveSystemsEngineer({ title: s.title || 'Database Connection Pool Exhaustion' })

    observers.forEach((obs) => obs.onHumanBubble?.(engineer.id, 'Fix Approved! Scaling pool to 90.', 'investigation'))
    const event1: IncidentEvent = {
      id: crypto.randomUUID(), type: 'human_accepted', incidentId,
      actor: engineer.name, timestamp: formatTime(), stage: 'remediation', station: 'routing',
      message: `[SIMULATION] ${engineer.name}: Approved Fix — DB pool capacity scaled to 90 connections with statement_timeout 8s.`,
    }
    set((state) => ({ timeline: [...state.timeline, event1], status: 'executing' }))
    await sleep(delay)

    // Engineer walks to QA Lab -> Noah verifies latency
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk(engineer.id, 'qa_testing', 'Testing connection pool fix')
    }
    observers.forEach((obs) => obs.onHumanStateChange?.('noah', 'alerted'))
    await sleep(300)

    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('noah', 'qa_testing', 'Running regression tests')
    }
    set({ status: 'verifying', currentStage: 'verification', currentStation: 'verification', verificationStatus: 'verifying' })
    observers.forEach((obs) => obs.onStationTransition?.('verification', incidentId))
    await sleep(delay + 200)

    set({ verificationStatus: 'passed' })
    observers.forEach((obs) => obs.onHumanBubble?.('noah', 'QA Passed: Latency < 25ms, 0 connection timeouts.', 'success'))
    await sleep(delay)

    // Engineer reports to Elena
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk(engineer.id, 'commander', 'Pool scaled. QA passed. Site Live.')
    }
    await sleep(delay)

    observers.forEach((obs) => obs.onHumanBubble?.('elena', 'Approved. SITE LIVE!', 'approval'))
    const event2: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_resolved', incidentId,
      actor: 'Elena Rostova', timestamp: formatTime(), stage: 'resolution', station: 'commander',
      message: `[SIMULATION] Incident ${incidentId} resolved with Systems Engineer & QA signoff.`,
    }
    set((state) => ({
      timeline: [...state.timeline, event2],
      status: 'resolved',
      currentStage: 'resolution',
      currentStation: 'resolution',
      completedAt: formatTime(),
      isPlaying: false,
    }))
    observers.forEach((obs) => obs.onStationTransition?.('resolution', incidentId))

    // Knowledge capture
    observers.forEach((obs) => obs.onKnowledgeBubble?.())

    await sleep(delay + 200)
    for (const obs of observers) {
      if (obs.onHumanReturnHome) {
        await obs.onHumanReturnHome(engineer.id)
        await obs.onHumanReturnHome('noah')
        await obs.onHumanReturnHome('elena')
      }
      if (obs.onClientExit) {
        await obs.onClientExit()
      }
    }
    observers.forEach((obs) => {
      obs.onHumanStateChange?.('elena', 'idle')
    })
  },

  // ── 3. UNKNOWN SCENARIO (Human-Governed Autonomy — Multi-Team Collaboration) ──────
  runUnknownScenario: async (onAwaitingApproval, override) => {
    const s = get()
    if (s.isPlaying) return

    get().reset()
    const poolDefault = getNextPoolIncident('unknown')
    const activeData = { ...poolDefault, ...override }

    const client = override?.clientName
      ? { name: override.clientName, role: override.clientRole || 'External Customer' }
      : CLIENT_PERSONAS[clientRotationIndex++ % CLIENT_PERSONAS.length]

    const incidentId = activeData.id
    const title = activeData.title
    const similarity = activeData.similarity ?? 0.41
    const severity = activeData.priority || 'P1'
    const now = formatTime()
    const delay = s.executionSpeedMs

    // Fire-and-forget: create real Jira ticket + run backend workflow in parallel
    runOrionWorkflowSync({ issue: activeData.description || title, title }).then(res => {
      if (res?.ticket_id) set({ incidentId: res.ticket_id })
    }).catch(() => { /* backend offline — simulation continues with local ID */ })

    set({
      isPlaying: true,
      incidentId,
      title,
      severity,
      similarity,
      route: 'unknown',
      assignedHuman: 'marcus',
      playbookId: activeData.playbookId || 'DEADLOCK-BREAK-TX',
      mode: get().mode,
      startedAt: now,
      status: 'received',
      currentStage: 'received',
      currentStation: 'intake',
      clientName: client.name,
      clientRole: client.role,
      activeLogSnippet: activeData.logSnippet || 'DeadlockDetected: Circular lock wait detected across clusters.',
      activeMetrics: {
        latencyBefore: activeData.latencyBefore || 8540,
        latencyAfter: activeData.latencyAfter || 42,
        errorRateBefore: activeData.errorRateBefore || 45.6,
        errorRateAfter: activeData.errorRateAfter || 0.01,
        saturationBefore: activeData.saturationBefore || 98,
        saturationAfter: activeData.saturationAfter || 22,
      },
    })

    // 1. Client arrives at Reception
    for (const obs of observers) {
      if (obs.onClientArrive) await obs.onClientArrive(client.name, client.role)
    }
    const event0: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_received', incidentId,
      timestamp: formatTime(), stage: 'received', station: 'client_reception',
      message: `[SIMULATION] Client ${client.name} arrived at Visitor Reception Hall`,
    }
    set(state => ({ timeline: [...state.timeline, event0] }))

    observers.forEach(obs => {
      obs.onHumanStateChange?.('client', 'waiting')
      obs.onHumanBubble?.('client', `${title}: CRITICAL transactions deadlocked!`, 'alert')
    })
    await sleep(delay + 200)

    // 2. Elena meets Client in Reception
    observers.forEach(obs => obs.onHumanStateChange?.('elena', 'alerted'))
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('elena', 'reception_meet')
    }
    observers.forEach(obs => obs.onHumanStateChange?.('elena', 'talking'))

    // 3. Client hands over envelope to Elena
    for (const obs of observers) {
      if (obs.onClientMail) await obs.onClientMail()
    }
    const event1: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_received', incidentId,
      timestamp: formatTime(), stage: 'received', station: 'intake',
      message: `[SIMULATION] Client ${severity} Webhook: ${incidentId} — ${title}`,
    }
    set(state => ({ timeline: [...state.timeline, event1] }))

    observers.forEach(obs => {
      obs.onMailNotification?.(title, incidentId, severity)
      obs.onHumanBubble?.('elena', `${severity} incident reported. Querying FEDERATED KB...`, 'status')
    })
    await sleep(delay + 300)

    // Elena classification evaluation: Critical Infrastructure & Database Locks
    const eventEval: IncidentEvent = {
      id: crypto.randomUUID(), type: 'routing_decision', incidentId,
      timestamp: formatTime(), stage: 'routing', station: 'routing',
      message: `[SIMULATION] Elena evaluated classification: Novel P1 Deadlock. Escalating to Marcus (DevOps/SRE) and Jordan Hayes (Database & Storage Systems Engineer).`,
    }
    set(state => ({ timeline: [...state.timeline, eventEval] }))

    observers.forEach(obs => {
      obs.onRouteSelected?.('unknown')
      obs.onStationTransition?.('intake', incidentId)
    })
    await sleep(delay)

    observers.forEach(obs => obs.onStationTransition?.('semantic', incidentId))
    await sleep(delay)

    observers.forEach(obs => obs.onStationTransition?.('knowledge_search', incidentId))
    const event2: IncidentEvent = {
      id: crypto.randomUUID(), type: 'knowledge_search_completed', incidentId,
      timestamp: formatTime(), stage: 'knowledge_search', station: 'knowledge_search',
      message: `[SIMULATION] FEDERATED KB: Similarity 0.41 (< 0.55). NOVEL INCIDENT. AI Diagnostics & joint SRE review required.`,
    }
    set(state => ({ timeline: [...state.timeline, event2] }))
    await sleep(delay)

    // 4. Elena physically walks to Marcus (DevOps / SRE)
    observers.forEach(obs => obs.onStationTransition?.('routing', incidentId))

    for (const obs of observers) {
      if (obs.onWalkCharacterToCharacter) {
        await obs.onWalkCharacterToCharacter('elena', 'marcus', 'Marcus, critical novel deadlock. Initiate AI diagnostics.')
      } else if (obs.onHumanWalk) {
        await obs.onHumanWalk('elena', 'devops_marcus', 'Marcus, critical novel deadlock. Initiate AI diagnostics.')
      }
    }
    observers.forEach(obs => {
      obs.onHumanBubble?.('elena', 'Marcus: Novel P1 deadlock across clusters. Initiate AI Diagnostics.', 'assignment')
    })
    await sleep(delay + 200)

    // Marcus alerted
    observers.forEach(obs => obs.onHumanStateChange?.('marcus', 'alerted'))
    observers.forEach(obs => obs.onHumanBubble?.('marcus', 'On it. Activating cluster telemetry & AI stack diagnostics.', 'message'))
    await sleep(350)

    // Server racks LEDs pulse rapidly with high alert
    observers.forEach(obs => obs.onDevOpsHighActivity?.(true))

    // Elena returns to her office
    for (const obs of observers) {
      if (obs.onHumanReturnHome) await obs.onHumanReturnHome('elena')
    }

    // 5. Marcus walks to AI Diagnostics
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('marcus', 'ai_diagnostics', 'Novel deadlock: parsing lock traces')
    }
    set({ status: 'investigating', currentStage: 'remediation', currentStation: 'ai_diagnostics' })
    observers.forEach(obs => obs.onStationTransition?.('ai_diagnostics', incidentId))
    await sleep(delay)

    // 6. Jordan Hayes (Systems Engineer - Database & Storage) joins Marcus to collaborate!
    observers.forEach(obs => obs.onHumanStateChange?.('jordan', 'alerted'))
    await sleep(250)

    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('jordan', 'ai_diagnostics', 'Collaborating on lock order fix')
    }
    observers.forEach(obs => {
      obs.onHumanBubble?.('marcus', 'Circular wait between orders & inventory', 'investigation')
      obs.onHumanBubble?.('jordan', 'Enforcing deterministic lock sorting', 'investigation')
    })
    await sleep(delay + 400)

    // 7. Noah Williams (QA Engineer) stress validates in Verification Lab
    observers.forEach(obs => obs.onHumanStateChange?.('noah', 'alerted'))
    await sleep(250)

    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('noah', 'qa_testing', 'Simulating 10k concurrent transactions')
    }
    set({ status: 'verifying', currentStage: 'verification', currentStation: 'verification', verificationStatus: 'verifying' })
    observers.forEach(obs => obs.onStationTransition?.('verification', incidentId))
    await sleep(delay + 200)

    set({ verificationStatus: 'passed' })
    observers.forEach(obs => obs.onHumanBubble?.('noah', '0 deadlocks across 10,000 transactions!', 'success'))
    await sleep(delay)

    // 8. Marcus & Jordan walk to Elena (Command Suite) for signoff
    for (const obs of observers) {
      if (obs.onHumanWalk) {
        await obs.onHumanWalk('marcus', 'commander', 'Deadlock hotpatch validated.')
        await obs.onHumanWalk('jordan', 'commander', 'Requesting site deployment.')
      }
    }
    set({ status: 'awaiting_human', currentStation: 'commander' })

    onAwaitingApproval?.()
  },

  approveElenaSignoff: async () => {
    const s = get()
    const incidentId = s.incidentId || 'EPL-1088'
    const delay = s.executionSpeedMs

    observers.forEach((obs) => obs.onHumanBubble?.('elena', 'Hotpatch approved. SITE LIVE!', 'approval'))
    const event1: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_resolved', incidentId,
      actor: 'Elena Rostova', timestamp: formatTime(), stage: 'resolution', station: 'commander',
      message: `[SIMULATION] Elena Rostova: "SITE LIVE" — Multi-team incident resolved with Systems Engineering & QA signoff.`,
    }
    set((state) => ({
      timeline: [...state.timeline, event1],
      status: 'resolved',
      currentStage: 'resolution',
      currentStation: 'resolution',
      completedAt: formatTime(),
      isPlaying: false,
    }))
    observers.forEach((obs) => {
      obs.onStationTransition?.('resolution', incidentId)
      obs.onDevOpsHighActivity?.(false)
    })

    // Knowledge capture
    set({
      knowledgeCandidate: {
        id: 'KB-1250',
        title: 'Deterministic Lock Ordering Remediation',
        resolution: 'Enforce sorted primary key locking prior to inventory mutations',
        similarityBefore: 0.41,
        similarityAfter: 0.94,
      }
    })
    observers.forEach((obs) => obs.onKnowledgeBubble?.())

    // All humans return home and client exits office
    await sleep(delay + 200)
    for (const obs of observers) {
      if (obs.onHumanReturnHome) {
        await obs.onHumanReturnHome('marcus')
        await obs.onHumanReturnHome('jordan')
        await obs.onHumanReturnHome('noah')
        await obs.onHumanReturnHome('elena')
      }
      if (obs.onClientExit) {
        await obs.onClientExit()
      }
    }
    observers.forEach((obs) => {
      obs.onHumanStateChange?.('elena', 'idle')
    })
  },

  // ── 4. REPLAY CLOSED LOOP (Demonstrating Learning: 0.41 -> 0.94) ────────────
  runReplayScenario: async () => {
    const s = get()
    if (s.isPlaying) return

    get().reset()
    const incidentId = 'EPL-1088 (REPLAY)'
    const now = formatTime()
    const delay = s.executionSpeedMs

    set({
      isPlaying: true,
      replayBanner: 'CLOSED-LOOP REPLAY: Incident learned from team fix. Recurring issue now matches at 0.94 similarity!',
      incidentId,
      title: 'Deterministic Lock Ordering (Learned Pattern)',
      severity: 'P1',
      similarity: 0.94,
      route: 'known',
      playbookId: 'KB-1250',
      mode: get().mode,
      startedAt: now,
      status: 'received',
      currentStage: 'received',
      currentStation: 'intake',
    })

    const event1: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_received', incidentId,
      timestamp: formatTime(), stage: 'received', station: 'intake',
      message: `[SIMULATION] Re-ingesting recurring incident: ${incidentId}`,
    }
    set((state) => ({ timeline: [...state.timeline, event1] }))
    observers.forEach((obs) => {
      obs.onHumanStateChange?.('elena', 'alerted')
      obs.onRouteSelected?.('known')
      obs.onStationTransition?.('intake', incidentId)
    })
    await sleep(delay)

    observers.forEach((obs) => obs.onStationTransition?.('semantic', incidentId))
    await sleep(delay)

    observers.forEach((obs) => obs.onStationTransition?.('knowledge_search', incidentId))
    const event2: IncidentEvent = {
      id: crypto.randomUUID(), type: 'knowledge_search_completed', incidentId,
      timestamp: formatTime(), stage: 'knowledge_search', station: 'knowledge_search',
      message: `[SIMULATION] pgvector MATCH: KB-1250 similarity 0.94! Learned from previous human fix!`,
    }
    set((state) => ({ timeline: [...state.timeline, event2] }))
    await sleep(delay)

    observers.forEach((obs) => obs.onStationTransition?.('routing', incidentId))
    await sleep(delay)

    // Autonomous Playbook execution
    observers.forEach((obs) => obs.onStationTransition?.('playbook', incidentId))
    set({ status: 'executing', currentStage: 'remediation', currentStation: 'playbook' })
    await sleep(delay)

    // Verification
    observers.forEach((obs) => obs.onStationTransition?.('verification', incidentId))
    set({ status: 'verifying', currentStage: 'verification', currentStation: 'verification', verificationStatus: 'passed' })
    await sleep(delay)

    // Resolution
    const finishedAt = formatTime()
    set({ status: 'resolved', currentStage: 'resolution', currentStation: 'resolution', completedAt: finishedAt })
    observers.forEach((obs) => obs.onStationTransition?.('resolution', incidentId))
    const event3: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_resolved', incidentId,
      timestamp: finishedAt, stage: 'resolution', station: 'resolution',
      message: `[SIMULATION] 🎉 CLOSED-LOOP SUCCESS: Incident resolved 100% autonomously in 1.88s with 0 human intervention!`,
    }
    set((state) => ({ timeline: [...state.timeline, event3], isPlaying: false }))

    observers.forEach((obs) => obs.onHumanStateChange?.('elena', 'idle'))
  },

  // ── 5. GRACEFUL FAILURE SCENARIO (Insufficient Evidence — Human Review Required) ──
  runFailureScenario: async (override) => {
    const s = get()
    if (s.isPlaying) return

    get().reset()
    const client = override?.clientName
      ? { name: override.clientName, role: override.clientRole || 'External Customer' }
      : CLIENT_PERSONAS[clientRotationIndex++ % CLIENT_PERSONAS.length]

    const incidentId = override?.id || 'EPL-1099'
    const title = override?.title || 'Cryptographic Signature Verification Anomaly'
    const similarity = override?.similarity ?? 0.28
    const severity = override?.priority || 'P1'
    const now = formatTime()
    const delay = s.executionSpeedMs

    set({
      isPlaying: true,
      incidentId,
      title,
      severity,
      similarity,
      route: 'unknown',
      assignedHuman: 'elena',
      mode: get().mode,
      startedAt: now,
      status: 'received',
      currentStage: 'received',
      currentStation: 'intake',
      clientName: client.name,
      clientRole: client.role,
      activeLogSnippet: override?.logSnippet || 'CryptoSignatureVerificationFailed: Algorithm curve secp256k1 digest mismatch on payload block 94.',
      activeMetrics: {
        latencyBefore: override?.latencyBefore || 2400,
        latencyAfter: override?.latencyAfter || 18,
        errorRateBefore: override?.errorRateBefore || 100.0,
        errorRateAfter: override?.errorRateAfter || 0.0,
        saturationBefore: override?.saturationBefore || 88,
        saturationAfter: override?.saturationAfter || 12,
      },
    })

    // Client arrives
    for (const obs of observers) {
      if (obs.onClientArrive) await obs.onClientArrive(client.name, client.role)
    }
    const event0: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_received', incidentId,
      timestamp: formatTime(), stage: 'received', station: 'client_reception',
      message: `[SIMULATION] Client ${client.name} arrived at Visitor Reception Hall`,
    }
    set(state => ({ timeline: [...state.timeline, event0] }))

    observers.forEach(obs => {
      obs.onHumanStateChange?.('client', 'waiting')
      obs.onHumanBubble?.('client', `${title}: edge ingress failing!`, 'alert')
    })
    await sleep(delay + 200)

    // Elena meets client
    observers.forEach(obs => obs.onHumanStateChange?.('elena', 'alerted'))
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('elena', 'reception_meet')
    }

    for (const obs of observers) {
      if (obs.onClientMail) await obs.onClientMail()
    }
    const event1: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_received', incidentId,
      timestamp: formatTime(), stage: 'received', station: 'intake',
      message: `[SIMULATION] ${incidentId}: Cascading service degradation — unknown pattern`,
    }
    set(state => ({ timeline: [...state.timeline, event1] }))
    observers.forEach(obs => {
      obs.onMailNotification?.('Cascading Service Degradation', incidentId, 'P1')
      obs.onHumanBubble?.('elena', 'Unusual pattern — processing...', 'status')
    })
    await sleep(delay + 300)

    // AI Processing: intake → semantic → knowledge search → INSUFFICIENT
    observers.forEach(obs => obs.onRouteSelected?.('unknown'))
    observers.forEach(obs => obs.onStationTransition?.('intake', incidentId))
    await sleep(delay)

    set({ status: 'normalizing', currentStage: 'normalized', currentStation: 'semantic' })
    observers.forEach(obs => obs.onStationTransition?.('semantic', incidentId))
    await sleep(delay)

    set({ status: 'searching', currentStage: 'knowledge_search', currentStation: 'knowledge_search' })
    observers.forEach(obs => obs.onStationTransition?.('knowledge_search', incidentId))
    const event2: IncidentEvent = {
      id: crypto.randomUUID(), type: 'knowledge_search_completed', incidentId,
      timestamp: formatTime(), stage: 'knowledge_search', station: 'knowledge_search',
      message: `[SIMULATION] pgvector: Similarity 0.28 — INSUFFICIENT EVIDENCE. No prior pattern found.`,
    }
    set(state => ({ timeline: [...state.timeline, event2] }))
    await sleep(delay)

    observers.forEach(obs => obs.onStationTransition?.('routing', incidentId))
    set({ status: 'routing', currentStage: 'routing', currentStation: 'routing' })
    await sleep(delay)

    // AI cannot safely resolve — graceful failure
    const eventFail: IncidentEvent = {
      id: crypto.randomUUID(), type: 'routing_decision', incidentId,
      timestamp: formatTime(), stage: 'routing', station: 'routing',
      message: `[SIMULATION] INSUFFICIENT EVIDENCE (0.28 < 0.55). AI cannot safely auto-resolve. Escalating to human review.`,
    }
    set(state => ({ timeline: [...state.timeline, eventFail] }))
    observers.forEach(obs => {
      obs.onHumanBubble?.('elena', 'Insufficient evidence. Human review required.', 'alert')
    })
    await sleep(delay + 200)

    // Elena walks to AI Diagnostics with Marcus for deep investigation
    for (const obs of observers) {
      if (obs.onWalkCharacterToCharacter) {
        await obs.onWalkCharacterToCharacter('elena', 'marcus', 'Marcus — novel cascading failure. Full SRE review.')
      } else if (obs.onHumanWalk) {
        await obs.onHumanWalk('elena', 'devops_marcus', 'Marcus — novel cascading failure. Full SRE review.')
      }
    }
    observers.forEach(obs => obs.onHumanStateChange?.('marcus', 'alerted'))
    observers.forEach(obs => obs.onDevOpsHighActivity?.(true))
    await sleep(delay + 300)

    for (const obs of observers) {
      if (obs.onHumanReturnHome) await obs.onHumanReturnHome('elena')
    }

    // Marcus investigates at AI Diagnostics
    for (const obs of observers) {
      if (obs.onHumanWalk) await obs.onHumanWalk('marcus', 'ai_diagnostics', 'Deep forensics: multi-service cascade')
    }
    set({ status: 'investigating', currentStage: 'remediation', currentStation: 'ai_diagnostics' })
    observers.forEach(obs => obs.onStationTransition?.('ai_diagnostics', incidentId))
    observers.forEach(obs => obs.onHumanBubble?.('marcus', 'Running full stack forensics...', 'investigation'))
    await sleep(delay + 400)

    // Manual resolution — Elena approves after human review
    observers.forEach(obs => {
      obs.onHumanStateChange?.('elena', 'approved')
      obs.onHumanBubble?.('elena', 'Human review complete. Safe to proceed.', 'approval')
    })
    const event3: IncidentEvent = {
      id: crypto.randomUUID(), type: 'incident_resolved', incidentId,
      timestamp: formatTime(), stage: 'resolution', station: 'commander',
      message: `[SIMULATION] Graceful Resolution: INC-1099 resolved via mandatory human review (insufficient AI confidence).`,
    }
    set(state => ({
      timeline: [...state.timeline, event3],
      status: 'resolved',
      currentStage: 'resolution',
      currentStation: 'resolution',
      completedAt: formatTime(),
      isPlaying: false,
    }))
    observers.forEach(obs => {
      obs.onStationTransition?.('resolution', incidentId)
      obs.onDevOpsHighActivity?.(false)
    })

    // Knowledge capture
    observers.forEach(obs => obs.onKnowledgeBubble?.())

    await sleep(delay + 300)
    for (const obs of observers) {
      if (obs.onHumanReturnHome) {
        await obs.onHumanReturnHome('marcus')
        await obs.onHumanReturnHome('elena')
      }
      if (obs.onClientExit) {
        await obs.onClientExit()
      }
    }
    observers.forEach(obs => {
      obs.onHumanStateChange?.('elena', 'idle')
    })
  },

  // ── 6. DISPATCH RANDOM CORRECTIVE MAINTENANCE SCENARIO ──────────────────────
  runRandomCorrectiveScenario: async (onAwaitingDecision, onAwaitingApproval) => {
    const inc = CORRECTIVE_MAINTENANCE_POOL[incidentRotationIndex++ % CORRECTIVE_MAINTENANCE_POOL.length]
    const client = CLIENT_PERSONAS[clientRotationIndex++ % CLIENT_PERSONAS.length]
    const override = { ...inc, clientName: client.name, clientRole: client.role }

    if (inc.route === 'known') {
      await get().runKnownScenario(override)
    } else if (inc.route === 'mid') {
      await get().runMidScenario(onAwaitingDecision, override)
    } else {
      await get().runUnknownScenario(onAwaitingApproval, override)
    }
  },
}))

export const useIncidentSimulation = useIncidentSimulationEngine

