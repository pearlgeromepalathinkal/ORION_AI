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
  // Backward-compatibility aliases
  | 'commander'
  | 'developer'
  | 'sre'
  | 'curator'

export type HumanState =
  | 'idle'
  | 'alerted'
  | 'standing'
  | 'walking'
  | 'working'
  | 'talking'
  | 'waiting'
  | 'reviewing'
  | 'investigating'
  | 'action_required'
  | 'resolving'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'returning'
  | 'completed'

export interface HumanParticipant {
  id: HumanRole
  name: string
  title: string
  role?: string
  specialization?: string
  avatar: string
  state: HumanState
  currentIncidentId?: string
  activeSince?: string
  actionMessage?: string
  taskProgress?: number
}

export interface HumanAction {
  type: 'accept' | 'modify' | 'resolve' | 'escalate' | 'reject' | 'approve' | 'request_diagnostics'
  label: string
  description: string
  risk?: 'low' | 'medium' | 'high'
}

export interface DeveloperWorkspace {
  incident: import('./incident').Incident
  historicalMatches: import('./incident').KnowledgeMatch[]
  suggestedAction: string
  notes: string
  selectedResolution?: string
}

export interface SREWorkspace {
  incident: import('./incident').Incident
  aiHypothesis: {
    rootCause: string
    confidence: number
    evidence: string[]
    proposedFix: string
  }
  investigationSteps: Array<{
    name: string
    status: 'pending' | 'checking' | 'passed' | 'failed'
  }>
  notes: string
  decision?: 'approve' | 'modify' | 'escalate'
}

export interface CuratorWorkspace {
  draftId: string
  incident: import('./incident').Incident
  problem: string
  resolution: string
  tags: string[]
  decision?: 'approve' | 'edit' | 'reject'
}
