'use client'
import { AppShell } from '@/components/layout/AppShell'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchDependencyHealth, fetchQdrantStats, ORION_API_URL } from '@/lib/orion-api'
import { useState } from 'react'
import { Database, Cpu, CheckCircle2, XCircle, RefreshCw, Layers, ShieldCheck } from 'lucide-react'

export default function SettingsPage() {
  const [ingestMsg, setIngestMsg] = useState<string | null>(null)

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['dependency-health'],
    queryFn: fetchDependencyHealth,
    refetchInterval: 10000,
  })

  const { data: qdrantStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['qdrant-stats'],
    queryFn: fetchQdrantStats,
    refetchInterval: 10000,
  })

  const ingestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${ORION_API_URL}/api/knowledge/ingest`, { method: 'POST' })
      if (!res.ok) throw new Error('Ingestion failed')
      return res.json()
    },
    onSuccess: (data) => {
      setIngestMsg(`Successfully indexed ${data.indexed_count} documents into Qdrant (${data.collection}).`)
      refetchStats()
    },
    onError: (err) => {
      setIngestMsg(`Ingestion error: ${String(err)}`)
    },
  })

  const qdrantConnected = health?.qdrant?.available ?? (qdrantStats?.status === 'green' || qdrantStats?.points_count !== undefined)
  const ollamaConnected = health?.ollama?.available ?? false
  const jiraConnected = health?.jira?.available ?? true

  const services = [
    {
      name: 'Qdrant Vector Database',
      icon: Database,
      host: qdrantStats?.host || 'http://localhost:6333',
      detail: qdrantStats?.points_count !== undefined
        ? `Collection: ${qdrantStats.collection} · ${qdrantStats.points_count} vectors (${qdrantStats.vector_size}-dim)`
        : 'Vector index for Confluence, SharePoint, and GitHub documentation',
      connected: qdrantConnected,
      statusLabel: qdrantConnected ? 'ONLINE (DOCKER)' : 'UNREACHABLE',
    },
    {
      name: 'ORION-AI LangGraph Engine',
      icon: Layers,
      host: ORION_API_URL,
      detail: 'Federated Multi-Agent orchestrator & Human-in-the-loop checkpoint runner',
      connected: health !== null,
      statusLabel: health !== null ? 'ONLINE (FASTAPI)' : 'OFFLINE',
    },
    {
      name: 'Ollama Local LLM',
      icon: Cpu,
      host: 'http://localhost:11434',
      detail: health?.ollama?.details || 'Local neural model: qwen2.5:3b (intent detection, triage, reasoning)',
      connected: ollamaConnected,
      statusLabel: ollamaConnected ? 'ONLINE (LOCAL)' : 'OFFLINE (FALLBACK)',
    },
    {
      name: 'Jira Cloud Integration',
      icon: ShieldCheck,
      host: 'https://santhosk738.atlassian.net',
      detail: 'Project: EPL · Bi-directional ticket synchronization & provenance logging',
      connected: jiraConnected,
      statusLabel: jiraConnected ? 'CONNECTED' : 'SANDBOX MODE',
    },
  ]

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <h1 className="text-lg font-bold">Settings & System Health</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Live telemetry from ORION-AI backend, Qdrant vector database, and backing services
            </p>
          </div>
          <button
            onClick={() => { refetchHealth(); refetchStats(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          >
            <RefreshCw size={12} className={healthLoading || statsLoading ? 'animate-spin' : ''} />
            Refresh Health
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4 max-w-2xl">
            {/* Live Service Cards */}
            <div className="flex flex-col gap-3">
              {services.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.name}
                    className="panel p-4 rounded-xl flex items-start justify-between gap-4 transition-all"
                    style={{
                      borderColor: item.connected ? 'rgba(52, 211, 153, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2.5 rounded-lg mt-0.5"
                        style={{
                          background: item.connected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: item.connected ? '#34d399' : '#f87171',
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{item.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({item.host})</span>
                        </div>
                        <div className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {item.detail}
                        </div>
                      </div>
                    </div>

                    <span
                      className="text-[10px] font-mono font-bold px-2 py-1 rounded flex items-center gap-1 flex-shrink-0"
                      style={{
                        background: item.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: `1px solid ${item.connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        color: item.connected ? '#34d399' : '#f87171',
                      }}
                    >
                      {item.connected ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {item.statusLabel}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Qdrant Vector DB Ingestion Action Box */}
            <div
              className="panel p-5 rounded-xl flex flex-col gap-3 mt-2"
              style={{
                background: 'rgba(251, 111, 146, 0.06)',
                border: '1px solid var(--border-strong)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 style={{ color: 'var(--color-unknown)' }} className="text-sm font-bold flex items-center gap-2">
                    <Database size={15} /> Qdrant Vector Collection Indexing
                  </h3>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
                    Trigger embedding re-calculation and upsert IT runbooks into <code style={{ color: 'var(--color-processing)' }} className="font-mono">orion_knowledge</code>.
                  </p>
                </div>
                <button
                  onClick={() => ingestMutation.mutate()}
                  disabled={ingestMutation.isPending}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-unknown), var(--color-processing))',
                    color: '#140c11',
                  }}
                >
                  {ingestMutation.isPending ? 'Ingesting vectors...' : 'Re-index Qdrant'}
                </button>
              </div>

              {ingestMsg && (
                <div
                  className="text-xs p-2.5 rounded-lg font-mono"
                  style={{
                    background: ingestMsg.includes('error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${ingestMsg.includes('error') ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                    color: ingestMsg.includes('error') ? '#f87171' : '#34d399',
                  }}
                >
                  {ingestMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
