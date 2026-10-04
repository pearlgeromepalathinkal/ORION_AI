'use client'
import { AppShell } from '@/components/layout/AppShell'
import { useQuery } from '@tanstack/react-query'
import { fetchLiveStats } from '@/lib/api'

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="panel p-4 rounded-lg">
      <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-2xl font-black font-mono" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  )
}

function RoutingBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs font-medium w-24" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="text-xs font-mono font-bold w-8 text-right" style={{ color }}>{pct}%</div>
    </div>
  )
}

export default function ReliabilityPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['live-stats'], queryFn: fetchLiveStats })

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h1 className="text-lg font-bold">Reliability Center</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Real metrics from ORION-AI backend — no invented data
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading metrics...</div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Top KPIs */}
              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  label="Active Incidents"
                  value={stats?.activeIncidents ?? '—'}
                  color="var(--color-processing)"
                />
                <MetricCard
                  label="Auto Resolved Today"
                  value={stats?.autoResolvedToday ?? '—'}
                  color="var(--color-known)"
                  sub="Fully autonomous — no human required"
                />
                <MetricCard
                  label="Avg MTTR"
                  value={stats?.avgMttrMinutes ? `${stats.avgMttrMinutes}m` : '—'}
                  color="var(--color-known)"
                />
                <MetricCard
                  label="Knowledge Entries"
                  value={stats?.totalKnowledgeEntries ?? '—'}
                  color="var(--color-human)"
                  sub="Active in pgvector"
                />
              </div>

              {/* Routing Distribution */}
              {stats?.routingDistribution && (
                <div className="panel p-4 rounded-lg">
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                    Routing Distribution
                  </div>
                  <div className="flex flex-col gap-3">
                    <RoutingBar label="Known (Auto)" pct={stats.routingDistribution.known} color="var(--color-known)" />
                    <RoutingBar label="Mid (Developer)" pct={stats.routingDistribution.mid} color="var(--color-mid)" />
                    <RoutingBar label="Unknown (AI+SRE)" pct={stats.routingDistribution.unknown} color="var(--color-unknown)" />
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div
                className="rounded-lg p-4"
                style={{ background: 'var(--color-processing-bg)', border: '1px solid var(--color-processing-border)' }}
              >
                <div className="text-xs font-bold mb-2" style={{ color: 'var(--color-processing)' }}>
                  How ORION-AI Routing Works
                </div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  ORION-AI uses <strong style={{ color: 'var(--text-primary)' }}>pgvector cosine similarity</strong> to classify
                  every incident against the knowledge base. Incidents with similarity ≥ 0.85 are resolved
                  automatically via playbook. Similarity 0.55–0.84 routes to developer assist. Below 0.55
                  triggers AI diagnostics and Tier-3 SRE review. All decisions are deterministic and auditable.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
