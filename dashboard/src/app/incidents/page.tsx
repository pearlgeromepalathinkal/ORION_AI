'use client'
import { AppShell } from '@/components/layout/AppShell'
import { useQuery } from '@tanstack/react-query'
import { fetchIncidents } from '@/lib/api'
import Link from 'next/link'

const PRIORITY_COLOR: Record<string, string> = {
  P1: 'var(--color-unknown)', P2: 'var(--color-mid)',
  P3: 'var(--color-processing)', P4: 'var(--text-muted)',
}

export default function IncidentsPage() {
  const { data: incidents = [], isLoading } = useQuery({ queryKey: ['incidents'], queryFn: fetchIncidents })

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h1 className="text-lg font-bold">Incidents</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            All incidents processed by ORION-AI — confidence-routed and tracked
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading incidents...</div>
          ) : incidents.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No incidents found.</div>
          ) : (
            <table className="w-full text-sm" aria-label="Incidents table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['ID', 'Title', 'Priority', 'Route', 'Similarity', 'Status', 'Source', 'Created'].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
                  <tr
                    key={inc.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="py-2 pr-4">
                      <Link
                        href={`/incidents/${inc.id}`}
                        className="font-mono text-xs font-bold hover:underline"
                        style={{ color: 'var(--color-processing)' }}
                      >
                        {inc.id}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 max-w-[220px] truncate">{inc.title}</td>
                    <td className="py-2 pr-4">
                      <span className="font-bold text-xs" style={{ color: PRIORITY_COLOR[inc.priority] }}>
                        {inc.priority}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {inc.route ? (
                        <span className={`route-badge ${inc.route}`}>{inc.route.toUpperCase()}</span>
                      ) : '—'}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {inc.similarity?.toFixed(2) ?? '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: inc.status === 'resolved' ? 'var(--color-known-bg)' : 'var(--color-processing-bg)',
                          color: inc.status === 'resolved' ? 'var(--color-known)' : 'var(--color-processing)',
                          border: `1px solid ${inc.status === 'resolved' ? 'var(--color-known-border)' : 'var(--color-processing-border)'}`,
                        }}
                      >
                        {inc.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>{inc.source}</td>
                    <td className="py-2 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {new Date(inc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
