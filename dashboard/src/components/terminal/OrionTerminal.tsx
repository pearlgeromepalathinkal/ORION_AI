'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Terminal, X, Minus, Square, ExternalLink,
  CheckCircle2, AlertTriangle, ShieldAlert, GitCommit, FileText, ArrowRight,
  Sparkles, PlusCircle, Send, Play, Layers, HelpCircle, Activity,
  Database, RefreshCw
} from 'lucide-react'
import { useIncidentSimulationEngine } from '@/store/incident-simulation-engine'
import { runOrionWorkflowSync, searchQdrantKnowledge, type QdrantDocument } from '@/lib/orion-api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onViewOnFloor?: (ticket: {
    id: string
    title: string
    route?: 'known' | 'mid' | 'unknown'
    similarity?: number
    assignedHuman?: string
    status?: string
  }) => void
}

interface CommandHistoryItem {
  id: string
  command?: string
  output: string | React.ReactNode
  type?: 'input' | 'output' | 'error' | 'success'
}

interface DiagnosticTimelineEntry {
  timestamp: string
  source: string
  message: string
}

interface JiraTicketData {
  id: string
  key: string
  summary: string
  description?: string
  status: string
  priority: string
  route?: 'KNOWN' | 'MID' | 'UNKNOWN'
  similarity?: number
  assignee: string
  reporter: string
  created: string
  updated: string
  resolution?: string | null
  labels: string[]
  issueType: string
  hasDiagnostics: boolean
  diagnosticSteps?: string[] | null
  diagnosticTimeline?: DiagnosticTimelineEntry[]
  rootCause?: string | null
  resolutionDetails?: string | null
  verification?: string | null
  knowledge?: string | null
  comments?: Array<{
    id: string
    author: string
    created: string
    body: string
  }>
  raw?: Record<string, unknown>
}

interface JiraApiResponse {
  found: boolean
  errorType?: 'NOT_FOUND' | 'CONNECTION_ERROR' | 'INVALID_INPUT'
  ticketId?: string
  message?: string
  source?: 'Jira API' | 'ORION-AI Incident Store (JIRA Mirror)'
  ticket?: JiraTicketData
}

export interface IssueTemplateItem {
  key: string
  label: string
  summary: string | null
  description: string | null
  priority?: 'P1' | 'P2' | 'P3' | 'P4'
  category?: 'Database' | 'Backend' | 'Cache' | 'Streaming' | 'Infrastructure' | 'Security'
  route?: 'known' | 'mid' | 'unknown'
}

// Pre-configured IT issue templates mirroring the ORION-AI Employee Assistant (chatbot/terminal.py)
export const ISSUE_TEMPLATES: Record<string, IssueTemplateItem> = {
  '1': {
    key: '1',
    label: 'VPN — Cannot connect after password reset',
    summary: 'Unable to connect to VPN after Active Directory password reset',
    description: 'GlobalProtect keeps requesting credentials after my AD password change. Cannot connect to corporate VPN.\n\nOS: macOS 14.5\nVPN Client: GlobalProtect 6.1\nError: Authentication failed — invalid credentials',
    priority: 'P2',
    category: 'Backend',
    route: 'known',
  },
  '2': {
    key: '2',
    label: 'Database — MySQL connection timeout during peak hours',
    summary: 'MySQL database connection timeout during peak business hours',
    description: 'HR Portal fails to connect to MySQL during peak hours (10 AM-12 PM).\n\nError: Communications link failure.\nDatabase: MySQL 8.0 on Ubuntu 22.04\nPool: HikariCP max-pool-size=10\nImpact: 20-30 users affected.',
    priority: 'P2',
    category: 'Database',
    route: 'mid',
  },
  '3': {
    key: '3',
    label: 'Server — Production disk usage at 95% (critical)',
    summary: 'Production Linux server disk usage at 95% — critical storage alert',
    description: 'Production server /dev/sda1 is at 95% disk capacity.\n\nSize: 500G | Used: 475G | Avail: 25G\nLog files growing rapidly.',
    priority: 'P1',
    category: 'Infrastructure',
    route: 'unknown',
  },
  '4': {
    key: '4',
    label: 'Cloud — AWS EC2 failing load balancer health checks',
    summary: 'AWS EC2 instance failing ALB health checks after deployment',
    description: 'After deploying new application version, EC2 instance started failing ALB health checks.\n\nHealth check path: /api/health\nStatus: 503 Service Unavailable\nInstance: t3.medium, Region: ap-south-1',
    priority: 'P2',
    category: 'Infrastructure',
    route: 'mid',
  },
  '5': {
    key: '5',
    label: 'Software — Microsoft Teams crashes on startup',
    summary: 'Microsoft Teams crashes immediately on startup — Windows 11',
    description: 'Teams crashes within 5 seconds of opening.\n\nOS: Windows 11 Pro 23H2\nTeams Version: 1.6.00.33959\nStarted after Windows Update KB5034123.',
    priority: 'P3',
    category: 'Backend',
    route: 'known',
  },
  '6': {
    key: '6',
    label: 'Hardware — Laptop keyboard intermittently stops working',
    summary: 'Laptop keyboard keys intermittently stop responding during work',
    description: 'Dell XPS 15 keyboard randomly stops responding mid-typing for 30-60 seconds.\n\nDevice: Dell XPS 15 9530\nOS: Windows 11\nDriver up to date. Issue persists after restart.',
    priority: 'P3',
    category: 'Infrastructure',
    route: 'known',
  },
  '7': {
    key: '7',
    label: 'Security — Suspicious login activity on corporate account',
    summary: 'Suspicious login attempts detected from unknown IP on corporate account',
    description: 'Received unsolicited MFA push from IP 185.234.219.44 (Eastern Europe).\n\nAccount: employee@company.com\nTime: 02:34 AM IST\nPush was denied but concerned about compromise.',
    priority: 'P1',
    category: 'Security',
    route: 'unknown',
  },
  '8': {
    key: '8',
    label: 'Network — Office Wi-Fi extremely slow (<1 Mbps)',
    summary: 'Office Wi-Fi performance degraded — download speed below 1 Mbps',
    description: 'Building B, Floor 3 Wi-Fi extremely slow since morning.\n\nSpeed: Download 0.8 Mbps (expected 100+), Upload 0.3 Mbps\nAffected: ~40 employees. Wired connections are fine.',
    priority: 'P3',
    category: 'Backend',
    route: 'known',
  },
  '9': {
    key: '9',
    label: 'Custom — Describe your own IT issue (Brand New Incident)',
    summary: null,
    description: null,
  },
}

interface InteractiveStep {
  step: 'idle' | 'template_select' | 'custom_title' | 'custom_desc' | 'custom_priority'
  title?: string
  description?: string
  priority?: 'P1' | 'P2' | 'P3' | 'P4'
}

