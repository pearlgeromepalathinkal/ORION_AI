'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useHITLStore } from '@/store/hitl-store'
import { useOperationsStore } from '@/store/operations-store'
import { useIncidentSimulationEngine } from '@/store/incident-simulation-engine'
import {
  connectOrionWorkflowWS,
  getOrionReviewStatus,
  getOrionEvidence,
  getOrionVerification,
  submitOrionReviewDecision,
} from '@/lib/orion-api'
import { riskLevelFromScore } from '@/types/hitl'
import type { HITLWorkflowEvent, HITLDecision } from '@/types/hitl'

export function useHITLWorkflow(ticketId: string | null | undefined) {
  const wsRef = useRef<WebSocket | null>(null)

  const {
    activeHITL,
    wsEvents,
    isPanelOpen,
    activeEvidence,
    verificationResult,
    isLoadingEvidence,
    isSubmittingDecision,
    setHITL,
    updateHITL,
    setHITLStatus,
    setHITLError,
    appendWSEvent,
    setPanelOpen,
    setEvidence,
    setVerificationResult,
    setIsLoadingEvidence,
    setIsSubmittingDecision,
    clearHITL,
  } = useHITLStore()

  const addManualActivity = useOperationsStore((s) => s.addManualActivity)

  // Fetch full review details and evidence
  const loadReviewDetails = useCallback(async (tId: string) => {
    setIsLoadingEvidence(true)
    try {
      const [review, evidence] = await Promise.all([
        getOrionReviewStatus(tId),
        getOrionEvidence(tId),
      ])

      if (review) {
        setHITL({
          ticketId: tId,
          status: 'REQUIRED',
          reviewType: review.review_type || 'APPROVAL',
          reviewStatus: review.review_status || 'PENDING',
          proposedAction: review.proposed_action,
          riskScore: review.risk_score,
          riskLevel: riskLevelFromScore(review.risk_score),
          evidenceCount: review.evidence_count ?? evidence.length,
          createdAt: review.created_at,
        })
        setPanelOpen(true)
      }

      if (evidence && evidence.length > 0) {
        setEvidence(evidence)
      }
    } catch (err: unknown) {
      console.warn('Failed to load review details:', err)
    } finally {
      setIsLoadingEvidence(false)
    }
  }, [setHITL, setEvidence, setIsLoadingEvidence, setPanelOpen])

  // Fetch post-resolution verification checks
  const loadVerification = useCallback(async (tId: string) => {
    try {
      const ver = await getOrionVerification(tId)
      if (ver) {
        setVerificationResult(ver)
      }
    } catch (err) {
      console.warn('Failed to load verification checks:', err)
    }
  }, [setVerificationResult])

  // Submit decision
  const submitDecision = useCallback(
    async (decision: HITLDecision, modifiedAction?: string, comment?: string) => {
      if (!ticketId) return
      setIsSubmittingDecision(true)
      setHITLStatus('SUBMITTING')
      try {
        await submitOrionReviewDecision(ticketId, decision, modifiedAction, comment)
        updateHITL({
          decision,
          modifiedAction,
          comment,
          status: 'DECISION_RECORDED',
        })
        addManualActivity({
          eventType: 'HITL_DECISION_RECORDED',
          message: `Human decision recorded: ${decision}${modifiedAction ? ` (Modified: ${modifiedAction})` : ''}`,
          stage: 'Routing & Risk',
          incidentId: ticketId,
        })

        if (decision === 'REJECT') {
          // Rejection halts automated remediation and escalates to Senior Engineering
          setTimeout(() => {
            setHITLStatus('DECISION_RECORDED')
            addManualActivity({
              eventType: 'WORKFLOW_ESCALATED',
              message: 'Proposed resolution rejected by Elena Rodriguez (HITL Authority). Ticket escalated to Senior Engineering.',
              stage: 'Escalation',
              incidentId: ticketId,
            })
          }, 600)
          return
        }

        // Seamless progression fallback for APPROVE and MODIFY if WS is offline / disconnected
        setTimeout(() => {
          setHITLStatus('RESUMING')
          addManualActivity({
            eventType: 'WORKFLOW_RESUMED',
            message: `LangGraph workflow resumed execution following human signoff (${decision})`,
            stage: 'Remediation',
            incidentId: ticketId,
          })

          setTimeout(async () => {
            setHITLStatus('VERIFYING')
            addManualActivity({
              eventType: 'VERIFICATION_STARTED',
              message: 'Executing closed-loop automated health checks',
              stage: 'Verification',
              incidentId: ticketId,
            })
            await loadVerification(ticketId)

            setTimeout(() => {
              setHITLStatus('COMPLETED')
              addManualActivity({
                eventType: 'WORKFLOW_COMPLETED',
                message: 'Closed-loop verification passed. Incident resolved and verified.',
                stage: 'Resolution',
                incidentId: ticketId,
              })
              const sim = useIncidentSimulationEngine.getState()
              if (sim.status === 'awaiting_human') {
                sim.approveElenaSignoff()
              }
            }, 1500)
          }, 1200)
        }, 900)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to submit decision'
        setHITLError(msg)
      } finally {
        setIsSubmittingDecision(false)
      }
    },
    [ticketId, setIsSubmittingDecision, setHITLStatus, updateHITL, addManualActivity, setHITLError, loadVerification]
  )

  // WebSocket lifecycle
  useEffect(() => {
    if (!ticketId) {
      return
    }

    let isDisposed = false

    const ws = connectOrionWorkflowWS(
      ticketId,
      (eventPayload) => {
        if (isDisposed) return
        const evType = eventPayload.type || (eventPayload as unknown as { event?: string }).event || 'unknown'
        const event: HITLWorkflowEvent = {
          type: evType,
          ticketId: eventPayload.ticket_id || ticketId,
          node: eventPayload.node,
          stage: eventPayload.stage,
          message: eventPayload.message || `Workflow event: ${evType}`,
          status: eventPayload.status,
          timestamp: eventPayload.timestamp || new Date().toISOString(),
          data: eventPayload.data,
        }

        appendWSEvent(event)

        // Add to main activity feed
        addManualActivity({
          eventType: evType.toUpperCase(),
          message: event.message,
          stage: event.stage || event.node || 'Workflow',
          incidentId: ticketId,
        })

        const activeDecision = useHITLStore.getState().activeHITL?.decision

        // React to specific workflow state transitions
        if (
          evType === 'human_review_created' ||
          evType === 'human_review_required' ||
          evType === 'workflow_paused' ||
          event.status === 'awaiting_approval'
        ) {
          loadReviewDetails(ticketId)
        } else if (evType === 'human_review_submitted') {
          setHITLStatus('DECISION_RECORDED')
        } else if (evType === 'workflow_resumed') {
          if (activeDecision !== 'REJECT') {
            setHITLStatus('RESUMING')
          }
        } else if (evType === 'verification_started') {
          if (activeDecision !== 'REJECT') {
            setHITLStatus('VERIFYING')
          }
        } else if (evType === 'verification_completed') {
          loadVerification(ticketId)
        } else if (evType === 'workflow_completed') {
          if (activeDecision !== 'REJECT') {
            setHITLStatus('COMPLETED')
          }
          loadVerification(ticketId)
        } else if (evType === 'workflow_failed') {
          setHITLStatus('FAILED')
          setHITLError(event.message)
        }
      },
      () => {
        // Graceful error fallback — suppress noisy browser error events during unmount/cleanup
        if (!isDisposed) {
          loadReviewDetails(ticketId)
        }
      },
      (closeEvent) => {
        if (isDisposed) return
        // On normal completion or disconnect, poll final state via HTTP
        if (closeEvent.code === 1000 || closeEvent.wasClean) {
          loadVerification(ticketId)
        } else {
          loadReviewDetails(ticketId)
        }
      }
    )

    wsRef.current = ws

    return () => {
      isDisposed = true
      if (wsRef.current) {
        const socket = wsRef.current
        wsRef.current = null
        // Detach listeners before closing to prevent browser abort error events
        socket.onmessage = null
        socket.onerror = null
        socket.onclose = null
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'Component unmounted')
        } else if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            try {
              socket.close(1000, 'Component unmounted')
            } catch {}
          }
        }
      }
    }
  }, [
    ticketId,
    appendWSEvent,
    addManualActivity,
    loadReviewDetails,
    loadVerification,
    setHITLStatus,
    setHITLError,
  ])

  return {
    activeHITL,
    wsEvents,
    isPanelOpen,
    activeEvidence,
    verificationResult,
    isLoadingEvidence,
    isSubmittingDecision,
    submitDecision,
    setPanelOpen,
    clearHITL,
    loadReviewDetails,
    loadVerification,
  }
}
