'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  ShieldCheck, 
  Cpu
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { CitationInspector } from '../components/CitationInspector';
import { ExecutionTimeline } from '../components/ExecutionTimeline';
import { MemoryVaultModal } from '../components/MemoryVaultModal';
import { TelemetryModal } from '../components/TelemetryModal';
import { IntegrationsModal } from '../components/IntegrationsModal';
import { KnowledgeBaseModal, DocumentItem } from '../components/KnowledgeBaseModal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
- **File Upload & Knowledge Base**: Upload Markdown, TXT, JSON, and CSV files directly into the vector database.
- **Verified Citations**: Grounded provenance with citation inspection drawer.
- **shadcn/ui Design**: High-craft architectural UI with accessible Radix primitives.`,
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
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  // State data
  const [documents, setDocuments] = useState<DocumentItem[]>([
    { id: 'doc_notion_architecture', title: 'Core Engine Architecture & Service Level Agreements', provider: 'notion', author: 'Platform Architecture Team', chunkCount: 3, createdAt: new Date().toISOString() },
    { id: 'doc_jira_sprint', title: '[PROJ-1042] Deploy Hybrid Reranker and Multi-hop Query Router', provider: 'jira', author: 'Sarah Jenkins (Principal SRE)', chunkCount: 3, createdAt: new Date().toISOString() },
    { id: 'doc_gmail_client_update', title: 'Q3 Enterprise Deployment Schedule & Security Review', provider: 'gmail', author: 'David Vance <dvance@security-audit.com>', chunkCount: 3, createdAt: new Date().toISOString() },
  ]);

  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    { provider: 'gmail', name: 'Google Workspace / Gmail', status: 'sandbox', lastSyncedAt: new Date().toISOString(), syncedItems: 24, syncHealth: 'healthy' },
    { provider: 'notion', name: 'Notion Workspace', status: 'sandbox', lastSyncedAt: new Date().toISOString(), syncedItems: 18, syncHealth: 'healthy' },
    { provider: 'jira', name: 'Atlassian Jira Software', status: 'sandbox', lastSyncedAt: new Date().toISOString(), syncedItems: 42, syncHealth: 'healthy' },
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

  // Fetch initial telemetry, documents & memories
  useEffect(() => {
    fetchMetrics();
    fetchMemories();
    fetchDocuments();
    fetchIntegrations();
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

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/documents`);
      if (res.ok) {
        const data = await res.json();
        if (data.documents && data.documents.length > 0) setDocuments(data.documents);
      }
    } catch {
      // API may be in startup
    }
  };

  const fetchIntegrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/integrations`);
      if (res.ok) {
        const data = await res.json();
        if (data.integrations) setIntegrations(data.integrations);
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

  const handleUploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    const res = await fetch(`${API_BASE}/api/v1/documents`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'File upload failed');
    }

    await fetchDocuments();
  };

  const handleAddManualText = async (title: string, content: string) => {
    const res = await fetch(`${API_BASE}/api/v1/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, author: 'Manual Entry' }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to ingest document');
    }

    await fetchDocuments();
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/v1/documents/${id}`, { method: 'DELETE' });
      await fetchDocuments();
    } catch {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
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
    <div className="flex h-screen w-screen overflow-hidden bg-background">
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
        onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenTelemetry={() => setIsTelemetryOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        integrations={integrations}
        documentCount={documents.length}
        memoryCount={memories.length}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 flex flex-col h-full bg-background/95 relative overflow-hidden bg-precision-grid">
        {/* Workspace Top Toolbar */}
        <header className="h-14 border-b border-border px-5 flex items-center justify-between bg-card/70 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase text-muted-foreground">Engine Mode:</span>
            <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-lg border border-border">
              {(['AUTO', 'RAG', 'CAG', 'MAG', 'LIVE_TOOL', 'MULTI_HOP'] as ExecutionMode[]).map((mode) => (
                <Button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  variant={selectedMode === mode ? 'amber' : 'ghost'}
                  size="sm"
                  className={`h-7 px-2.5 text-[11px] font-mono ${selectedMode === mode ? 'shadow-sm' : 'text-muted-foreground'}`}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsKnowledgeBaseOpen(true)}
              variant="outline"
              size="sm"
              className="h-7 text-xs font-mono border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              + Ingest Document
            </Button>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-secondary/60 border border-border text-[11px] font-mono text-foreground">
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
                <div className="w-8 h-8 rounded bg-secondary border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-1 shadow-sm">
                  <Cpu className="w-4 h-4" />
                </div>
              )}

              <div
                className={`rounded-xl p-4 text-xs md:text-sm leading-relaxed max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-secondary text-foreground border border-border'
                    : 'bg-card border border-border text-foreground shadow-md'
                }`}
              >
                {/* Markdown message body */}
                <div className="prose prose-invert prose-xs max-w-none space-y-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-3 mb-1">{children}</h3>,
                      h4: ({ children }) => <h4 className="text-xs font-semibold text-amber-400 mt-2 mb-1">{children}</h4>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                      li: ({ children }) => <li className="text-foreground/90">{children}</li>,
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 rounded bg-secondary text-amber-300 font-mono text-[11px] border border-border">
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
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Grounded Citations & Provenance ({message.citations.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((c) => (
                        <Button
                          key={c.sourceId}
                          onClick={() => setActiveCitation(c)}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs font-medium gap-1.5 bg-secondary/50 hover:bg-secondary border-border"
                        >
                          <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] flex items-center justify-center">
                            {c.citationIndex}
                          </span>
                          <span className="truncate max-w-[140px]">{c.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Turn Telemetry Footer */}
                {message.latencyMs !== undefined && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                    <span className="text-foreground">
                      {message.cacheHit ? '⚡ CAG HIT' : 'LIVE RAG'}
                    </span>
                    <span>•</span>
                    <span>{message.latencyMs}ms</span>
                    <span>•</span>
                    <span>Tenant: tenant_default_production</span>
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
        <div className="p-4 border-t border-border bg-card/60 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Quick Inquiry Templates */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-mono uppercase text-muted-foreground shrink-0">Sample Queries:</span>
              {PROMPT_TEMPLATES.map((tmpl, i) => (
                <Button
                  key={i}
                  onClick={() => handleSendMessage(tmpl)}
                  variant="outline"
                  size="sm"
                  className="h-6 rounded-full text-[11px] font-normal px-2.5 truncate shrink-0 border-border text-foreground/80 hover:text-foreground"
                >
                  {tmpl}
                </Button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 bg-background border border-input rounded-lg p-1.5 focus-within:border-amber-500/80 transition-all shadow-lg"
            >
              <Input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about live Jira tickets, Gmail threads, Notion architecture, or uploaded docs..."
                disabled={isStreaming}
                className="border-0 shadow-none focus-visible:ring-0 text-xs md:text-sm"
              />
              <Button
                type="submit"
                disabled={isStreaming || !inputQuery.trim()}
                variant="amber"
                size="sm"
                className="gap-1.5"
              >
                <span>Execute</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
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
      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        documents={documents}
        onUploadFile={handleUploadFile}
        onAddManualText={handleAddManualText}
        onDeleteDocument={handleDeleteDocument}
      />

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