export function OrionTerminal({ isOpen, onClose, onViewOnFloor }: Props) {
  const sim = useIncidentSimulationEngine()
  const [inputVal, setInputVal] = useState('')
  const [interactiveStep, setInteractiveStep] = useState<InteractiveStep>({ step: 'idle' })
  const customTicketsRef = useRef<Record<string, JiraTicketData>>({})
  const lastCreatedTicketIdRef = useRef<string | null>(null)

  const [history, setHistory] = useState<CommandHistoryItem[]>([
    {
      id: 'init-1',
      output: (
        <div className="space-y-0.5" style={{ color: 'var(--text-muted)' }}>
          <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--color-unknown)' }}>
            <Sparkles size={12} />
            <span>ORION-AI Interactive Operations Console v2.1.0</span>
          </div>
          <div>Connected to internal operations floor simulation &amp; event bridge.</div>
          <div>Live JIRA &amp; Workflow Ingestion active &bull; Direct Jira Ticket Link Navigator enabled.</div>
          <div style={{ color: 'var(--color-processing)' }}>
            Type <span className="text-cyan-300 font-bold">&apos;custom&apos;</span> to submit an issue, <span className="text-blue-300 font-bold">&apos;open &lt;ticket&gt;&apos;</span> or <span className="text-blue-300 font-bold">&apos;jira link&apos;</span> for Jira, or <span className="text-amber-300 font-bold">&apos;help&apos;</span>.
          </div>
        </div>
      ),
    },
  ])
  const [cmdHistory, setCmdHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState<number>(-1)
  const [isMaximized, setIsMaximized] = useState(false)
  const [focusedTicketId, setFocusedTicketId] = useState<string | null>(null)

  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, interactiveStep])

  if (!isOpen) return null

  const handleViewOnFloor = (ticket: JiraTicketData) => {
    const route = (ticket.route?.toLowerCase() as 'known' | 'mid' | 'unknown') || 'known'
    sim.loadTicketForInspection({
      id: ticket.key,
      title: ticket.summary,
      route,
      similarity: ticket.similarity,
      assignedHuman: ticket.assignee,
      status: ticket.status,
      priority: ticket.priority,
    })

    setFocusedTicketId(ticket.key)
    onViewOnFloor?.({
      id: ticket.key,
      title: ticket.summary,
      route,
      similarity: ticket.similarity,
      assignedHuman: ticket.assignee,
      status: ticket.status,
    })

    setTimeout(() => {
      setFocusedTicketId(null)
    }, 3500)
  }

  // ── Render structured JIRA Ticket Response ───────────────────────────────
  const renderJiraResponse = (
    data: JiraApiResponse,
    requestedTicketId: string,
    mode: 'full' | 'summary' | 'diagnostics' | 'raw' = 'full'
  ) => {
    if (!data.found) {
      if (data.errorType === 'NOT_FOUND') {
        return (
          <div className="space-y-1.5 font-mono text-xs my-1 bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg">
            <div className="text-rose-400 font-bold tracking-wider uppercase">JIRA TICKET NOT FOUND</div>
            <div className="text-slate-300">Ticket &apos;{requestedTicketId}&apos; does not exist in Jira or incident records.</div>
            <div className="text-slate-400 text-[10px]">
              Available demo tickets: <span className="text-purple-300 font-bold">INC-1042</span>, <span className="text-purple-300 font-bold">EPL-1067</span>, <span className="text-purple-300 font-bold">EPL-1088</span>, <span className="text-purple-300 font-bold">INC-1099</span>, or submit a new custom ticket with <span className="text-cyan-300 font-bold">custom</span>.
            </div>
          </div>
        )
      }

      return (
        <div className="space-y-1 font-mono text-xs my-1 bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg">
          <div className="text-amber-400 font-bold uppercase">{data.errorType || 'RETRIEVAL NOTICE'}</div>
          <div className="text-slate-300">{data.message || 'Unable to retrieve ticket diagnostic payload.'}</div>
        </div>
      )
    }

    const ticket = data.ticket!
    const isLive = data.source === 'Jira API'

    if (mode === 'raw') {
      return (
        <div className="my-1 bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-64">
          <div className="text-slate-500 mb-1 flex items-center justify-between">
            <span>Payload source: {data.source}</span>
            <span className="text-sky-400">{ticket.key}</span>
          </div>
          <pre>{JSON.stringify(ticket.raw || ticket, null, 2)}</pre>
        </div>
      )
    }

    if (mode === 'summary') {
      return (
        <div className="my-1 bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 space-y-1 text-slate-300 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sky-400">{ticket.key}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded border font-bold uppercase ${
              ticket.status.toLowerCase().includes('resolved') || ticket.status.toLowerCase().includes('done')
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                : 'bg-amber-950/60 text-amber-400 border-amber-800'
            }`}>
              {ticket.status}
            </span>
          </div>
          <div className="text-white font-semibold">{ticket.summary}</div>
          <div className="text-slate-400 text-[10px]">
            Assignee: <span className="text-slate-200">{ticket.assignee}</span> &bull; Priority: <span className="text-slate-200">{ticket.priority}</span> &bull; Route: <span className="text-amber-300">{ticket.route || 'KNOWN'}</span>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-2 font-mono text-xs my-1 bg-slate-950/90 border border-slate-800/80 p-3 rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sky-400 text-sm">{ticket.key}</span>
            <span className="text-[10px] text-slate-400 font-normal">({data.source})</span>
            {isLive && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
                LIVE JIRA SYNC
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
              ticket.route === 'UNKNOWN'
                ? 'bg-rose-950/50 text-rose-300 border-rose-800/60'
                : ticket.route === 'MID'
                ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
            }`}>
              {ticket.route || 'KNOWN'} {ticket.similarity !== undefined ? `(${(ticket.similarity).toFixed(2)})` : ''}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
              ticket.status.toLowerCase().includes('resolved') || ticket.status.toLowerCase().includes('done')
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/60'
                : 'bg-sky-950/50 text-sky-300 border-sky-800/60'
            }`}>
              {ticket.status}
            </span>
          </div>
        </div>

        {/* Title & Desc */}
        <div>
          <div className="text-white font-bold text-[13px]">{ticket.summary}</div>
          {ticket.description && (
            <div className="text-slate-400 text-[11px] mt-0.5 line-clamp-2">{ticket.description}</div>
          )}
        </div>

        {/* Core Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
          <div>
            <span className="text-slate-500 uppercase block text-[9px] font-bold">Assignee</span>
            <span className="text-slate-200 font-medium">{ticket.assignee}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase block text-[9px] font-bold">Priority</span>
            <span className="text-amber-400 font-bold">{ticket.priority}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase block text-[9px] font-bold">Reporter</span>
            <span className="text-slate-300">{ticket.reporter}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase block text-[9px] font-bold">Updated</span>
            <span className="text-slate-400">{ticket.updated}</span>
          </div>
        </div>

        {/* Diagnostic Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 mt-1">
          <div className="flex items-center gap-2">
            {ticket.hasDiagnostics && (
              <button
                onClick={() => handleViewOnFloor(ticket)}
                className={`text-[10px] px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 cursor-pointer font-bold ${
                  focusedTicketId === ticket.key
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md animate-pulse'
                    : 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-800/60'
                }`}
              >
                <span>🔭 View on Operations Floor</span>
                <ArrowRight size={10} />
              </button>
            )}
            <a
              href={`https://emailnssvitc.atlassian.net/browse/${ticket.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 transition-all flex items-center gap-1.5"
            >
              <span>🌐 Open in Jira</span>
              <ExternalLink size={10} />
            </a>
          </div>
          <span className="text-slate-500 text-[9px]">Run `open {ticket.key}` to view in Jira</span>
        </div>

        {/* Detailed Diagnostics */}
        {mode === 'diagnostics' && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60 text-[11px]">
            {ticket.diagnosticSteps && ticket.diagnosticSteps.length > 0 && (
              <div className="space-y-1">
                <div className="text-sky-400 font-bold uppercase text-[9px] tracking-wider">DIAGNOSTIC PIPELINE TRACE</div>
                <div className="space-y-0.5 pl-2 border-l-2 border-sky-500/30">
                  {ticket.diagnosticSteps.map((step, idx) => (
                    <div key={idx} className="text-slate-300 flex items-start gap-1.5">
                      <span className="text-sky-400 font-bold">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ticket.rootCause && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 space-y-0.5">
                <div className="text-amber-400 font-bold uppercase text-[9px] tracking-wider">ROOT CAUSE</div>
                <div className="text-slate-300 leading-snug">{ticket.rootCause}</div>
              </div>
            )}
            {ticket.resolutionDetails && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 space-y-0.5">
                <div className="text-emerald-400 font-bold uppercase text-[9px] tracking-wider">RESOLUTION</div>
                <div className="text-slate-300 leading-snug">{ticket.resolutionDetails}</div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render Template Menu (1 to 9) ────────────────────────────────────────
  const renderTemplatesMenu = () => {
    setInteractiveStep({ step: 'template_select' })
    setHistory((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        output: (
          <div className="space-y-2 text-slate-300 font-mono text-[11px] my-1 bg-slate-950/60 border border-slate-800/90 p-3 rounded-xl shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>SUBMIT IT SUPPORT ISSUE — SELECT TEMPLATE [1–9]</span>
              </div>
              <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40">
                Options 1–9
              </span>
            </div>

            <div className="space-y-1">
              {Object.entries(ISSUE_TEMPLATES).map(([key, tmpl]) => {
                const isCustom = key === '9'
                return (
                  <div
                    key={key}
                    className={`flex items-start gap-2.5 p-1.5 rounded transition-all cursor-pointer ${
                      isCustom
                        ? 'bg-purple-950/30 border border-purple-800/50 hover:bg-purple-950/60'
                        : 'hover:bg-slate-900/60'
                    }`}
                    onClick={() => {
                      if (isCustom) {
                        setInteractiveStep({ step: 'custom_title' })
                        setHistory((h) => [
                          ...h,
                          {
                            id: crypto.randomUUID(),
                            output: (
                              <div className="text-purple-300 font-bold text-[11px] my-1">
                                [Option 9: Custom Issue] Enter issue title:
                              </div>
                            ),
                          },
                        ])
                      } else {
                        submitTemplate(key)
                      }
                    }}
                  >
                    <span className={`font-bold min-w-[20px] ${isCustom ? 'text-pink-400' : 'text-sky-300'}`}>
                      {key}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold flex items-center gap-2 ${isCustom ? 'text-purple-200' : 'text-slate-200'}`}>
                        <span>{tmpl.label}</span>
                        {isCustom && (
                          <span className="text-[8.5px] uppercase font-bold px-1.5 py-0.2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-500/50 rounded text-pink-300">
                            NEW INCIDENT
                          </span>
                        )}
                      </div>
                      {tmpl.summary && (
                        <div className="text-slate-400 text-[10px] truncate">
                          {tmpl.summary}
                        </div>
                      )}
                      {isCustom && (
                        <div className="text-slate-400 text-[10px]">
                          Interactive prompt to enter your own custom title, description, and priority.
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span>Select option <span className="text-pink-400 font-bold">9</span> for custom issue, or type <span className="text-slate-300 font-bold">1–8</span>.</span>
              <span>Type <span className="text-amber-400">cancel</span> to exit</span>
            </div>
          </div>
        ),
      },
    ])
  }

  // ── Render Custom Ticket Confirmation Card ────────────────────────────────
  const renderCustomTicketConfirmation = (ticketData: JiraTicketData, topMatch?: QdrantDocument | null, jiraUrl?: string | null) => {
    return (
      <div className="space-y-2 font-mono text-[11px] my-1.5 bg-gradient-to-b from-slate-950 to-slate-900 border border-emerald-500/40 p-3 rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🎫</span>
            <div>
              <div className="text-emerald-400 font-bold tracking-wide flex items-center gap-1.5">
                <span>NEW INCIDENT INGESTED</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-bold">
                  [{ticketData.key}]
                </span>
              </div>
              <div className="text-slate-400 text-[9px]">
                Dispatched to ORION-AI Autonomous Operations Floor &amp; Jira Engine
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
              ticketData.route === 'UNKNOWN'
                ? 'bg-rose-950/50 text-rose-300 border-rose-800/60'
                : ticketData.route === 'MID'
                ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
            }`}>
              ROUTE: {ticketData.route} ({ticketData.similarity?.toFixed(2)})
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
              {ticketData.priority}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <div>
            <span className="text-slate-400 text-[10px]">Title: </span>
            <span className="text-white font-bold">{ticketData.summary}</span>
          </div>
          {ticketData.description && (
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 text-slate-300 text-[10px] leading-snug max-h-24 overflow-y-auto whitespace-pre-wrap">
              {ticketData.description}
            </div>
          )}
        </div>

        {/* Top Qdrant Vector Match */}
        {topMatch && (
          <div className="bg-purple-950/30 border border-purple-800/50 p-2.5 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-300 font-bold text-[10px]">
                <Database size={12} className="text-purple-400" />
                <span>Qdrant Vector Runbook Match</span>
              </span>
              <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700 font-mono">
                cos θ: {topMatch.score !== undefined ? topMatch.score.toFixed(2) : '0.85'} &bull; {topMatch.domain || 'Knowledge Base'}
              </span>
            </div>
            <div className="text-white font-semibold text-[10.5px]">{topMatch.title}</div>
            <div className="text-slate-400 text-[9px] line-clamp-2 italic bg-black/40 p-1.5 rounded border border-slate-800/60">
              &quot;{topMatch.content.slice(0, 180)}...&quot;
            </div>
          </div>
        )}

        {/* Routing details */}
        <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
          <div>
            <span className="text-slate-500 uppercase text-[9px] block">Assigned Systems Engineer</span>
            <span className="text-sky-300 font-bold">{ticketData.assignee}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-[9px] block">Ingestion Source</span>
            <span className="text-purple-300 font-bold">Terminal Ingestion (Option #9 Custom)</span>
          </div>
        </div>

        {/* Jira Link Banner */}
        {jiraUrl && (
          <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-700/50 p-2 rounded-lg">
            <span className="text-blue-300 text-[10px]">🔗</span>
            <span className="text-slate-400 text-[9.5px] uppercase tracking-wide font-bold">Live Jira Ticket:</span>
            <a
              href={jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-100 text-[10px] font-mono font-bold underline underline-offset-2 flex items-center gap-1 transition-colors"
            >
              {ticketData.key}
              <ExternalLink size={9} />
            </a>
            <span className="text-slate-600 text-[9px] truncate ml-auto hidden sm:block">{jiraUrl}</span>
          </div>
        )}

        {/* Pipeline trace */}
        <div className="text-[9.5px] text-slate-400 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Multi-Agent Pipeline: Intake &rarr; Intent Classification &rarr; Federated Silos &rarr; Decision Engine</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
          <button
            onClick={() => handleViewOnFloor(ticketData)}
            className="text-[10px] font-bold px-2.5 py-1 rounded bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔭 View on Operations Floor</span>
            <ArrowRight size={10} />
          </button>
          <button
            onClick={() => handleCommand(`jira ${ticketData.key}`)}
            className="text-[10px] font-bold px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>📋 Inspect Diagnostics</span>
            <ExternalLink size={10} />
          </button>
          {jiraUrl && (
            <a
              href={jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 transition-all flex items-center gap-1.5"
            >
              <span>🌐 Open in Jira</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    )
  }

  // ── Render Qdrant Vector Search Results ───────────────────────────────────
  const renderQdrantSearchResults = (query: string, docs: QdrantDocument[]) => {
    if (!docs || docs.length === 0) {
      return (
        <div className="space-y-1.5 font-mono text-[11px] my-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Database size={12} />
            <span>Qdrant Search: No matching documents found for &quot;{query}&quot;</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Try searching for broader keywords like &quot;vpn&quot;, &quot;database&quot;, &quot;disk&quot;, &quot;kafka&quot;, or &quot;ssh&quot;.
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-2 font-mono text-[11px] my-1 bg-slate-950/90 p-3 rounded-xl border border-purple-800/50">
        <div className="flex items-center justify-between border-b border-purple-900/50 pb-2">
          <div className="flex items-center gap-2">
            <Database size={13} className="text-purple-400" />
            <div>
              <div className="text-purple-300 font-bold tracking-wide">
                QDRANT VECTOR DATABASE SEARCH
              </div>
              <div className="text-slate-400 text-[9.5px]">
                Found {docs.length} relevant issues &amp; runbooks matching &quot;{query}&quot;
              </div>
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 font-mono">
            HNSW &bull; all-MiniLM-L6-v2
          </span>
        </div>

        <div className="space-y-2 pt-1">
          {docs.map((doc, idx) => {
            const score = doc.score !== undefined ? doc.score : 0.85 - idx * 0.1
            const scoreColor =
              score >= 0.65
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                : score >= 0.45
                ? 'text-amber-400 bg-amber-950/60 border-amber-800'
                : 'text-slate-400 bg-slate-900 border-slate-800'

            return (
              <div
                key={doc.id || doc.filename || idx}
                className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5 hover:border-purple-600/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold text-[10px]">#{idx + 1}</span>
                    <span className="text-white font-bold text-[11px]">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8.5px] px-1.5 py-0.5 rounded border font-mono font-bold ${scoreColor}`}>
                      cos θ: {score.toFixed(2)}
                    </span>
                    {doc.domain && (
                      <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                        {doc.domain}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-slate-300 text-[10px] leading-relaxed line-clamp-3 bg-black/40 p-1.5 rounded border border-slate-800/40 whitespace-pre-wrap">
                  {doc.content.slice(0, 260)}{doc.content.length > 260 ? '...' : ''}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span>Source: <strong className="text-slate-400 font-mono">{(doc.source || 'confluence').toUpperCase()}</strong></span>
                    {doc.filename && <span>&bull; File: <span className="text-slate-400 font-mono">{doc.filename}</span></span>}
                  </div>
                  <button
                    onClick={() => {
                      submitCustomIssue(
                        doc.title,
                        `Triggered based on Qdrant Runbook match [${doc.title}]:\n\n${doc.content.slice(0, 300)}`,
                        'P2'
                      )
                    }}
                    className="text-[9px] text-purple-300 hover:text-purple-100 flex items-center gap-1 bg-purple-900/30 hover:bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700/50 cursor-pointer transition-colors"
                  >
                    <span>⚡ Test as Option #9 Issue</span>
                    <ArrowRight size={9} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Dispatch Custom Issue (Option 9) ─────────────────────────────────────
  const submitCustomIssue = async (
    title: string,
    description: string,
    priority: 'P1' | 'P2' | 'P3' | 'P4' = 'P2'
  ) => {
    const loadingId = crypto.randomUUID()

    // Heuristic domain & route analysis based on text
    const text = `${title} ${description}`.toLowerCase()

    let category: 'Database' | 'Backend' | 'Cache' | 'Streaming' | 'Infrastructure' | 'Security' = 'Backend'
    if (text.includes('database') || text.includes('db') || text.includes('sql') || text.includes('postgres') || text.includes('mysql') || text.includes('pool') || text.includes('query') || text.includes('deadlock')) {
      category = 'Database'
    } else if (text.includes('security') || text.includes('auth') || text.includes('mfa') || text.includes('token') || text.includes('cert') || text.includes('login') || text.includes('password') || text.includes('breach')) {
      category = 'Security'
    } else if (text.includes('cloud') || text.includes('aws') || text.includes('ec2') || text.includes('server') || text.includes('disk') || text.includes('cpu') || text.includes('memory') || text.includes('host') || text.includes('k8s') || text.includes('kubernetes')) {
      category = 'Infrastructure'
    } else if (text.includes('cache') || text.includes('redis') || text.includes('memcached')) {
      category = 'Cache'
    } else if (text.includes('kafka') || text.includes('stream') || text.includes('queue') || text.includes('rabbit')) {
      category = 'Streaming'
    }

    let route: 'known' | 'mid' | 'unknown' = 'known'
    let similarity = 0.92
    if (priority === 'P1' || text.includes('deadlock') || text.includes('breach') || text.includes('outage') || text.includes('critical') || text.includes('novel') || text.includes('crash')) {
      route = 'unknown'
      similarity = 0.42
    } else if (priority === 'P2' || text.includes('timeout') || text.includes('pool') || text.includes('slow') || text.includes('degraded') || text.includes('leak') || text.includes('spike')) {
      route = 'mid'
      similarity = 0.74
    }

    // Assign Systems Engineer
    let assignedHuman = 'Alex Rivera'
    if (category === 'Database') assignedHuman = 'Jordan Hayes'
    else if (category === 'Infrastructure') assignedHuman = 'Taylor Morgan'
    else if (category === 'Security') assignedHuman = 'Riley Brooks'
    else if (route === 'unknown') assignedHuman = 'Marcus Lee & Jordan Hayes'

    // Loading entry in terminal history
    setHistory((prev) => [
      ...prev,
      {
        id: loadingId,
        output: (
          <div className="space-y-1 font-mono text-xs my-1 text-slate-400 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 animate-pulse">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>[OPTION 9: CUSTOM INCIDENT] Ingesting into ORION-AI Agent Pipeline...</span>
            </div>
            <div className="text-[11px] text-slate-300">Title: &quot;{title}&quot;</div>
            <div className="text-[10px] text-slate-500">
              Heuristic Domain: {category} &bull; Route: {route.toUpperCase()} &bull; Creating JIRA ticket...
            </div>
          </div>
        ),
      },
    ])

    let realTicketId = `INC-${Math.floor(1000 + Math.random() * 9000)}`
    let jiraUrl: string | null = null

    try {
      const fullDesc = `${description}\n\n--- Reporter Metadata ---\nSource: ORION-AI Dashboard Terminal (Option #9 Custom)\nPriority: ${priority}\nCategory: ${category}\nReporter: Terminal User`
      // ⚠️ Key fix: do NOT pass ticketId so the backend creates a real Jira ticket
      const backendRes = await runOrionWorkflowSync({
        issue: fullDesc,
        title,
      })
      if (backendRes?.ticket_id) {
        realTicketId = backendRes.ticket_id
        lastCreatedTicketIdRef.current = backendRes.ticket_id
      }
      // Capture Jira URL from response
      if (backendRes?.jira?.jira_url) {
        jiraUrl = backendRes.jira.jira_url
      } else if (backendRes?.jira_url) {
        jiraUrl = backendRes.jira_url
      }
      // Fallback: construct from known Jira base if ticket looks like KAN-XXX
      if (!jiraUrl && realTicketId && !realTicketId.startsWith('INC-')) {
        jiraUrl = `https://emailnssvitc.atlassian.net/browse/${realTicketId}`
      }
    } catch (err) {
      console.warn('Backend workflow dispatch notice:', err)
    }

    // Build ticket data object
    const ticketData: JiraTicketData = {
      id: realTicketId,
      key: realTicketId,
      summary: title,
      description: description,
      priority: priority,
      status: 'In Progress',
      route: route.toUpperCase() as 'KNOWN' | 'MID' | 'UNKNOWN',
      similarity,
      assignee: assignedHuman,
      reporter: 'Terminal User (Custom #9)',
      created: new Date().toLocaleTimeString(),
      updated: new Date().toLocaleTimeString(),
      resolution: null,
      labels: ['custom-incident', 'terminal-intake', category.toLowerCase()],
      issueType: 'Incident',
      hasDiagnostics: true,
      diagnosticSteps: [
        `Custom incident payload ingested via Terminal Option #9: "${title}"`,
        `Semantic embedding generated and vector similarity evaluated (${similarity.toFixed(2)})`,
        `Classified route: ${route.toUpperCase()} — Category: ${category}`,
        `Assigned Systems Engineer: ${assignedHuman}`,
        `Autonomous remediation pipeline initiated`,
        `JIRA ticket synced and tracking state updated`,
      ],
      diagnosticTimeline: [
        { timestamp: new Date().toLocaleTimeString().slice(0, 5), source: 'TERMINAL', message: `Option #9 custom ticket submitted: ${title}` },
        { timestamp: new Date().toLocaleTimeString().slice(0, 5), source: 'ORION-AI', message: `Assigned to ${assignedHuman} (${category}) — Route: ${route.toUpperCase()}` },
      ],
    }

    // Cache in local mirror (include jira_url for open command)
    customTicketsRef.current[realTicketId.toUpperCase()] = { ...ticketData, raw: { jira_url: jiraUrl } }

    // Trigger Operations Floor Simulation
    const overrideDef = {
      id: realTicketId,
      title,
      description,
      priority,
      route,
      similarity,
      category,
      service: `${category} Service`,
      clientName: 'Terminal User',
      clientRole: 'IT Requester (Custom #9)',
      resolution: `Autonomous fix applied by ${assignedHuman} and verified by QA Lab.`,
    }

    if (route === 'known') {
      sim.runKnownScenario(overrideDef)
    } else if (route === 'mid') {
      sim.runMidScenario(undefined, overrideDef)
    } else {
      sim.runUnknownScenario(undefined, overrideDef)
    }

    // Fetch relevant Qdrant vector match to attach to confirmation card
    let topQdrantMatch: QdrantDocument | null = null
    try {
      const qDocs = await searchQdrantKnowledge(`${title} ${description}`, undefined, 1)
      if (qDocs && qDocs.length > 0) {
        topQdrantMatch = qDocs[0]
      }
    } catch (err) {
      console.warn('Qdrant search during custom intake notice:', err)
    }

    // Replace loading placeholder with verified ticket card
    setHistory((prev) =>
      prev.map((item) =>
        item.id === loadingId
          ? {
              ...item,
              output: renderCustomTicketConfirmation(ticketData, topQdrantMatch, jiraUrl),
            }
          : item
      )
    )
  }

  // ── Dispatch Canned Template (1 to 8) ────────────────────────────────────
  const submitTemplate = (key: string) => {
    const tmpl = ISSUE_TEMPLATES[key]
    if (!tmpl) return
    if (key === '9' || !tmpl.summary) {
      setInteractiveStep({ step: 'custom_title' })
      setHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-1 text-slate-300 font-mono text-[11px] my-1 bg-purple-950/20 border border-purple-800/40 p-2.5 rounded-lg">
              <div className="text-purple-300 font-bold flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Option 9: Custom IT Issue Intake</span>
              </div>
              <div className="text-slate-300">Enter a descriptive title for your new IT issue:</div>
            </div>
          ),
        },
      ])
      return
    }

    setInteractiveStep({ step: 'idle' })
    submitCustomIssue(
      tmpl.summary,
      tmpl.description || tmpl.summary,
      tmpl.priority || 'P2'
    )
  }

  // ── Interactive Multi-Step Input Handler ──────────────────────────────────
  const handleInteractiveInput = (raw: string) => {
    const trimmed = raw.trim()

    // Append user input line
    setHistory((prev) => [
      ...prev,
      { id: crypto.randomUUID(), command: raw, output: '', type: 'input' },
    ])

    if (trimmed.toLowerCase() === 'cancel' || trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'q') {
      setInteractiveStep({ step: 'idle' })
      setHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          output: <div className="text-amber-400 text-[11px]">Interactive mode cancelled. Returned to standard prompt.</div>,
        },
      ])
      return
    }

    // Step 1: Template selection
    if (interactiveStep.step === 'template_select') {
      if (trimmed === '9' || trimmed.toLowerCase() === 'custom') {
        setInteractiveStep({ step: 'custom_title' })
        setHistory((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            output: (
              <div className="space-y-1 text-slate-300 font-mono text-[11px] my-1 bg-purple-950/20 border border-purple-800/40 p-2.5 rounded-lg">
                <div className="text-purple-300 font-bold flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Option 9: Custom IT Issue Intake</span>
                </div>
                <div className="text-slate-300">Enter a descriptive title for your new IT issue:</div>
                <div className="text-[10px] text-slate-500">Example: &quot;Production Redis cluster memory saturation causing eviction spikes&quot;</div>
              </div>
            ),
          },
        ])
        return
      }

      if (trimmed in ISSUE_TEMPLATES) {
        submitTemplate(trimmed)
        return
      }

      setHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          output: <div className="text-rose-400 text-[11px]">Invalid option &apos;{trimmed}&apos;. Enter 1-9 or type &apos;cancel&apos;.</div>,
        },
      ])
      return
    }

    // Step 2: Custom Title
    if (interactiveStep.step === 'custom_title') {
      if (!trimmed) {
        setHistory((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            output: <div className="text-rose-400 text-[11px]">Title cannot be empty. Please enter an issue title (or type &apos;cancel&apos;):</div>,
          },
        ])
        return
      }

      setInteractiveStep({ step: 'custom_desc', title: trimmed })
      setHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-1 text-slate-300 font-mono text-[11px] my-1">
              <div><span className="text-slate-500">Title:</span> <span className="text-white font-bold">{trimmed}</span></div>
              <div className="text-sky-300">Enter issue description (or press Enter to reuse title):</div>
            </div>
          ),
        },
      ])
      return
    }

    // Step 3: Custom Description
    if (interactiveStep.step === 'custom_desc') {
      const finalDesc = trimmed || interactiveStep.title!
      setInteractiveStep({
        step: 'custom_priority',
        title: interactiveStep.title,
        description: finalDesc,
      })
      setHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-1 text-slate-300 font-mono text-[11px] my-1">
              <div><span className="text-slate-500">Description:</span> <span className="text-slate-300">{finalDesc}</span></div>
              <div className="text-amber-300">Enter priority [P1 (Critical), P2 (High), P3 (Medium), P4 (Low)] (default: P2):</div>
            </div>
          ),
        },
      ])
      return
    }

    // Step 4: Custom Priority
    if (interactiveStep.step === 'custom_priority') {
      let priority: 'P1' | 'P2' | 'P3' | 'P4' = 'P2'
      const pLow = trimmed.toLowerCase()
      if (pLow === '1' || pLow === 'p1' || pLow.includes('crit')) priority = 'P1'
      else if (pLow === '2' || pLow === 'p2' || pLow.includes('high')) priority = 'P2'
      else if (pLow === '3' || pLow === 'p3' || pLow.includes('med')) priority = 'P3'
      else if (pLow === '4' || pLow === 'p4' || pLow.includes('low')) priority = 'P4'

      const title = interactiveStep.title!
      const description = interactiveStep.description!

      setInteractiveStep({ step: 'idle' })
      submitCustomIssue(title, description, priority)
    }
  }

  // ── Command Dispatcher ───────────────────────────────────────────────────
  const handleCommand = async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return

    setCmdHistory((prev) => [...prev, raw])
    setHistoryIdx(-1)

    const cmdLower = trimmed.toLowerCase()
    const tokens = trimmed.split(/\s+/)
    const baseCmd = tokens[0].toLowerCase()

    // Append input line
    setHistory((prev) => [
      ...prev,
      { id: crypto.randomUUID(), command: raw, output: '', type: 'input' },
    ])

    // ── DIRECT OPTION SELECTION (e.g. typing '9' directly) ──────────────────
    if (trimmed === '9') {
      setInteractiveStep({ step: 'custom_title' })
      setHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-1 text-slate-300 font-mono text-[11px] my-1 bg-purple-950/20 border border-purple-800/40 p-2.5 rounded-lg">
              <div className="text-purple-300 font-bold flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Option 9: Custom IT Issue Intake</span>
              </div>
              <div className="text-slate-300">Enter a descriptive title for your new IT issue:</div>
              <div className="text-[10px] text-slate-500">Example: &quot;Production Redis cluster memory saturation causing eviction spikes&quot;</div>
            </div>
          ),
        },
      ])
      return
    }

    if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(trimmed)) {
      submitTemplate(trimmed)
      return
    }

    // ── SHOW TEMPLATES MENU ────────────────────────────────────────────────
    if (['issues', 'templates', 'submit', 'menu'].includes(cmdLower)) {
      renderTemplatesMenu()
      return
    }

    // ── CUSTOM / NEW ISSUE COMMAND ─────────────────────────────────────────
    if (baseCmd === 'custom' || baseCmd === 'new') {
      const rest = tokens.slice(1).join(' ').trim()
      if (!rest) {
        // Interactive prompt
        setInteractiveStep({ step: 'custom_title' })
        setHistory((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            output: (
              <div className="space-y-1 text-slate-300 font-mono text-[11px] my-1 bg-purple-950/20 border border-purple-800/40 p-2.5 rounded-lg">
                <div className="text-purple-300 font-bold flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Option 9: Custom IT Issue Intake</span>
                </div>
                <div className="text-slate-300">Enter a descriptive title for your new IT issue:</div>
                <div className="text-[10px] text-slate-500">Example: &quot;High memory consumption on Kafka broker-04 during bulk ingestion&quot;</div>
                <div className="text-[9px] text-slate-600">Type &apos;cancel&apos; to abort.</div>
              </div>
            ),
          },
        ])
        return
      }

      // Inline submission: custom <title> [| <description>]
      let title = rest
      let desc = rest
      if (rest.includes('|')) {
        const parts = rest.split('|')
        title = parts[0].trim()
        desc = parts.slice(1).join('|').trim() || title
      }
      submitCustomIssue(title, desc, 'P2')
      return
    }

    // ── ISSUE COMMAND (e.g. 'issue 9', 'issue 1', 'issue list') ────────────
    if (baseCmd === 'issue') {
      const sub = tokens[1]?.toLowerCase()
      if (!sub || sub === 'list' || sub === 'menu') {
        renderTemplatesMenu()
        return
      }
      if (sub === '9' || sub === 'custom') {
        const rest = tokens.slice(2).join(' ').trim()
        if (rest) {
          let title = rest
          let desc = rest
          if (rest.includes('|')) {
            const parts = rest.split('|')
            title = parts[0].trim()
            desc = parts.slice(1).join('|').trim() || title
          }
          submitCustomIssue(title, desc, 'P2')
        } else {
          setInteractiveStep({ step: 'custom_title' })
          setHistory((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              output: (
                <div className="space-y-1 text-slate-300 font-mono text-[11px] my-1 bg-purple-950/20 border border-purple-800/40 p-2.5 rounded-lg">
                  <div className="text-purple-300 font-bold flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>Option 9: Custom IT Issue Intake</span>
                  </div>
                  <div className="text-slate-300">Enter a descriptive title for your new IT issue:</div>
                </div>
              ),
            },
          ])
        }
        return
      }
      if (sub in ISSUE_TEMPLATES) {
        submitTemplate(sub)
        return
      }
    }

    // ── QDRANT / SEARCH / KB COMMANDS ───────────────────────────────────────
    if (baseCmd === 'search' || baseCmd === 'qdrant' || baseCmd === 'kb' || (baseCmd === 'find' && tokens[1])) {
      const query = (baseCmd === 'find' ? tokens.slice(1) : tokens.slice(1)).join(' ').trim()
      if (!query) {
        setHistory((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            output: (
              <div className="space-y-1 text-slate-300 font-mono text-[11px] my-1 bg-slate-950 p-2.5 rounded-lg border border-purple-800/40">
                <div className="text-purple-300 font-bold flex items-center gap-1.5">
                  <Database size={13} className="text-purple-400" />
                  <span>Qdrant Vector Knowledge Search</span>
                </div>
                <div className="text-slate-400">Search relevant IT runbooks and historical issues across Qdrant vector database:</div>
                <div className="text-sky-300">Usage: search &lt;query&gt;  (e.g., search vpn password, qdrant connection pool timeout)</div>
              </div>
            ),
          },
        ])
        return
      }

      const searchId = crypto.randomUUID()
      setHistory((prev) => [
        ...prev,
        {
          id: searchId,
          output: (
            <div className="flex items-center gap-2 font-mono text-xs text-purple-400 animate-pulse my-1.5 p-2 rounded bg-purple-950/20 border border-purple-900/40">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span>Querying Qdrant vector store (all-MiniLM-L6-v2) for: &quot;{query}&quot;...</span>
            </div>
          ),
        },
      ])

      searchQdrantKnowledge(query, undefined, 4)
        .then((docs) => {
          setHistory((prev) =>
            prev.map((item) =>
              item.id === searchId
                ? {
                    ...item,
                    output: renderQdrantSearchResults(query, docs),
                  }
                : item
            )
          )
        })
        .catch((err) => {
          setHistory((prev) =>
            prev.map((item) =>
              item.id === searchId
                ? {
                    ...item,
                    output: (
                      <div className="text-red-400 font-mono text-xs p-2 rounded bg-red-950/30 border border-red-800/40">
                        Error querying Qdrant: {String(err)}
                      </div>
                    ),
                  }
                : item
            )
          )
        })
      return
    }

    // ── OPEN / JIRA LINK COMMANDS ────────────────────────────────────────────
    // Usage: open [TICKET_ID] | jira link [TICKET_ID] | link [TICKET_ID] | browse [TICKET_ID]
    const isJiraLinkCmd =
      baseCmd === 'open' ||
      baseCmd === 'link' ||
      baseCmd === 'browse' ||
      (baseCmd === 'jira' && ['link', 'open', 'url', 'web', 'browse', 'board'].includes(tokens[1]?.toLowerCase()))

    if (isJiraLinkCmd) {
      let rawArg = baseCmd === 'jira' ? tokens[2] : tokens[1]
      const jiraBase = 'https://emailnssvitc.atlassian.net'
      const projectBoard = `${jiraBase}/jira/software/projects/KAN/boards`

      // If no argument was provided, check if we have a recently created ticket
      if (!rawArg) {
        if (lastCreatedTicketIdRef.current) {
          rawArg = lastCreatedTicketIdRef.current
        } else {
          // Open the Jira Project Board directly
          window.open(projectBoard, '_blank', 'noopener,noreferrer')
          setHistory((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              output: (
                <div className="space-y-2 font-mono text-[11px] my-1 bg-blue-950/25 border border-blue-700/50 p-3 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between border-b border-blue-800/40 pb-1.5">
                    <div className="flex items-center gap-2 text-blue-300 font-bold">
                      <ExternalLink size={13} />
                      <span>Jira Project Board</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700">
                      Project: KAN
                    </span>
                  </div>
                  <div className="text-slate-300">
                    Opened ORION-AI Kanban board in Jira Cloud:
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded border border-blue-900/50">
                    <a
                      href={projectBoard}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-300 hover:text-blue-100 underline underline-offset-2 flex items-center gap-1.5 font-bold font-mono truncate"
                    >
                      {projectBoard}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                  <div className="text-slate-500 text-[10px] pt-1">
                    💡 Tip: specify a ticket ID to jump directly, e.g. <span className="text-sky-300 font-bold">open KAN-50</span> or <span className="text-sky-300 font-bold">jira link 50</span>.
                  </div>
                </div>
              ),
            },
          ])
          return
        }
      }

      // If it's already a full URL
      if (rawArg.startsWith('http')) {
        window.open(rawArg, '_blank', 'noopener,noreferrer')
        setHistory((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            output: (
              <div className="flex items-center gap-2 font-mono text-[11px] my-1 text-blue-300 bg-blue-950/20 p-2 rounded-lg border border-blue-800/40">
                <ExternalLink size={12} />
                <span>Opening URL in browser: <a href={rawArg} target="_blank" rel="noopener noreferrer" className="text-blue-200 underline font-bold">{rawArg}</a></span>
              </div>
            ),
          },
        ])
        return
      }

      // Normalize ticket ID (e.g., '50' -> 'KAN-50', 'kan-50' -> 'KAN-50')
      let ticketIdUpper = rawArg.toUpperCase()
      if (/^\d+$/.test(rawArg)) {
        ticketIdUpper = `KAN-${rawArg}`
      }

      // Check local session cache first
      const cachedTicket = customTicketsRef.current[ticketIdUpper]
      const cachedJiraUrl = cachedTicket?.raw?.jira_url as string | undefined

      // Real Jira ticket link
      const resolvedUrl = cachedJiraUrl || `${jiraBase}/browse/${ticketIdUpper}`
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer')

      setHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-2 font-mono text-[11px] my-1 bg-gradient-to-b from-blue-950/40 to-slate-950 border border-blue-600/40 p-3 rounded-xl shadow-lg">
              <div className="flex items-center justify-between border-b border-blue-800/40 pb-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold">
                  <ExternalLink size={13} />
                  <span>Jira Ticket Navigator</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 font-mono font-bold">
                  ✓ Jira Cloud
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-slate-200 font-medium">
                  Ticket Key: <span className="text-white font-bold font-mono text-xs">{ticketIdUpper}</span>
                  {cachedTicket?.summary && <span className="text-slate-400 ml-2 text-[10px]">— {cachedTicket.summary}</span>}
                </div>
                <div className="text-slate-400 text-[10px]">
                  Direct Jira URL:
                </div>
                <div className="flex items-center gap-2 bg-black/50 p-2 rounded-lg border border-blue-900/60">
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-300 hover:text-blue-100 underline underline-offset-2 flex items-center gap-1.5 font-bold font-mono transition-colors"
                  >
                    {resolvedUrl}
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold px-2.5 py-1 rounded bg-blue-600/40 hover:bg-blue-600/60 text-blue-100 border border-blue-500/50 transition-all flex items-center gap-1.5"
                >
                  <span>🌐 Open in Jira Tab</span>
                  <ExternalLink size={10} />
                </a>
                <button
                  onClick={() => handleCommand(`jira ${ticketIdUpper}`)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📋 Inspect Diagnostics</span>
                </button>
                <a
                  href={projectBoard}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-slate-400 hover:text-slate-200 ml-auto flex items-center gap-1"
                >
                  <span>Board View &rarr;</span>
                </a>
              </div>
            </div>
          ),
        },
      ])
      return
    }


    // ── JIRA / TICKET / DIAGNOSE RETRIEVAL COMMANDS ────────────────────────
    if (baseCmd === 'jira' || baseCmd === 'ticket' || baseCmd === 'diagnose') {
      const ticketId = tokens[1]

      if (!ticketId || ticketId.startsWith('--')) {

        setHistory((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            output: (
              <div className="space-y-1.5 text-slate-300">
                <div className="text-amber-400 font-bold">JIRA Ticket Diagnostic Retrieval</div>
                <div className="text-slate-400 text-[11px]">
                  Retrieve JIRA ticket diagnostic and resolution data directly in the terminal.
                </div>
                <div className="space-y-0.5 text-[11px] font-mono mt-1">
                  <div><span className="text-sky-300 font-bold">jira &lt;TICKET_ID&gt;</span> — Complete ticket summary + diagnostics</div>
                  <div><span className="text-sky-300 font-bold">ticket &lt;TICKET_ID&gt;</span> — Alias for jira command</div>
                  <div><span className="text-sky-300 font-bold">diagnose &lt;TICKET_ID&gt;</span> — Diagnostic timeline and root cause focus</div>
                  <div><span className="text-sky-300 font-bold">jira &lt;TICKET_ID&gt; --summary</span> — Compact ticket summary only</div>
                  <div><span className="text-sky-300 font-bold">jira &lt;TICKET_ID&gt; --diagnostics</span> — Diagnostic steps & timeline only</div>
                  <div><span className="text-sky-300 font-bold">jira &lt;TICKET_ID&gt; --raw</span> — Sanitized raw ticket payload</div>
                </div>
                <div className="text-slate-500 text-[10px] mt-1">
                  Available demo tickets: <span className="text-purple-300">INC-1042</span>, <span className="text-purple-300">EPL-1067</span>, <span className="text-purple-300">EPL-1088</span>, <span className="text-purple-300">INC-1099</span>.
                </div>
              </div>
            ),
          },
        ])
        return
      }

      // Check flags
      const isRaw = tokens.includes('--raw')
      const isSummary = tokens.includes('--summary')
      const isDiagnostics = tokens.includes('--diagnostics') || baseCmd === 'diagnose'
      const viewMode: 'full' | 'summary' | 'diagnostics' | 'raw' = isRaw
        ? 'raw'
        : isSummary
        ? 'summary'
        : isDiagnostics
        ? 'diagnostics'
        : 'full'

      // Check local cache for custom tickets created this session
      const localCustom = customTicketsRef.current[ticketId.toUpperCase()]
      if (localCustom) {
        setHistory((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            output: renderJiraResponse(
              {
                found: true,
                source: 'ORION-AI Incident Store (JIRA Mirror)',
                ticket: localCustom,
              },
              ticketId.toUpperCase(),
              viewMode
            ),
          },
        ])
        return
      }

      // Loading entry
      const loadingId = crypto.randomUUID()
      setHistory((prev) => [
        ...prev,
        {
          id: loadingId,
          output: (
            <div className="text-slate-400 text-[11px] flex items-center gap-1.5 animate-pulse">
              <span className="text-purple-400 font-bold">[JIRA]</span>
              <span>Retrieving ticket {ticketId.toUpperCase()} diagnostic data...</span>
            </div>
          ),
        },
      ])

      try {
        const res = await fetch(`/api/jira/ticket?id=${encodeURIComponent(ticketId)}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const data: JiraApiResponse = await res.json()

        setHistory((prev) =>
          prev.map((item) =>
            item.id === loadingId
              ? {
                  ...item,
                  output: renderJiraResponse(data, ticketId.toUpperCase(), viewMode),
                }
              : item
          )
        )
      } catch (err) {
        setHistory((prev) =>
          prev.map((item) =>
            item.id === loadingId
              ? {
                  ...item,
                  output: (
                    <div className="space-y-1 font-mono text-xs my-1 bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg">
                      <div className="text-amber-400 font-bold uppercase">JIRA CONNECTION NOTICE</div>
                      <div className="text-slate-300">Unable to retrieve remote ticket data.</div>
                      <div className="text-slate-400 text-[10px]">The local operations floor remains operational.</div>
                    </div>
                  ),
                }
              : item
          )
        )
      }
      return
    }

    // ── STANDARD TERMINAL COMMANDS ─────────────────────────────────────────
    const newItems: CommandHistoryItem[] = []

    switch (cmdLower) {
      case 'help':
        newItems.push({
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-2 text-slate-300">
              <div className="text-purple-300 font-bold flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>ORION-AI Operations Terminal Commands:</span>
              </div>
              <div className="grid grid-cols-[170px_1fr] gap-1 text-[11px]">
                <span className="text-pink-400 font-bold">custom [title]</span>
                <span>Submit a brand new custom IT issue (Option #9)</span>

                <span className="text-purple-300 font-bold">issues / templates</span>
                <span>Display all 9 IT issue templates (canned + Option 9)</span>

                <span className="text-purple-300 font-bold">issue &lt;1-9&gt;</span>
                <span>Submit a specific template or Option 9 directly</span>

                <span className="text-purple-300 font-bold">search &lt;query&gt;</span>
                <span>Search Qdrant vector database for runbooks/issues</span>

                <span className="text-purple-300 font-bold">qdrant &lt;query&gt;</span>
                <span>Semantic vector search in Qdrant (all-MiniLM-L6-v2)</span>

                <span className="text-sky-300 font-bold">jira &lt;TICKET_ID&gt;</span>
                <span>Retrieve JIRA ticket diagnostics &amp; resolution</span>

                <span className="text-blue-300 font-bold">open &lt;TICKET_ID&gt;</span>
                <span>Open Jira ticket directly in your browser tab</span>

                <span className="text-blue-300 font-bold">jira link &lt;TICKET_ID&gt;</span>
                <span>Get clickable Jira link for any ticket</span>

                <span className="text-blue-300 font-bold">link &lt;TICKET_ID&gt;</span>
                <span>Alias for open — navigate to Jira ticket</span>

                <span className="text-sky-300 font-bold">diagnose &lt;TICKET_ID&gt;</span>
                <span>Focus on diagnostic timeline for a ticket</span>

                <span className="text-sky-300 font-bold">status</span>
                <span>Display system &amp; active incident health</span>

                <span className="text-sky-300 font-bold">scenario known</span>
                <span>Run Known Scenario (VPN Auth Failure, Alex Rivera)</span>

                <span className="text-sky-300 font-bold">scenario mid</span>
                <span>Run Mid Scenario (DB Pool, Jordan Hayes)</span>

                <span className="text-sky-300 font-bold">scenario unknown</span>
                <span>Run Unknown Scenario (P1 Outage, Marcus &amp; Jordan)</span>

                <span className="text-sky-300 font-bold">scenario failure</span>
                <span>Run Graceful Failure (Insufficient Evidence)</span>

                <span className="text-sky-300 font-bold">scenario replay</span>
                <span>Run Closed-Loop Replay (Learned Pattern)</span>

                <span className="text-sky-300 font-bold">people</span>
                <span>List internal team roster (10 members + client)</span>

                <span className="text-sky-300 font-bold">events</span>
                <span>Display recent timeline events</span>

                <span className="text-sky-300 font-bold">knowledge</span>
                <span>Show Knowledge Base vector stats</span>

                <span className="text-sky-300 font-bold">reset</span>
                <span>Reset the operations floor to standby</span>

                <span className="text-sky-300 font-bold">clear</span>
                <span>Clear terminal console</span>
              </div>
            </div>
          ),
        })
        break

      case 'status':
        newItems.push({
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-0.5 text-slate-300">
              <div className="text-emerald-400 font-bold">ORION-AI Status:</div>
              <div>  Mode:            <span className="text-sky-400 font-bold">{sim.mode}</span></div>
              <div>  Incident ID:     <span className="text-purple-300 font-bold">{sim.incidentId || 'None (Standby)'}</span></div>
              <div>  Active Stage:    <span className="text-white uppercase font-bold">{sim.currentStage}</span></div>
              <div>  Route:           <span className="text-amber-400 font-bold uppercase">{sim.route || 'Standby'}</span></div>
              <div>  Similarity:      <span className="text-emerald-400 font-bold">{sim.similarity !== null ? sim.similarity.toFixed(2) : '--'}</span></div>
              <div>  Assigned Human:  <span className="text-slate-200">{sim.assignedHuman || 'None'}</span></div>
              <div>  State:           <span className="text-emerald-400 uppercase font-bold">{sim.status}</span></div>
              <div>  Custom Ingestion: <span className="text-pink-400 font-bold">ACTIVE (OPTION #9)</span></div>
              <div>  Floor Scene:     <span className="text-emerald-400 font-bold">OPERATIONAL</span></div>
            </div>
          ),
        })
        break

      case 'scenario known':
        sim.runKnownScenario()
        newItems.push({
          id: crypto.randomUUID(),
          output: <div className="text-emerald-400 font-bold">Starting KNOWN incident simulation (INC-1042 — VPN Auth Failure)...</div>,
          type: 'success',
        })
        break

      case 'scenario mid':
        sim.runMidScenario()
        newItems.push({
          id: crypto.randomUUID(),
          output: <div className="text-amber-400 font-bold">Starting MID incident simulation (EPL-1067 — DB Connection Timeout)...</div>,
          type: 'success',
        })
        break

      case 'scenario unknown':
        sim.runUnknownScenario()
        newItems.push({
          id: crypto.randomUUID(),
          output: <div className="text-rose-400 font-bold">Starting UNKNOWN novel incident simulation (EPL-1088 — Cross-Cluster Deadlock)...</div>,
          type: 'success',
        })
        break

      case 'scenario failure':
      case 'scenario fail':
        sim.runFailureScenario?.()
        newItems.push({
          id: crypto.randomUUID(),
          output: <div className="text-amber-400 font-bold">Starting GRACEFUL FAILURE simulation (Insufficient Evidence &amp; Human Review)...</div>,
          type: 'success',
        })
        break

      case 'scenario replay':
        sim.runReplayScenario()
        newItems.push({
          id: crypto.randomUUID(),
          output: <div className="text-emerald-400 font-bold">Starting CLOSED-LOOP REPLAY simulation (Learned Pattern 0.41 &rarr; 0.94)...</div>,
          type: 'success',
        })
        break

      case 'people':
        newItems.push({
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-0.5 text-slate-300">
              <div className="text-purple-300 font-bold">ORION-AI Human IT Operations Team (10 Internal + 1 Client):</div>
              <div>  [Command]     Elena Rodriguez     Incident Manager (HITL Authority)</div>
              <div>  [Systems Eng] Alex Rivera         Systems Engineer (Network &amp; Connectivity)</div>
              <div>  [Systems Eng] Sam Taylor          Systems Engineer (Server &amp; OS)</div>
              <div>  [Systems Eng] Jordan Hayes        Systems Engineer (Database &amp; Storage)</div>
              <div>  [Systems Eng] Taylor Morgan       Systems Engineer (Cloud &amp; Infrastructure)</div>
              <div>  [Systems Eng] Riley Brooks        Systems Engineer (Identity &amp; Security)</div>
              <div>  [DevOps/SRE]  Marcus Lee          DevOps / SRE Engineer (Operations)</div>
              <div>  [QA Lead]     Maya Lin            QA Lead (Verification Lab)</div>
              <div>  [QA Eng]      Noah Williams       QA Engineer (Verification Lab)</div>
              <div>  [Auto QA]     Ananya Sen          Automation Engineer (Verification Lab)</div>
              <div>  [Visitor]     Client              External Customer (Ticket Requester)</div>
            </div>
          ),
        })
        break

      case 'events':
        newItems.push({
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-1">
              <div className="text-purple-300 font-bold">Recent Timeline Events ({sim.timeline.length}):</div>
              {sim.timeline.length > 0 ? (
                sim.timeline.slice(-8).map((e) => (
                  <div key={e.id} className="text-[11px] text-slate-400">
                    <span className="text-slate-500 font-mono">[{e.timestamp}]</span>{' '}
                    <span className="text-slate-200">{e.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">No events recorded. System standby.</div>
              )}
            </div>
          ),
        })
        break

      case 'knowledge':
        newItems.push({
          id: crypto.randomUUID(),
          output: (
            <div className="space-y-0.5 text-slate-300">
              <div className="text-emerald-400 font-bold">Knowledge Base &amp; Vector Store:</div>
              <div>  Index:           <span className="text-white">pgvector HNSW (cosine)</span></div>
              <div>  Embedding Model: <span className="text-white">text-embedding-3-small (1536 dims)</span></div>
              <div>  Known Matches:   <span className="text-emerald-400 font-bold">KB-089 (0.94), KB-074 (0.72)</span></div>
              <div>  Learned Entry:   <span className="text-purple-300 font-bold">KB-1250: Deterministic Lock Ordering</span></div>
              <div>  Closed Loop:     <span className="text-emerald-400">Active</span></div>
            </div>
          ),
        })
        break

      case 'reset':
        sim.reset()
        newItems.push({
          id: crypto.randomUUID(),
          output: <div className="text-slate-400">Floor scene and simulation engine reset to STANDBY.</div>,
        })
        break

      case 'clear':
        setHistory([])
        return

      default:
        newItems.push({
          id: crypto.randomUUID(),
          output: <div className="text-red-400">Unknown command: &apos;{raw}&apos;. Type &apos;help&apos; for available commands.</div>,
          type: 'error',
        })
        break
    }

    setHistory((prev) => [...prev, ...newItems])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = inputVal
      setInputVal('')
      if (interactiveStep.step !== 'idle') {
        handleInteractiveInput(val)
      } else {
        handleCommand(val)
      }
    } else if (e.key === 'Escape') {
      if (interactiveStep.step !== 'idle') {
        setInteractiveStep({ step: 'idle' })
        setHistory((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            output: <div className="text-amber-400 text-[11px]">Interactive mode cancelled. Returned to standard prompt.</div>,
          },
        ])
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (cmdHistory.length > 0) {
        const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1)
        setHistoryIdx(nextIdx)
        setInputVal(cmdHistory[nextIdx])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1
        if (nextIdx >= cmdHistory.length) {
          setHistoryIdx(-1)
          setInputVal('')
        } else {
          setHistoryIdx(nextIdx)
          setInputVal(cmdHistory[nextIdx])
        }
      }
    }
  }

  const getPlaceholderText = () => {
    switch (interactiveStep.step) {
      case 'template_select':
        return "Select option [1-9] or type 'cancel'..."
      case 'custom_title':
        return "Enter custom issue title (e.g. Printer offline in HR) or 'cancel'..."
      case 'custom_desc':
        return "Enter detailed description, or press ENTER to use title..."
      case 'custom_priority':
        return "Enter priority: P1, P2, P3, P4 [default P2], or press ENTER..."
      default:
        return "Type 'custom' to submit new issue, 'issues' for templates (1-9), or 'help'..."
    }
  }

  const getPromptPrefix = () => {
    switch (interactiveStep.step) {
      case 'template_select':
        return '[Select 1-9] >'
      case 'custom_title':
        return '[Custom #9 Title] >'
      case 'custom_desc':
        return '[Custom #9 Desc] >'
      case 'custom_priority':
        return '[Custom #9 Priority] >'
      default:
        return '>'
    }
  }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-strong)',
      }}
      className={`fixed z-50 border rounded-xl shadow-2xl flex flex-col font-mono text-xs overflow-hidden transition-all duration-200 ${
        isMaximized
          ? 'inset-6'
          : 'bottom-4 right-4 w-[580px] max-w-[calc(100vw-32px)] h-[460px]'
      }`}
    >
      {/* ── Terminal Titlebar ── */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-default)',
        }}
        className="flex items-center justify-between px-3 py-1.5 select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <Terminal size={13} style={{ color: 'var(--color-unknown)' }} />
          <span style={{ color: 'var(--text-primary)' }} className="font-bold text-[11px]">ORION-AI Terminal</span>
          <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono">Operations Console</span>
          <span
            style={{
              color: 'var(--color-known)',
              background: 'var(--color-known-bg)',
              border: '1px solid var(--color-known-border)',
            }}
            className="text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            JIRA &bull; OPTION 9 LIVE
          </span>
        </div>

        <div style={{ color: 'var(--text-muted)' }} className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-overlay)] transition-all cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minus size={11} /> : <Square size={10} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-overlay)] transition-all cursor-pointer"
            title="Close Terminal"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* ── Terminal Output History ── */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-[11px] leading-relaxed select-text">
        {history.map((item) => (
          <div key={item.id}>
            {item.command && (
              <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-processing)' }}>
                <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
                <span>{item.command}</span>
              </div>
            )}
            {item.output && <div className="mt-0.5">{item.output}</div>}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* ── Command Input Prompt ── */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border-default)',
        }}
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
      >
        <span
          style={{
            color: interactiveStep.step === 'idle' ? 'var(--color-unknown)' : 'var(--color-processing)',
          }}
          className="font-bold flex-shrink-0"
        >
          {getPromptPrefix()}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholderText()}
          style={{ color: 'var(--text-primary)' }}
          className="flex-1 bg-transparent font-mono text-xs focus:outline-none placeholder:text-[var(--text-muted)]"
          autoFocus
        />
        <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono flex-shrink-0">
          ENTER to run
        </span>
      </div>
    </div>
  )
}
