import { create } from 'zustand'
import type { SimulationMode, ScenarioId } from '@/types'
import { useOperationsStore } from './operations-store'

interface SimulationStore {
  mode: SimulationMode
  setMode: (mode: SimulationMode) => void

  activeScenario: ScenarioId | null
  currentStepIndex: number
  isPlaying: boolean
  isComplete: boolean

  startScenario: (scenarioId: ScenarioId) => void
  stopScenario: () => void
  resetScenario: () => void
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  mode: 'simulation',
  setMode: (mode) => set({ mode }),

  activeScenario: null,
  currentStepIndex: 0,
  isPlaying: false,
  isComplete: false,

  startScenario: (scenarioId) => {
    useOperationsStore.getState().resetAll()
    set({ activeScenario: scenarioId, currentStepIndex: 0, isPlaying: true, isComplete: false })
  },

  stopScenario: () => set({ isPlaying: false }),

  resetScenario: () => {
    useOperationsStore.getState().resetAll()
    set({ activeScenario: null, currentStepIndex: 0, isPlaying: false, isComplete: false })
  },
}))
