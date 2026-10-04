import { NextRequest, NextResponse } from 'next/server'

interface DiagnosticTimelineEntry {
  timestamp: string
  source: string
  actor?: string
  message: string
}

interface JiraTicketResponse {
  found: boolean
  errorType?: 'NOT_FOUND' | 'CONNECTION_ERROR' | 'INVALID_INPUT'
  ticketId?: string
  message?: string
  source?: 'Jira API' | 'ORION-AI Incident Store (JIRA Mirror)'
  ticket?: {
    id: string
    key: string
    summary: string
    description?: string
    status: string
    priority: string
    route?: 'KNOWN' | 'MID' | 'UNKNOWN'
    similarity?: number
    assignee: string
    reporter: string
    created: string
    updated: string
    resolution?: string | null
    labels: string[]
    issueType: string
    hasDiagnostics: boolean
    diagnosticSteps?: string[] | null
    diagnosticTimeline?: DiagnosticTimelineEntry[]
    rootCause?: string | null
    resolutionDetails?: string | null
    verification?: string | null
    knowledge?: string | null
    comments?: Array<{
      id: string
      author: string
      created: string
      body: string
    }>
    raw?: Record<string, unknown>
  }
}

// Canonical ORION-AI incidents repository with full diagnostic history
const ORION_INCIDENT_RECORDS: Record<string, NonNullable<JiraTicketResponse['ticket']>> = {
  'INC-1042': {
    id: 'INC-1042',
    key: 'INC-1042',
    summary: 'VPN Authentication Failure on Gateway',
    description: 'VPN auth daemon returning invalid session handshake. High concurrency token expiry triggering connection drops.',
    status: 'Resolved',
    priority: 'High',
    route: 'KNOWN',
    similarity: 0.94,
    assignee: 'Alex Rivera',
    reporter: 'Prometheus Alertmanager',
    created: '10:30:12 AM',
    updated: '10:32:00 AM',
    resolution: 'Done',
    labels: ['auto-managed', 'known-issue', 'vpn', 'auth'],
    issueType: 'Incident',
    hasDiagnostics: true,
    diagnosticSteps: [
      'Incident payload normalized from intake gateway',
      'Semantic embedding generated (1536-dim text-embedding-3-small)',
      'Knowledge search returned high similarity (0.94 match with KB-089)',
      'Incident classified as KNOWN (similarity ≥ 0.85 threshold)',
      'Autonomous remediation playbook VPN-AUTH-01 executed',
      'VPN session cache flushed and auth daemon restarted',
      'QA automated verification completed (5/5 health checks passed)',
      'Jira ticket updated and closed',
      'Knowledge entry KB-089 re-verified and reinforced',
    ],
    diagnosticTimeline: [
      { timestamp: '10:30', source: 'JIRA', message: 'Incident received from monitoring webhook' },
      { timestamp: '10:30', source: 'ORION-AI', message: 'Knowledge similarity: 0.94 (KB-089: VPN Gateway Protocol)' },
      { timestamp: '10:30', source: 'ORION-AI', message: 'Route: KNOWN — Autonomous playbook execution authorized' },
      { timestamp: '10:31', source: 'Playbook Engine', message: 'Executed VPN-AUTH-01: flushed session cache & restarted auth daemon' },
      { timestamp: '10:31', source: 'Maya — QA', message: 'Verification passed: 5/5 probes green, auth handshake < 12ms' },
      { timestamp: '10:32', source: 'Elena — Manager', message: 'Resolution approved. Jira ticket synced and marked Done' },
    ],
    rootCause: 'Stale authentication session cache caused token invalidation race under concurrency.',
    resolutionDetails: 'Auth cache purged and session handshake daemon restarted autonomously via VPN-AUTH-01.',
    verification: '5/5 automated health checks passed. Zero auth handshake failures detected.',
    knowledge: 'Candidate reinforced from resolved incident; vector index KB-089 confirmed.',
    comments: [
      {
        id: 'c1',
        author: 'ORION-AI Bot',
        created: '10:30:15 AM',
        body: '[ORION-AI] Matched KB-089 with 0.94 cosine similarity. Executing autonomous playbook VPN-AUTH-01.',
      },
      {
        id: 'c2',
        author: 'Maya Patel',
        created: '10:31:45 AM',
        body: '[QA] Verified 5/5 health probes: service online, latency 11ms, zero dropped connections.',
      },
      {
        id: 'c3',
        author: 'Elena Rodriguez',
        created: '10:32:00 AM',
        body: '[Resolution] Closed autonomously in 1.88s. Incident marked Resolved.',
      },
    ],
  },
  'EPL-1067': {
    id: 'EPL-1067',
    key: 'EPL-1067',
    summary: 'Database Connection Timeout on Checkout API',
    description: 'Client Platform reported HTTP 504 Gateway Timeout on checkout-service during peak load. Connection pool exhausted at 100% capacity.',
    status: 'Resolved',
    priority: 'High',
    route: 'MID',
    similarity: 0.78,
    assignee: 'Jordan Hayes',
    reporter: 'Client Platform',
    created: '11:15:02 AM',
    updated: '11:18:20 AM',
    resolution: 'Done',
    labels: ['checkout', 'database', 'latency', 'pool-saturation'],
    issueType: 'Incident',
    hasDiagnostics: true,
    diagnosticSteps: [
      'Incident payload received and normalized from Client Platform',
      'Vector search returned 0.78 similarity to KB-074 (Database Pool Scaling)',
      'Classified as MID confidence (0.55–0.84 threshold) — human review required',
      'Escalated to Systems Engineer pool for Jordan Hayes review',
      'Jordan Hayes inspected connection pool telemetry at systems engineer workstation',
      'Approved connection pool scaling (150 → 400 connections)',
      'Applied configuration patch and pool re-allocation',
      'Noah Williams performed load verification test',
      'Verification passed with latency dropped to 38ms',
    ],
    diagnosticTimeline: [
      { timestamp: '11:15', source: 'JIRA', message: 'Client Platform reported HTTP 504 Gateway Timeout' },
      { timestamp: '11:15', source: 'ORION-AI', message: 'Knowledge similarity: 0.78 (KB-074: DB Connection Sizing)' },
      { timestamp: '11:15', source: 'ORION-AI', message: 'Route: MID — Systems Engineer intervention required' },
      { timestamp: '11:16', source: 'Jordan — Database', message: 'Inspected database logs: 150/150 connections locked in wait queues' },
      { timestamp: '11:17', source: 'Jordan — Database', message: 'Applied connection pool expansion: maxConnections 150 -> 400' },
      { timestamp: '11:18', source: 'Noah — QA', message: 'Verification passed: p99 latency dropped to 38ms, 0 timeouts' },
      { timestamp: '11:18', source: 'Elena — Manager', message: 'Resolution approved. Jira ticket synced and closed' },
    ],
    rootCause: 'Connection pool capacity (150 max) saturated by surge in checkout microservice traffic.',
    resolutionDetails: 'Connection pool scaled to 400 connections; idle timeout reduced to 30s.',
    verification: 'QA load verification passed. Connection wait times normalized to < 4ms.',
    knowledge: 'Updated KB-074 with new sizing heuristics for high-traffic checkout events.',
    comments: [
      {
        id: 'c1',
        author: 'ORION-AI Bot',
        created: '11:15:10 AM',
        body: '[ORION-AI] Similarity 0.78 to KB-074. Escalated to Jordan Hayes for human approval.',
      },
      {
        id: 'c2',
        author: 'Jordan Hayes',
        created: '11:17:30 AM',
        body: 'Approved scaling patch: pool capacity increased from 150 to 400 connections.',
      },
    ],
  },
  'INC-1067': {
    id: 'EPL-1067',
    key: 'INC-1067',
    summary: 'Database Connection Timeout on Checkout API',
    description: 'Client Platform reported HTTP 504 Gateway Timeout on checkout-service during peak load. Connection pool exhausted at 100% capacity.',
    status: 'Resolved',
    priority: 'High',
    route: 'MID',
    similarity: 0.78,
    assignee: 'Jordan Hayes',
    reporter: 'Client Platform',
    created: '11:15:02 AM',
    updated: '11:18:20 AM',
    resolution: 'Done',
    labels: ['checkout', 'database', 'latency', 'pool-saturation'],
    issueType: 'Incident',
    hasDiagnostics: true,
    diagnosticSteps: [
      'Incident payload received and normalized from Client Platform',
      'Vector search returned 0.78 similarity to KB-074 (Database Pool Scaling)',
      'Classified as MID confidence (0.55–0.84 threshold) — human review required',
      'Escalated to Systems Engineer pool for Jordan Hayes review',
      'Jordan Hayes inspected connection pool telemetry at systems engineer workstation',
      'Approved connection pool scaling (150 → 400 connections)',
      'Applied configuration patch and pool re-allocation',
      'Noah Williams performed load verification test',
      'Verification passed with latency dropped to 38ms',
    ],
    diagnosticTimeline: [
      { timestamp: '11:15', source: 'JIRA', message: 'Client Platform reported HTTP 504 Gateway Timeout' },
      { timestamp: '11:15', source: 'ORION-AI', message: 'Knowledge similarity: 0.78 (KB-074: DB Connection Sizing)' },
      { timestamp: '11:15', source: 'ORION-AI', message: 'Route: MID — Systems Engineer intervention required' },
      { timestamp: '11:16', source: 'Jordan — Database', message: 'Inspected database logs: 150/150 connections locked in wait queues' },
      { timestamp: '11:17', source: 'Jordan — Database', message: 'Applied connection pool expansion: maxConnections 150 -> 400' },
      { timestamp: '11:18', source: 'Noah — QA', message: 'Verification passed: p99 latency dropped to 38ms, 0 timeouts' },
      { timestamp: '11:18', source: 'Elena — Manager', message: 'Resolution approved. Jira ticket synced and closed' },
    ],
    rootCause: 'Connection pool capacity (150 max) saturated by surge in checkout microservice traffic.',
    resolutionDetails: 'Connection pool scaled to 400 connections; idle timeout reduced to 30s.',
    verification: 'QA load verification passed. Connection wait times normalized to < 4ms.',
    knowledge: 'Updated KB-074 with new sizing heuristics for high-traffic checkout events.',
  },
  'EPL-1088': {
    id: 'EPL-1088',
    key: 'EPL-1088',
    summary: 'Novel Deadlock on Payment Transactions',
    description: 'Circular lock wait detected between orders and inventory tables during concurrent checkout operations.',
    status: 'Resolved',
    priority: 'Critical',
    route: 'UNKNOWN',
    similarity: 0.41,
    assignee: 'Marcus Lee & Jordan Hayes',
    reporter: 'Client Webhook',
    created: '02:02:10 PM',
    updated: '02:08:45 PM',
    resolution: 'Done',
    labels: ['p1', 'deadlock', 'payments', 'novel-incident'],
    issueType: 'Bug',
    hasDiagnostics: true,
    diagnosticSteps: [
      'Incident payload normalized from Client Webhook',
      'Semantic embedding generated and vector search performed',
      'Knowledge search returned low similarity (0.41 < 0.55)',
      'Incident classified as UNKNOWN (novel pattern)',
      'SRE investigation started by Marcus Lee & Jordan Hayes',
      'Payment service lock traces & server telemetry inspected',
      'Identified circular lock acquisition between orders and inventory tables',
      'Deterministic lock ordering fix implemented in payment commit',
      'QA verification completed by Maya Lin (zero lock waits)',
      'Elena Rodriguez approved resolution sign-off',
      'Closed-loop knowledge candidate synthesized into pgvector',
    ],
    diagnosticTimeline: [
      { timestamp: '14:02', source: 'JIRA', message: 'Client reported failed transactions and deadlock errors' },
      { timestamp: '14:02', source: 'ORION-AI', message: 'Knowledge similarity: 0.41 (< 0.55)' },
      { timestamp: '14:02', source: 'ORION-AI', message: 'Route: UNKNOWN — Novel incident, SRE escalation required' },
      { timestamp: '14:03', source: 'Marcus — SRE', message: 'Started infrastructure & lock wait trace at diagnostics station' },
      { timestamp: '14:05', source: 'Jordan — Systems Eng', message: 'Identified circular lock acquisition: orders vs inventory' },
      { timestamp: '14:06', source: 'Jordan — Systems Eng', message: 'Applied deterministic lock order in payment transaction service' },
      { timestamp: '14:07', source: 'Maya — QA', message: 'Verification passed: 500 concurrent transactions, 0 deadlocks' },
      { timestamp: '14:08', source: 'Elena — Manager', message: 'Resolution approved. Jira ticket synced and closed' },
      { timestamp: '14:08', source: 'ORION-AI', message: 'Synthesized knowledge candidate: KB-1250 indexed into pgvector' },
    ],
    rootCause: 'Circular lock wait between orders and inventory tables during concurrent checkout transactions.',
    resolutionDetails: 'Deterministic lock acquisition ordering implemented and transaction isolation adjusted.',
    verification: 'QA verification passed: 500 concurrent transaction load test completed without deadlock.',
    knowledge: 'Candidate KB-1250 created from resolved incident and indexed into pgvector.',
    comments: [
      {
        id: 'c1',
        author: 'ORION-AI Bot',
        created: '02:02:15 PM',
        body: '[ORION-AI] Similarity 0.41 (< 0.55 threshold). Novel incident classified as UNKNOWN. Alerted Marcus Lee.',
      },
      {
        id: 'c2',
        author: 'Marcus Lee',
        created: '02:04:20 PM',
        body: '[SRE Diagnostics] Thread dump confirms deadlock between lock_orders (pid 4182) and lock_inventory (pid 4190).',
      },
      {
        id: 'c3',
        author: 'Jordan Hayes',
        created: '02:06:50 PM',
        body: '[Fix Applied] Ordered lock acquisition: inventory first, then orders. Commit sequence verified.',
      },
      {
        id: 'c4',
        author: 'Elena Rodriguez',
        created: '02:08:40 PM',
        body: '[Closure] Approved by Incident Manager. Synthesized KB-1250 into pgvector.',
      },
    ],
  },
  'INC-1088': {
    id: 'EPL-1088',
    key: 'INC-1088',
    summary: 'Novel Deadlock on Payment Transactions',
    description: 'Circular lock wait detected between orders and inventory tables during concurrent checkout operations.',
    status: 'Resolved',
    priority: 'Critical',
    route: 'UNKNOWN',
    similarity: 0.41,
    assignee: 'Marcus Lee & Jordan Hayes',
    reporter: 'Client Webhook',
    created: '02:02:10 PM',
    updated: '02:08:45 PM',
    resolution: 'Done',
    labels: ['p1', 'deadlock', 'payments', 'novel-incident'],
    issueType: 'Bug',
    hasDiagnostics: true,
    diagnosticSteps: [
      'Incident payload normalized from Client Webhook',
      'Semantic embedding generated and vector search performed',
      'Knowledge search returned low similarity (0.41 < 0.55)',
      'Incident classified as UNKNOWN (novel pattern)',
      'SRE investigation started by Marcus Lee & Jordan Hayes',
      'Payment service lock traces & server telemetry inspected',
      'Identified circular lock acquisition between orders and inventory tables',
      'Deterministic lock ordering fix implemented in payment commit',
      'QA verification completed by Maya Lin (zero lock waits)',
      'Elena Rodriguez approved resolution sign-off',
      'Closed-loop knowledge candidate synthesized into pgvector',
    ],
    diagnosticTimeline: [
      { timestamp: '14:02', source: 'JIRA', message: 'Client reported failed transactions and deadlock errors' },
      { timestamp: '14:02', source: 'ORION-AI', message: 'Knowledge similarity: 0.41 (< 0.55)' },
      { timestamp: '14:02', source: 'ORION-AI', message: 'Route: UNKNOWN — Novel incident, SRE escalation required' },
      { timestamp: '14:03', source: 'Marcus — SRE', message: 'Started infrastructure & lock wait trace at diagnostics station' },
      { timestamp: '14:05', source: 'Jordan — Systems Eng', message: 'Identified circular lock acquisition: orders vs inventory' },
      { timestamp: '14:06', source: 'Jordan — Systems Eng', message: 'Applied deterministic lock order in payment transaction service' },
      { timestamp: '14:07', source: 'Maya — QA', message: 'Verification passed: 500 concurrent transactions, 0 deadlocks' },
      { timestamp: '14:08', source: 'Elena — Manager', message: 'Resolution approved. Jira ticket synced and closed' },
      { timestamp: '14:08', source: 'ORION-AI', message: 'Synthesized knowledge candidate: KB-1250 indexed into pgvector' },
    ],
    rootCause: 'Circular lock wait between orders and inventory tables during concurrent checkout transactions.',
    resolutionDetails: 'Deterministic lock acquisition ordering implemented and transaction isolation adjusted.',
    verification: 'QA verification passed: 500 concurrent transaction load test completed without deadlock.',
    knowledge: 'Candidate KB-1250 created from resolved incident and indexed into pgvector.',
  },
  'INC-1099': {
    id: 'INC-1099',
    key: 'INC-1099',
    summary: 'Cascading Service Degradation — Unknown Pattern',
    description: 'Multiple microservices dropping requests simultaneously. Insufficient historical vector match.',
    status: 'Resolved',
    priority: 'Critical',
    route: 'UNKNOWN',
    similarity: 0.28,
    assignee: 'Elena Rodriguez & Taylor Morgan',
    reporter: 'Client Visitor',
    created: '04:40:01 PM',
    updated: '04:46:15 PM',
    resolution: 'Done',
    labels: ['p1', 'insufficient-evidence', 'human-review-required', 'routing-anomaly'],
    issueType: 'Incident',
    hasDiagnostics: true,
    diagnosticSteps: [
      'Incident payload received from Client Visitor in reception',
      'Vector search returned similarity 0.28 (< 0.55 threshold)',
      'Classified as INSUFFICIENT EVIDENCE — AI cannot safely resolve autonomously',
      'Escalated to HUMAN REVIEW REQUIRED',
      'Elena Rodriguez assigned Taylor Morgan (Cloud & Infra) & Marcus Lee (SRE)',
      'Conducted deep forensics at AI Diagnostics station',
      'Identified BGP routing flap causing cascading timeout loops',
      'Rerouted traffic dynamically around flapping ingress gateway',
      'Elena approved human sign-off; service restored',
    ],
    diagnosticTimeline: [
      { timestamp: '16:40', source: 'JIRA', message: 'Multiple services reporting simultaneous packet degradation' },
      { timestamp: '16:40', source: 'ORION-AI', message: 'Knowledge similarity: 0.28 (< 0.55)' },
      { timestamp: '16:40', source: 'ORION-AI', message: 'INSUFFICIENT EVIDENCE: AI cannot safely auto-resolve. Human review required' },
      { timestamp: '16:41', source: 'Elena — Manager', message: 'Assigned Taylor Morgan & Marcus Lee for manual triage' },
      { timestamp: '16:43', source: 'Marcus — SRE', message: 'Running full stack forensics at AI Diagnostics station' },
      { timestamp: '16:44', source: 'Taylor — Cloud', message: 'Identified BGP flap on primary ingress; rerouted cluster traffic' },
      { timestamp: '16:45', source: 'Elena — Manager', message: 'Human review complete. Safe to proceed. Resolution approved' },
    ],
    rootCause: 'BGP ingress route flap causing cascading retry storms across downstream pods.',
    resolutionDetails: 'Ingress traffic rerouted to backup path and retry backoff limits tightened.',
    verification: 'Cluster packet drop rate returned to 0.00%. Latency nominal across all regions.',
    knowledge: 'Ingress routing flap failure mode cataloged into knowledge store.',
  },
}

