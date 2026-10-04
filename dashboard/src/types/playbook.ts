export type PlaybookRisk = 'low' | 'medium' | 'high' | 'critical'

export interface PlaybookStep {
  id: string
  order: number
  action: string
  description: string
  expectedDuration?: number
  requiresApproval?: boolean
  rollbackAction?: string
}

export interface Playbook {
  id: string
  name: string
  version: string
  description: string
  risk: PlaybookRisk
  steps: PlaybookStep[]
  usageCount: number
  successRate: number
  avgDuration?: number
  requiresHumanApproval: boolean
  rollbackAvailable: boolean
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

export interface PlaybookExecution {
  id: string
  playbookId: string
  playbookName: string
  incidentId: string
  startedAt: string
  completedAt?: string
  status: 'running' | 'completed' | 'failed' | 'rolled_back'
  steps: Array<{
    stepId: string
    action: string
    status: 'pending' | 'running' | 'done' | 'failed'
    startedAt?: string
    completedAt?: string
    duration?: number
  }>
}
