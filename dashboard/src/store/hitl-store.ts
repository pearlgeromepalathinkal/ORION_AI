import { create } from 'zustand'
import type {
  HITLStatus,
  HITLReviewState,
  HITLWorkflowEvent,
  HITLEvidenceDocument,
  HITLVerificationResult,
} from '@/types/hitl'

interface HITLStoreState {
  activeHITL: HITLReviewState | null
  wsEvents: HITLWorkflowEvent[]
  isPanelOpen: boolean
  activeEvidence: HITLEvidenceDocument[]
  verificationResult: HITLVerificationResult | null
  isLoadingEvidence: boolean
  isSubmittingDecision: boolean

  // Actions
  setHITL: (state: HITLReviewState) => void
  updateHITL: (partial: Partial<HITLReviewState>) => void
  clearHITL: () => void
  setHITLStatus: (status: HITLStatus) => void
  setHITLError: (error?: string) => void
  appendWSEvent: (event: HITLWorkflowEvent) => void
  clearWSEvents: () => void
  setPanelOpen: (open: boolean) => void
  setEvidence: (docs: HITLEvidenceDocument[]) => void
  setVerificationResult: (res: HITLVerificationResult | null) => void
  setIsLoadingEvidence: (loading: boolean) => void
  setIsSubmittingDecision: (submitting: boolean) => void
}

export const useHITLStore = create<HITLStoreState>((set) => ({
  activeHITL: null,
  wsEvents: [],
  isPanelOpen: false,
  activeEvidence: [],
  verificationResult: null,
  isLoadingEvidence: false,
  isSubmittingDecision: false,

  setHITL: (state) =>
    set({
      activeHITL: state,
    }),

  updateHITL: (partial) =>
    set((s) => ({
      activeHITL: s.activeHITL ? { ...s.activeHITL, ...partial } : null,
    })),

  clearHITL: () =>
    set({
      activeHITL: null,
      activeEvidence: [],
      verificationResult: null,
      isPanelOpen: false,
    }),

  setHITLStatus: (status) =>
    set((s) => ({
      activeHITL: s.activeHITL ? { ...s.activeHITL, status } : null,
    })),

  setHITLError: (error) =>
    set((s) => ({
      activeHITL: s.activeHITL
        ? {
            ...s.activeHITL,
            lastError: error,
            status: error ? 'FAILED' : s.activeHITL.status,
          }
        : null,
    })),

  appendWSEvent: (event) =>
    set((s) => {
      const next = [event, ...s.wsEvents]
      return { wsEvents: next.slice(0, 50) }
    }),

  clearWSEvents: () => set({ wsEvents: [] }),

  setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),

  setEvidence: (activeEvidence) => set({ activeEvidence }),

  setVerificationResult: (verificationResult) => set({ verificationResult }),

  setIsLoadingEvidence: (isLoadingEvidence) => set({ isLoadingEvidence }),

  setIsSubmittingDecision: (isSubmittingDecision) => set({ isSubmittingDecision }),
}))
