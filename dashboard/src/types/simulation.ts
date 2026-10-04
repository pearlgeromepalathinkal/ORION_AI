import type { IncidentRoute, WorkflowStage } from './incident'
import type { HumanRole } from './human'

export type SimulationMode = 'live' | 'simulation'
export type ScenarioId = 'known' | 'mid' | 'unknown' | 'closed_loop'

export interface ScenarioStep {
  id: string
  stage: WorkflowStage
  label: string
  description: string
  durationMs: number
  humanActivation?: HumanRole
  humanState?: import('./human').HumanState
  stationId?: import('./system-agent').StationId
}

export interface Scenario {
  id: ScenarioId
  name: string
  description: string
  similarity: number
  route: IncidentRoute
  incidentId: string
  incidentTitle: string
  steps: ScenarioStep[]
}

export interface SimulationState {
  mode: SimulationMode
  activeScenario?: ScenarioId
  currentStepIndex: number
  isPlaying: boolean
  isComplete: boolean
}
