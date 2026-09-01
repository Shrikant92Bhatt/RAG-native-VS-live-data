'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Database, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Terminal,
  Activity,
  Cpu
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { CitationInspector } from '../components/CitationInspector';
import { ExecutionTimeline } from '../components/ExecutionTimeline';
import { MemoryVaultModal } from '../components/MemoryVaultModal';
import { TelemetryModal } from '../components/TelemetryModal';
import { IntegrationsModal } from '../components/IntegrationsModal';
import { Message, Citation, ExecutionMode, IntegrationStatus, MemoryItem, SystemMetrics, PlanStep } from '../types/index';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const PROMPT_TEMPLATES = [
  'What is the multi-tenant architecture SLA latency requirement?',
  'What is the status of Jira PROJ-1042 and the Gmail security audit?',
  'What are my project preferences and constraints recorded in memory?',
  'When is the next production staging deployment scheduled?',
];

export default function WorkspacePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### Welcome to the Production Agentic Knowledge Workspace

I operate across your live workspace data (**Gmail**, **Notion**, **Jira**), pgvector indexed documents, and persistent long-term memory (**MAG**).

#### Architecture Capabilities:
- **Intelligent Query Router**: Auto-classifies queries into Direct, CAG, RAG, MAG, or Multi-Hop.
- **Cache-Augmented Generation (CAG)**: Delivers sub-20ms instant responses for repeated context.
- **Hybrid Retrieval (RAG)**: Cosine vector search fused with BM25 keyword search via **Reciprocal Rank Fusion (RRF)**.
- **Memory-Augmented Generation (MAG)**: Remembers project decisions, architectural facts, and user preferences.
- **Verified Citations**: Grounded provenance with citation inspection drawer.`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<ExecutionMode>('AUTO');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | undefined>();
  const [activePlan, setActivePlan] = useState<{ steps: PlanStep[] } | undefined>();
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Modals
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  // State data
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    { provider: 'gmail', name: 'Google Workspace / Gmail', status: 'connected', lastSyncedAt: new Date().toISOString(), syncedItems: 24, syncHealth: 'healthy' },
    { provider: 'notion', name: 'Notion Workspace', status: 'connected', lastSyncedAt: new Date().toISOString(), syncedItems: 18, syncHealth: 'healthy' },
    { provider: 'jira', name: 'Atlassian Jira Software', status: 'connected', lastSyncedAt: new Date().toISOString(), syncedItems: 42, syncHealth: 'healthy' },
  ]);

  const [memories, setMemories] = useState<MemoryItem[]>([
    { id: 'mem_user_pref_1', tenantId: 'tenant_default_production', memoryType: 'preference', content: 'User prefers concise, production-grade code examples with strict TypeScript typing.', importance: 0.9, confidence: 0.95, source: 'chat', createdAt: new Date().toISOString() },
    { id: 'mem_proj_fact_1', tenantId: 'tenant_default_production', memoryType: 'project_context', content: 'The production database is PostgreSQL 16 with pgvector extension enabled and tenant_id isolation.', importance: 0.85, confidence: 0.98, source: 'chat', createdAt: new Date().toISOString() }
  ]);

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentPhase]);

  // Fetch initial telemetry & memories
  useEffect(() => {
    fetchMetrics();
    fetchMemories();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // API may be in startup
    }
  };

  const fetchMemories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/memory`);
      if (res.ok) {
        const data = await res.json();
        if (data.memories) setMemories(data.memories);
      }
    } catch {
      // API may be in startup
    }
  };

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isStreaming) return;

    const userMessageId = `msg_user_${Date.now()}`;
    const assistantMessageId = `msg_asst_${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      },
    ]);

    setInputQuery('');
    setIsStreaming(true);
    setCurrentPhase('Initializing agent pipeline...');
    setActivePlan(undefined);

    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          mode: selectedMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedAnswer = '';
      let incomingCitations: Citation[] = [];
      let executionPlan: { steps: PlanStep[] } | undefined;
      let latency = 0;
      let cacheHit = false;

      // Add empty assistant placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        },
      ]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const matchEvent = block.match(/^event:\s*(.+)$/m);
            const matchData = block.match(/^data:\s*(.+)$/m);

            if (matchEvent && matchData) {
              const eventType = matchEvent[1].trim();
              let payload: any = {};
              try {
                payload = JSON.parse(matchData[1].trim());
              } catch {
                payload = matchData[1].trim();
              }

              if (eventType === 'phase') {
                setCurrentPhase(payload.message || payload.phase);
                if (payload.plan) {
                  executionPlan = payload.plan;
                  setActivePlan(payload.plan);
                }
              } else if (eventType === 'tool_call') {
                setCurrentPhase(`Executing live connector: ${payload.tool.toUpperCase()}`);
              } else if (eventType === 'token') {
                streamedAnswer += payload;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: streamedAnswer } : msg
                  )
                );
              } else if (eventType === 'citations') {
                incomingCitations = payload;
              } else if (eventType === 'complete') {
                latency = payload.latencyMs || Date.now() - startTime;
                cacheHit = payload.cacheHit || false;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: payload.answer || streamedAnswer,
                          citations: incomingCitations,
                          latencyMs: latency,
                          cacheHit,
                          plan: executionPlan,
                        }
                      : msg
                  )
                );
              }
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Communication error: ${(err as Error).message}. Operating in sandbox resilience fallback.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      setCurrentPhase(undefined);
      fetchMetrics();
    }
  };

  const handleAddMemory = async (type: string, content: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryType: type, content }),
      });
      if (res.ok) {
        await fetchMemories();
      }
    } catch {
      // In-memory update
      setMemories((prev) => [
        {
          id: `mem_${Date.now()}`,
          tenantId: 'tenant_default_production',
          memoryType: type as any,
          content,
          importance: 0.8,
          confidence: 0.95,
          source: 'chat',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/v1/memory/${id}`, { method: 'DELETE' });
      await fetchMemories();
    } catch {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleSyncConnector = async (provider: string) => {
    try {
      await fetch(`${API_BASE}/api/v1/sync/${provider}`, { method: 'POST' });
    } catch {
      // ignore
    }
  };

  const handleRunAutomatedBenchmarks = async () => {
    setIsRunningBenchmark(true);
    try {
      // Trigger repeated calls to evaluate CAG hit & latency
      for (const t of PROMPT_TEMPLATES) {
        await fetch(`${API_BASE}/api/v1/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: t }),
        });
      }
      await fetchMetrics();
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080A0D]">
      {/* Left Workspace Navigation */}
      <Sidebar
        onNewChat={() => {
          setMessages([
            {
              id: `welcome_${Date.now()}`,
              role: 'assistant',
              content: 'New investigation started. How can I assist with your workspace data or knowledge base?',
              timestamp: new Date().toISOString(),
            },
          ]);
          setActiveCitation(null);
        }}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenTelemetry={() => setIsTelemetryOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        integrations={integrations}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 flex flex-col h-full bg-[#0A0D12] relative overflow-hidden bg-precision-grid">
        {/* Workspace Top Toolbar */}
        <header className="h-14 border-b border-[#18202B] px-5 flex items-center justify-between bg-[#0C1016]/90 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase text-slate-400">Engine Mode:</span>
            <div className="flex items-center gap-1 bg-[#121822] p-1 rounded-md border border-[#1E2838]">
              {(['AUTO', 'RAG', 'CAG', 'MAG', 'LIVE_TOOL', 'MULTI_HOP'] as ExecutionMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                    selectedMode === mode
                      ? 'bg-amber-500 text-black font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#18212D]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#121822] border border-[#1E2838] text-[11px] font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>pgvector + Redis Connected</span>
            </div>
          </div>
        </header>

        {/* Chat Stream & Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 max-w-4xl mx-auto ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded bg-[#151D28] border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-1 shadow-sm">
                  <Cpu className="w-4 h-4" />
                </div>
              )}

              <div
                className={`rounded-xl p-4 text-xs md:text-sm leading-relaxed max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-[#182230] border border-[#26354A] text-slate-100'
                    : 'bg-[#0E141D] border border-[#1B2533] text-slate-200 shadow-md'
                }`}
              >
                {/* Markdown message body */}
                <div className="prose prose-invert prose-xs max-w-none space-y-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-100 mt-3 mb-1">{children}</h3>,
                      h4: ({ children }) => <h4 className="text-xs font-semibold text-amber-300 mt-2 mb-1">{children}</h4>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                      li: ({ children }) => <li className="text-slate-300">{children}</li>,
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 rounded bg-[#17202C] text-amber-300 font-mono text-[11px] border border-[#232F42]">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Grounded Citation Badges */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1B2533] space-y-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Grounded Citations & Provenance ({message.citations.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((c) => (
                        <button
                          key={c.sourceId}
                          onClick={() => setActiveCitation(c)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141B26] hover:bg-[#1C2636] border border-[#202C3E] text-slate-300 text-xs font-medium transition-colors"
                        >
                          <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] flex items-center justify-center">
                            {c.citationIndex}
                          </span>
                          <span className="truncate max-w-[140px]">{c.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Turn Telemetry Footer */}
                {message.latencyMs !== undefined && (
                  <div className="mt-2 pt-2 border-t border-[#18202A] flex items-center gap-3 text-[10px] font-mono text-slate-500">
                    <span className="text-slate-400">
                      {message.cacheHit ? '⚡ CAG HIT' : 'LIVE RAG'}
                    </span>
                    <span>•</span>
                    <span>{message.latencyMs}ms</span>
                    <span>•</span>
                    <span>Isolated: tenant_default_production</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Active Live Timeline while streaming */}
          {isStreaming && (
            <div className="max-w-4xl mx-auto">
              <ExecutionTimeline
                currentPhase={currentPhase}
                isStreaming={isStreaming}
                plan={activePlan}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Suggested Templates */}
        <div className="p-4 border-t border-[#18202B] bg-[#0A0D12]">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Quick Inquiry Templates */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-mono uppercase text-slate-500 shrink-0">Sample Queries:</span>
              {PROMPT_TEMPLATES.map((tmpl, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(tmpl)}
                  className="px-2.5 py-1 rounded-full bg-[#121822] hover:bg-[#1A2330] border border-[#1E2938] text-slate-300 text-[11px] truncate shrink-0 transition-colors"
                >
                  {tmpl}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 bg-[#10151E] border border-[#1E2938] rounded-lg p-1.5 focus-within:border-amber-500/80 transition-all shadow-lg"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about live Jira tickets, Gmail threads, Notion architecture, or memory..."
                disabled={isStreaming}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isStreaming || !inputQuery.trim()}
                className="px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow active:scale-95"
              >
                <span>Execute</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Right Collapsible Citation Provenance Drawer */}
      <CitationInspector
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />

      {/* Modals */}
      <MemoryVaultModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
      />

      <TelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        metrics={metrics}
        onRunBenchmark={handleRunAutomatedBenchmarks}
        isRunningBenchmark={isRunningBenchmark}
      />

      <IntegrationsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
        integrations={integrations}
        onSync={handleSyncConnector}
      />
    </div>
  );
}
