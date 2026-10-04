export type StationId =
  | 'intake'
  | 'semantic'
  | 'knowledge_search'
  | 'routing'
  | 'playbook'
  | 'ai_diagnostics'
  | 'devops_infra'
  | 'qa_testing'
  | 'verification'
  | 'resolution'
  | 'knowledge_lab'

export type StationState = 'idle' | 'processing' | 'done' | 'error'

export interface SoftwareStation {
  id: StationId
  label: string
  description: string
  state: StationState
  currentIncidentId?: string
  lastOperation?: string
  processingTime?: number
}

export interface WorkflowEvent {
  id: string
  incidentId: string
  eventType: string
  stage: string
  message: string
  metadata?: Record<string, unknown>
  createdAt: string
}
