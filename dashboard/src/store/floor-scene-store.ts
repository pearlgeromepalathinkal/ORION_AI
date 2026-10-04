import { create } from 'zustand'

export type ScenarioType = 'known' | 'mid' | 'unknown' | 'replay'

export interface IncidentTokenPos {
  x: number
  y: number
  targetNodeId: string
  label: string
  priority: string
  similarity?: number
  visible: boolean
}

export interface FloorSceneStore {
  // Scenario playback
  activeScenario: ScenarioType | null
  isPlaying: boolean
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void

  // Spatial incident token coordinates (0-100 percentage inside scene)
  token: IncidentTokenPos
  setToken: (token: Partial<IncidentTokenPos>) => void

  // Active highlighted conduit path
  activeConduit: 'known' | 'mid' | 'unknown' | null
  setActiveConduit: (c: 'known' | 'mid' | 'unknown' | null) => void

  // Replay closed-loop state
  isLearnedInPgvector: boolean
  setLearnedInPgvector: (learned: boolean) => void

  // Selected object for deep inspection modal
  inspectedEntity: {
    type: 'human' | 'station' | 'incident' | 'routing'
    id: string
    title: string
    subtitle: string
  } | null
  setInspectedEntity: (entity: FloorSceneStore['inspectedEntity']) => void

  // Reset
  resetScene: () => void
}

export const useFloorSceneStore = create<FloorSceneStore>((set) => ({
  activeScenario: null,
  isPlaying: false,
  playbackSpeed: 1,
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  token: {
    x: 50,
    y: 18,
    targetNodeId: 'intake',
    label: 'INC-1042',
    priority: 'P3',
    similarity: undefined,
    visible: false,
  },
  setToken: (t) => set((s) => ({ token: { ...s.token, ...t } })),

  activeConduit: null,
  setActiveConduit: (c) => set({ activeConduit: c }),

  isLearnedInPgvector: false,
  setLearnedInPgvector: (l) => set({ isLearnedInPgvector: l }),

  inspectedEntity: null,
  setInspectedEntity: (entity) => set({ inspectedEntity: entity }),

  resetScene: () =>
    set({
      activeScenario: null,
      isPlaying: false,
      token: {
        x: 50,
        y: 18,
        targetNodeId: 'intake',
        label: 'INC-1042',
        priority: 'P3',
        similarity: undefined,
        visible: false,
      },
      activeConduit: null,
      inspectedEntity: null,
    }),
}))