// Helper to extract plain text from Atlassian Document Format (ADF)
function extractTextFromAdf(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const obj = node as Record<string, unknown>
  if (typeof obj.text === 'string') return obj.text
  if (Array.isArray(obj.content)) {
    return obj.content.map(extractTextFromAdf).join(' ')
  }
  return ''
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticketIdParam = searchParams.get('id') || searchParams.get('ticketId')

  if (!ticketIdParam || !ticketIdParam.trim()) {
    return NextResponse.json<JiraTicketResponse>(
      {
        found: false,
        errorType: 'INVALID_INPUT',
        message: 'Ticket ID is required. Example: jira INC-1042',
      },
      { status: 400 }
    )
  }

  const rawTicketId = ticketIdParam.trim()
  const projectKey = process.env.JIRA_PROJECT_KEY || 'KAN'
  const ticketId = /^\d+$/.test(rawTicketId) ? `${projectKey}-${rawTicketId}` : rawTicketId.toUpperCase()

  // Server-side credentials (READ-ONLY GET requests only)
  const baseUrl = process.env.JIRA_BASE_URL || process.env.JIRA_URL || 'https://emailnssvitc.atlassian.net'
  const email = process.env.JIRA_EMAIL || 'email.nssvitc@gmail.com'
  const apiToken = process.env.JIRA_API_TOKEN

  let jiraSuccess = false
  let jiraTicketData: JiraTicketResponse['ticket'] | null = null
  let isConnectionError = false

  // 1. If Jira credentials exist, attempt real Jira API retrieval
  if (apiToken) {
    try {
      const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`
      const jiraUrl = `${baseUrl.replace(/\/+$/, '')}/rest/api/3/issue/${encodeURIComponent(ticketId)}?expand=renderedFields,names,changelog`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4500)

      const response = await fetch(jiraUrl, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const fields = data.fields || {}

        let description = ''
        if (typeof fields.description === 'string') {
          description = fields.description
        } else if (fields.description) {
          description = extractTextFromAdf(fields.description)
        }

        const comments = (fields.comment?.comments || []).map((c: any) => {
          let body = ''
          if (typeof c.body === 'string') body = c.body
          else if (c.body) body = extractTextFromAdf(c.body)
          return {
            id: c.id || String(Math.random()),
            author: c.author?.displayName || 'Unknown',
            created: c.created || '',
            body: body.trim(),
          }
        })

        // Inspect Jira comments/description for ORION-AI diagnostic markers
        const diagnosticSteps: string[] = []
        const timeline: DiagnosticTimelineEntry[] = [
          {
            timestamp: fields.created ? new Date(fields.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00',
            source: 'JIRA',
            message: `Ticket created: ${fields.summary || ticketId}`,
          },
        ]

        let route: 'KNOWN' | 'MID' | 'UNKNOWN' | undefined = undefined
        let similarity: number | undefined = undefined
        let rootCause: string | null = null
        let resolutionDetails: string | null = null
        let verification: string | null = null
        let knowledge: string | null = null

        // Parse comments for ORION-AI operational provenance
        for (const c of comments) {
          const text = c.body
          const time = c.created ? new Date(c.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          timeline.push({
            timestamp: time,
            source: c.author.includes('ORION-AI') ? 'ORION-AI' : c.author,
            message: text,
          })

          if (text.includes('[KNOWN]') || text.includes('Route: KNOWN')) route = 'KNOWN'
          if (text.includes('[MID]') || text.includes('Route: MID')) route = 'MID'
          if (text.includes('[UNKNOWN]') || text.includes('Route: UNKNOWN')) route = 'UNKNOWN'

          const simMatch = text.match(/similarity[:\s]+(0\.\d+)/i)
          if (simMatch) similarity = parseFloat(simMatch[1])

          if (/root cause[:\s]+(.*)/i.test(text)) {
            rootCause = text.match(/root cause[:\s]+(.*)/i)?.[1] || null
          }
          if (/resolution[:\s]+(.*)/i.test(text)) {
            resolutionDetails = text.match(/resolution[:\s]+(.*)/i)?.[1] || null
          }
          if (/verification[:\s]+(.*)/i.test(text)) {
            verification = text.match(/verification[:\s]+(.*)/i)?.[1] || null
          }
        }

        const hasDiagnostics = diagnosticSteps.length > 0 || timeline.length > 1 || Boolean(route)

        // Clean sanitized raw output (no tokens, credentials, cookies, headers)
        const sanitizedRaw = {
          id: data.id,
          key: data.key,
          self: data.self,
          fields: {
            summary: fields.summary,
            status: fields.status?.name,
            priority: fields.priority?.name,
            issuetype: fields.issuetype?.name,
            created: fields.created,
            updated: fields.updated,
            labels: fields.labels,
            assignee: fields.assignee ? { displayName: fields.assignee.displayName } : null,
            reporter: fields.reporter ? { displayName: fields.reporter.displayName } : null,
            resolution: fields.resolution ? { name: fields.resolution.name } : null,
            commentCount: comments.length,
          },
        }

        jiraTicketData = {
          id: data.id || ticketId,
          key: data.key || ticketId,
          summary: fields.summary || 'No summary',
          description: description || undefined,
          status: fields.status?.name || 'Open',
          priority: fields.priority?.name || 'Medium',
          route,
          similarity,
          assignee: fields.assignee?.displayName || 'Unassigned',
          reporter: fields.reporter?.displayName || 'System',
          created: fields.created || '',
          updated: fields.updated || '',
          resolution: fields.resolution?.name || null,
          labels: fields.labels || [],
          issueType: fields.issuetype?.name || 'Bug',
          hasDiagnostics,
          diagnosticSteps: hasDiagnostics ? diagnosticSteps : null,
          diagnosticTimeline: timeline,
          rootCause,
          resolutionDetails,
          verification,
          knowledge,
          comments,
          raw: sanitizedRaw,
        }
        jiraSuccess = true
      } else if (response.status === 401 || response.status === 403 || response.status >= 500) {
        isConnectionError = true
      }
    } catch {
      isConnectionError = true
    }
  } else {
    isConnectionError = true
  }

  // 2. Return live Jira data if successfully retrieved
  if (jiraSuccess && jiraTicketData) {
    return NextResponse.json<JiraTicketResponse>({
      found: true,
      source: 'Jira API',
      ticket: jiraTicketData,
    })
  }

  // 3. Fallback to ORION-AI Incident Store for canonical demo/buildathon tickets
  const matchedRecord =
    ORION_INCIDENT_RECORDS[ticketId] ||
    ORION_INCIDENT_RECORDS[rawTicketId] ||
    ORION_INCIDENT_RECORDS[`INC-${ticketId.replace('EPL-', '')}`] ||
    ORION_INCIDENT_RECORDS[`EPL-${ticketId.replace('INC-', '')}`]

  if (matchedRecord) {
    const sanitizedRaw = {
      id: matchedRecord.id,
      key: matchedRecord.key,
      summary: matchedRecord.summary,
      status: matchedRecord.status,
      priority: matchedRecord.priority,
      route: matchedRecord.route,
      similarity: matchedRecord.similarity,
      assignee: matchedRecord.assignee,
      reporter: matchedRecord.reporter,
      created: matchedRecord.created,
      updated: matchedRecord.updated,
      labels: matchedRecord.labels,
      issueType: matchedRecord.issueType,
      diagnosticSteps: matchedRecord.diagnosticSteps,
      rootCause: matchedRecord.rootCause,
      resolutionDetails: matchedRecord.resolutionDetails,
      verification: matchedRecord.verification,
      knowledge: matchedRecord.knowledge,
    }

    return NextResponse.json<JiraTicketResponse>({
      found: true,
      source: 'ORION-AI Incident Store (JIRA Mirror)',
      ticket: {
        ...matchedRecord,
        raw: sanitizedRaw,
      },
    })
  }

  // 4. Ticket not found error state
  if (!isConnectionError) {
    return NextResponse.json<JiraTicketResponse>(
      {
        found: false,
        errorType: 'NOT_FOUND',
        ticketId: rawTicketId,
        message: `Ticket ${rawTicketId} could not be retrieved.`,
      },
      { status: 404 }
    )
  }

  // 5. Connection error state
  return NextResponse.json<JiraTicketResponse>(
    {
      found: false,
      errorType: 'CONNECTION_ERROR',
      ticketId: rawTicketId,
      message: 'Unable to retrieve ticket data. The incident dashboard remains available.',
    },
    { status: 503 }
  )
}
