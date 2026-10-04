import { AppShell } from '@/components/layout/AppShell'

const PLAYBOOKS = [
  { id: 'VPN-AUTH-01', name: 'VPN Authentication Recovery', version: '2.1', risk: 'low', steps: 5, successRate: 98.2, usageCount: 47, avgDuration: '2.1s', description: 'Clears auth cache, refreshes credentials, restarts VPN service, reconnects client, and runs health check.' },
  { id: 'DB-CONN-02', name: 'Database Connection Pool Recovery', version: '1.4', risk: 'medium', steps: 4, successRate: 94.1, usageCount: 23, avgDuration: '4.2s', description: 'Drains pool, increases max_size, restarts pool manager, and verifies connection health.' },
  { id: 'SSL-CERT-03', name: 'SSL Certificate Renewal', version: '1.0', risk: 'low', steps: 3, successRate: 100, usageCount: 8, avgDuration: '1.8s', description: 'Triggers certificate renewal via Let\'s Encrypt, updates nginx config, and reloads service.' },
  { id: 'DISK-CLEANUP-04', name: 'Emergency Disk Space Recovery', version: '1.2', risk: 'high', steps: 6, successRate: 89.7, usageCount: 12, avgDuration: '8.4s', description: 'Identifies large files, archives logs, purges temp files, and validates disk utilization.' },
]

const RISK_COLOR: Record<string, string> = {
  low: 'var(--color-known)', medium: 'var(--color-mid)', high: 'var(--color-unknown)', critical: 'var(--color-unknown)'
}

export default function AutomationPage() {
  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h1 className="text-lg font-bold">Automation Center</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {PLAYBOOKS.length} playbooks · Run deterministically when confidence threshold is met
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            {PLAYBOOKS.map(pb => (
              <div
                key={pb.id}
                className="panel p-4 rounded-lg flex flex-col gap-3"
                style={{
                  borderColor: pb.risk === 'high' ? 'var(--color-mid-border)' : 'var(--border-default)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-xs font-bold mb-0.5" style={{ color: 'var(--color-processing)' }}>{pb.id}</div>
                    <h2 className="text-sm font-bold">{pb.name}</h2>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>v{pb.version}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded"
                      style={{
                        background: `${RISK_COLOR[pb.risk]}18`,
                        border: `1px solid ${RISK_COLOR[pb.risk]}44`,
                        color: RISK_COLOR[pb.risk],
                      }}
                    >
                      {pb.risk.toUpperCase()} RISK
                    </span>
                    {pb.risk === 'high' && (
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--color-mid-bg)', border: '1px solid var(--color-mid-border)', color: 'var(--color-mid)' }}
                      >
                        APPROVAL REQUIRED
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{pb.description}</p>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Steps', value: pb.steps },
                    { label: 'Success', value: `${pb.successRate}%` },
                    { label: 'Used', value: `${pb.usageCount}×` },
                    { label: 'Avg Time', value: pb.avgDuration },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{m.label}</div>
                      <div className="text-sm font-bold font-mono">{m.value}</div>
                    </div>
                  ))}
                </div>

                {pb.risk === 'high' && (
                  <div
                    className="rounded-lg p-2.5"
                    style={{ background: 'var(--color-mid-bg)', border: '1px solid var(--color-mid-border)' }}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-mid)' }}>
                      ⚠ APPROVAL REQUIRED — Risk: HIGH · Rollback: Available
                    </div>
                    <button
                      className="text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-opacity hover:opacity-90"
                      style={{ background: 'var(--color-mid)', color: '#140c11' }}
                    >
                      [ APPROVE EXECUTION ]
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
