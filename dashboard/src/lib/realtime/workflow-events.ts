import { supabase } from './supabase'
import type { WorkflowEvent } from '@/types'

export type WorkflowEventCallback = (event: WorkflowEvent) => void

const EVENT_TYPE_STAGE_MAP: Record<string, string> = {
  INCIDENT_RECEIVED: 'received',
  PAYLOAD_NORMALIZED: 'normalized',
  EMBEDDING_STARTED: 'embedding',
  EMBEDDING_GENERATED: 'embedding',
  KNOWLEDGE_SEARCH_STARTED: 'searching',
  KNOWLEDGE_MATCH_FOUND: 'searching',
  ROUTING_DECISION: 'routing',
  PLAYBOOK_STARTED: 'executing',
  VERIFICATION_PASSED: 'verifying',
  INCIDENT_RESOLVED: 'resolved',
  HUMAN_REVIEW_REQUIRED: 'human_review',
  DEVELOPER_ACTIVATED: 'human_review',
  ENGINEER_ACTIVATED: 'human_review',
  KNOWLEDGE_REVIEW_REQUIRED: 'knowledge_review',
  KNOWLEDGE_APPROVED: 'learned',
}

export function normalizeWorkflowEvent(raw: Record<string, unknown>): WorkflowEvent {
  const eventType = (raw.event_type as string) || ''
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    incidentId: (raw.incident_id as string) || '',
    eventType,
    stage: EVENT_TYPE_STAGE_MAP[eventType] || (raw.stage as string) || 'received',
    message: (raw.message as string) || eventType.replace(/_/g, ' ').toLowerCase(),
    metadata: (raw.metadata as Record<string, unknown>) || {},
    createdAt: (raw.created_at as string) || new Date().toISOString(),
  }
}

export function subscribeToWorkflowEvents(callback: WorkflowEventCallback) {
  const channel = supabase
    .channel('workflow-events-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'workflow_events' },
      (payload) => {
        const normalized = normalizeWorkflowEvent(payload.new as Record<string, unknown>)
        callback(normalized)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
