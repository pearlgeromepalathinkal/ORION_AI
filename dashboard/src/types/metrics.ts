export interface SystemMetrics {
  totalIncidents: number
  resolvedIncidents: number
  autoResolvedToday: number
  activeIncidents: number
  avgMttrMinutes: number
  mttrTrend: number // percent change vs previous period
  autoResolutionRate: number
  verificationSuccessRate: number
  playbookSuccessRate: number
  humanInterventionRate: number
  knowledgeTotalEntries: number
  knowledgeGrowthThisMonth: number
  routingDistribution: {
    known: number
    mid: number
    unknown: number
  }
  mttrHistory: Array<{ date: string; mttr: number }>
  resolutionHistory: Array<{ date: string; auto: number; human: number }>
}

export interface LiveStats {
  activeIncidents: number
  autoResolvedToday: number
  avgMttrMinutes: number
  totalKnowledgeEntries: number
  systemStatus: 'operational' | 'degraded' | 'outage'
}
