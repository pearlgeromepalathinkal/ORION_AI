'use client'

import { AppShell } from '@/components/layout/AppShell'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden">
        <AnalyticsDashboard />
      </div>
    </AppShell>
  )
}
