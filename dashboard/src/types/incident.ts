export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4'
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type IncidentRoute = 'known' | 'mid' | 'unknown'

export type WorkflowStage =
  | 'received'
  | 'normalized'
  | 'embedding'
  | 'searching'
  | 'routing'
  | 'known'
  | 'mid'
  | 'unknown'
  | 'diagnosing'
  | 'human_review'
  | 'executing'
  | 'verifying'
  | 'resolved'
  | 'knowledge_capture'
  | 'knowledge_review'
  | 'learned'

export interface KnowledgeMatch {
  id: string
  title: string
  similarity: number
  resolution: string
  usageCount: number
}

export interface Incident {
  id: string
  title: string
  description: string
  priority: IncidentPriority
  status: IncidentStatus
  source: string
  service: string
  environment: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  similarity?: number
  route?: IncidentRoute
  jiraKey?: string
  jiraUrl?: string
  playbookId?: string
  playbookName?: string
  knowledgeMatches?: KnowledgeMatch[]
  suggestedResolution?: string
  verificationPassed?: boolean
  stage?: WorkflowStage
  mttr?: number
}

export interface IncidentToken {
  incidentId: string
  title: string
  priority: IncidentPriority
  stage: WorkflowStage
  route?: IncidentRoute
  similarity?: number
  x: number
  y: number
}
