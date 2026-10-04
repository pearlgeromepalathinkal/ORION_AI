export type KnowledgeStatus = 'active' | 'pending_review' | 'rejected' | 'draft'

export interface KnowledgeEntry {
  id: string
  title: string
  problem: string
  resolution: string
  tags: string[]
  status: KnowledgeStatus
  similarity?: number
  source: 'human' | 'playbook' | 'ai'
  usageCount: number
  successRate?: number
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  incidentRef?: string
  embedding?: number[]
}

export interface KnowledgeReviewItem {
  id: string
  draftId: string
  incidentId: string
  incidentTitle: string
  problem: string
  resolution: string
  tags: string[]
  proposedBy: 'resolution_extraction' | 'human'
  createdAt: string
  similarEntries?: Array<{ id: string; title: string; similarity: number }>
}
