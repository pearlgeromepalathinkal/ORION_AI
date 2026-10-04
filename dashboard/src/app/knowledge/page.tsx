'use client'
import { AppShell } from '@/components/layout/AppShell'
import { useQuery } from '@tanstack/react-query'
import { fetchKnowledgeEntries, searchKnowledgeEntries, approveKnowledge, rejectKnowledge } from '@/lib/api'
import { useState } from 'react'
import { CheckCircle, ThumbsDown, Search, Database, Sparkles } from 'lucide-react'

export default function KnowledgePage() {
  const [filter, setFilter] = useState<string>('all')
  const [siloFilter, setSiloFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['knowledge', searchQuery, siloFilter],
    queryFn: () => searchQuery.trim()
      ? searchKnowledgeEntries(searchQuery, siloFilter !== 'all' ? siloFilter : undefined)
      : fetchKnowledgeEntries(),
  })

  const filtered = entries.filter(e => {
    const matchFilter = filter === 'all' || e.status === filter
    const matchSilo = siloFilter === 'all' || e.tags.some(t => t.toLowerCase() === siloFilter.toLowerCase())
    return matchFilter && matchSilo
  })

  const handleApprove = async (id: string) => {
    await approveKnowledge(id)
    refetch()
  }

  const handleReject = async (id: string) => {
    await rejectKnowledge(id)
    refetch()
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">Knowledge Base</h1>
              <span
                style={{
                  background: 'var(--color-known-bg)',
                  borderColor: 'var(--color-known-border)',
                  color: 'var(--color-known)',
                }}
                className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border"
              >
                <Database size={10} /> Qdrant Vector DB
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {entries.length} documents indexed in <code style={{ color: 'var(--color-processing)' }} className="font-mono">orion_knowledge</code> (384-dim MiniLM embeddings)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Silo selector */}
            <div className="flex gap-1">
              {['all', 'confluence', 'sharepoint', 'github'].map(silo => (
                <button
                  key={silo}
                  onClick={() => setSiloFilter(silo)}
                  className="px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wide transition-all cursor-pointer"
                  style={{
                    background: siloFilter === silo ? 'var(--color-processing-bg)' : 'var(--bg-elevated)',
                    border: `1px solid ${siloFilter === silo ? 'var(--color-processing-border)' : 'var(--border-default)'}`,
                    color: siloFilter === silo ? 'var(--color-processing)' : 'var(--text-muted)',
                  }}
                >
                  {silo}
                </button>
              ))}
            </div>

            {/* Semantic search input */}
            <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <Search size={11} style={{ color: 'var(--text-muted)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Semantic vector search..."
                className="bg-transparent text-xs outline-none w-52"
                style={{ color: 'var(--text-primary)' }}
                aria-label="Search knowledge base with vector similarity"
              />
              {searchQuery && (
                <span style={{ color: 'var(--color-unknown)' }} className="text-[9px] font-mono flex items-center gap-0.5">
                  <Sparkles size={9} /> Cosine
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading knowledge base...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No entries match your filter.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(entry => (
                <div
                  key={entry.id}
                  className="panel p-4 rounded-lg"
                  style={{
                    borderColor: entry.status === 'pending_review' ? 'var(--color-mid-border)' :
                                 entry.status === 'active' ? 'var(--color-known-border)' : 'var(--border-default)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: entry.status === 'active' ? 'var(--color-known-bg)' : 'var(--color-mid-bg)',
                            color: entry.status === 'active' ? 'var(--color-known)' : 'var(--color-mid)',
                            border: `1px solid ${entry.status === 'active' ? 'var(--color-known-border)' : 'var(--color-mid-border)'}`,
                          }}
                        >
                          {entry.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {entry.source.toUpperCase()} · Used {entry.usageCount}× · {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold">{entry.title}</h3>

                      <div className="mt-1.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-bold" style={{ color: 'var(--text-muted)' }}>Problem: </span>
                        {entry.problem}
                      </div>

                      <div className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-bold" style={{ color: 'var(--text-muted)' }}>Resolution: </span>
                        {entry.resolution}
                      </div>

                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {entry.status === 'pending_review' && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(entry.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: 'var(--color-known-bg)', border: '1px solid var(--color-known-border)', color: 'var(--color-known)' }}
                          aria-label={`Approve knowledge entry: ${entry.title}`}
                        >
                          <CheckCircle size={11} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(entry.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: 'var(--color-unknown-bg)', border: '1px solid var(--color-unknown-border)', color: 'var(--color-unknown)' }}
                          aria-label={`Reject knowledge entry: ${entry.title}`}
                        >
                          <ThumbsDown size={11} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
