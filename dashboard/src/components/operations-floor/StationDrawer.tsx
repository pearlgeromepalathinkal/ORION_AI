'use client'
import { useOperationsStore } from '@/store/operations-store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { StationId } from '@/types'
import { Cpu, Brain, Search, GitBranch, Zap, Bot, ShieldCheck, CheckCircle, BookOpen, Activity } from 'lucide-react'

const STATION_DETAIL: Record<StationId, {
  icon: React.ElementType
  label: string
  detail: string
  techDetail: string
}> = {
  intake:           { icon: Cpu,         label: 'ORION INTAKE',           detail: 'Unified multi-channel ticket ingestion pipeline (Jira Service Desk, Slack, Email, Monitoring alerts). Normalizes payloads, validates schema, and queues tasks.', techDetail: 'Webhook / REST ingestion → Schema validation → In-memory priority queue' },
  semantic:         { icon: Brain,       label: 'INTENT ENGINE',          detail: 'Semantic classification and intent extraction using dense vector embeddings and LLM reasoning. Identifies technical domain, urgency, and core entity.', techDetail: 'OpenAI text-embedding-3-large / Ollama → Dense vector generation → Intent extraction' },
  knowledge_search: { icon: Search,      label: 'FEDERATED KB',           detail: 'Federated retrieval across disparate enterprise documentation silos (Confluence, SharePoint, internal wikis, Runbooks) via hybrid search.', techDetail: 'Qdrant / pgvector hybrid search → BM25 + dense reranking → Top-k context snippets' },
  routing:          { icon: GitBranch,   label: 'RISK & ROUTING',         detail: 'Deterministic four-way routing matrix: Resolve (autonomous playbook), Clarify (gather user info), Escalate (HITL incident manager / engineer), or Reject (invalid).', techDetail: 'Confidence thresholding (≥0.85 Auto | 0.65–0.84 Domain Pool | <0.65 Human Escalation)' },
  playbook:         { icon: Zap,         label: 'PLAYBOOK ENGINE',        detail: 'Executes automated remediation scripts and idempotent operational playbooks with rollback guarantees and state checkpoints.', techDetail: 'Playbook execution engine → Stepwise idempotency checks → Reversible state diffs' },
  ai_diagnostics:   { icon: Bot,         label: 'AI DIAGNOSTICS',         detail: 'Generates root cause hypotheses for complex or novel incidents through deep diagnostic reasoning over telemetry, logs, and stack traces.', techDetail: 'Telemetry correlation → Diagnostic tree generation → Root-cause hypothesis' },
  devops_infra:     { icon: Activity,    label: 'SRE MONITOR',            detail: 'Continuous production infrastructure and telemetry monitoring. Evaluates error budgets, service metrics, and system-wide anomaly detection.', techDetail: 'Prometheus / Datadog telemetry polling → Anomaly detection → Real-time health signals' },
  qa_testing:       { icon: ShieldCheck, label: 'QA VERIFICATION LAB',    detail: 'Synthetic integration testing and staging verification prior to production rollout. Validates fix efficacy against regression suites.', techDetail: 'Automated test harness → Synthetic transaction execution → Regression gate' },
  verification:     { icon: ShieldCheck, label: 'VERIFICATION ENGINE',    detail: 'Runs rigorous 5-point production health verification: service health, user impact, error rate, connectivity, and SLA compliance.', techDetail: '5/5 health validation: Service status, User impact, Error budget, Connectivity, SLA' },
  resolution:       { icon: CheckCircle, label: 'RESOLUTION ENGINE',      detail: 'Finalizes ticket lifecycle, updates Jira status to Resolved/Done, notifies stakeholders, and archives the incident ledger.', techDetail: 'Jira API transition → Stakeholder notifications → Audit log closure' },
  knowledge_lab:    { icon: BookOpen,    label: 'PROVENANCE / AUDIT',     detail: 'Extracts validated post-incident learnings into structured KB records, logs cryptographic provenance, and queues for curator review.', techDetail: 'Post-incident analysis → Structured KB generation → Cryptographic audit ledger' },
}

export function StationDrawer() {
  const { openStationDrawer, setOpenStationDrawer, stations } = useOperationsStore()

  const isOpen = openStationDrawer !== null
  const detail = openStationDrawer ? STATION_DETAIL[openStationDrawer] : null
  const station = openStationDrawer ? stations.find(s => s.id === openStationDrawer) : null
  const Icon = detail?.icon

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) setOpenStationDrawer(null) }}>
      <SheetContent
        side="right"
        className="overflow-y-auto"
        style={{
          width: 380,
          background: 'var(--bg-surface)',
          border: 'none',
          borderLeft: '1px solid var(--border-default)',
        }}
        aria-label={detail ? `${detail.label} detail` : 'System station detail'}
      >
        {detail && station && Icon && (
          <>
            <SheetHeader className="pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ width: 40, height: 40, background: 'var(--color-processing-bg)', border: '1px solid var(--color-processing-border)' }}
                >
                  <Icon size={18} color="var(--color-processing)" />
                </div>
                <div>
                  <div className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-processing)' }}>
                    SYSTEM AUTOMATION
                  </div>
                  <SheetTitle className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {detail.label}
                  </SheetTitle>
                </div>
              </div>
            </SheetHeader>

            <div className="pt-4 flex flex-col gap-4">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  CURRENT STATE
                </div>
                <span className={`station-state-badge ${station.state}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                  {station.state.toUpperCase()}
                </span>
                {station.currentIncidentId && (
                  <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Processing: {station.currentIncidentId}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  DESCRIPTION
                </div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {detail.detail}
                </div>
              </div>

              <div
                className="rounded-lg p-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
              >
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  TECHNICAL IMPLEMENTATION
                </div>
                <div className="text-[11px] font-mono" style={{ color: 'var(--color-processing)' }}>
                  {detail.techDetail}
                </div>
              </div>

              {station.lastOperation && (
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    LAST OPERATION
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {station.lastOperation}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
