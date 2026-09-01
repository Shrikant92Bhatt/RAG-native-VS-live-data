import { queryRouter, RouteDecision } from './router';
import { queryPlanner, ExecutionPlan } from './planner';
import { citationSynthesizer, Citation } from './synthesis';
import { cag } from '../cache/cag';
import { hybridRetriever } from '../retrieval/hybrid';
import { reranker } from '../retrieval/reranker';
import { RetrievedChunk } from '../retrieval/vector';
import { gmailConnector } from '../connectors/gmail';
import { notionConnector } from '../connectors/notion';
import { jiraConnector } from '../connectors/jira';
import { ConnectorResource } from '../connectors/base';
import { shortTermMemory } from '../memory/short_term';
import { longTermMemory, MemoryRecord } from '../memory/long_term';
import { security } from '../security/defense';
import { metrics } from '../observability/metrics';
import { logger } from '../observability/logger';

export interface StreamEvent {
  event: 'phase' | 'tool_call' | 'token' | 'citations' | 'complete' | 'error';
  data: any;
}

export interface OrchestrationResult {
  answer: string;
  route: RouteDecision;
  plan?: ExecutionPlan;
  citations: Citation[];
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  cacheHit: boolean;
  groundingScore: number;
}

export class AgentOrchestrator {
  async execute(
    tenantId: string,
    userId: string,
    conversationId: string,
    query: string,
    explicitMode?: string,
    onProgress?: (event: StreamEvent) => void
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    let tokensIn = Math.ceil(query.length / 4);
    let tokensOut = 0;

    const emit = (event: StreamEvent) => {
      if (onProgress) onProgress(event);
    };

    // Phase 1: Security & Sanitization
    emit({ event: 'phase', data: { phase: 'sanitization', message: 'Analyzing input security & boundaries...' } });
    const { sanitized, isInjected, flags } = security.sanitizeUserInput(query);
    if (isInjected) {
      logger.warn({ flags }, 'Prompt injection neutralized');
    }

    // Phase 2: Cache-Augmented Generation (CAG) Check
    emit({ event: 'phase', data: { phase: 'cag_lookup', message: 'Checking L1/L2 semantic cache (CAG)...' } });
    if (!explicitMode || explicitMode === 'CAG' || explicitMode === 'AUTO') {
      const cached = await cag.getExactResponse(tenantId, sanitized);
      if (cached) {
        const latencyMs = Date.now() - startTime;
        emit({ event: 'phase', data: { phase: 'cag_hit', message: `Cache HIT (${latencyMs}ms)! Instant delivery.` } });
        emit({ event: 'citations', data: cached.citations });
        emit({ event: 'complete', data: { ...cached, latencyMs, cacheHit: true } });
        metrics.recordRequest(latencyMs, true, tokensIn, cached.tokensOut, 0.00001);
        return {
          ...cached,
          latencyMs,
          cacheHit: true,
        };
      }
    }

    // Phase 3: Intelligent Query Routing
    emit({ event: 'phase', data: { phase: 'routing', message: 'Evaluating intent & routing strategy...' } });
    const route = queryRouter.route(sanitized, explicitMode);
    emit({ event: 'phase', data: { phase: 'route_selected', route: route.mode, reasoning: route.reasoning } });

    // Handle DIRECT Mode
    if (route.mode === 'DIRECT') {
      const directAnswer = `Hello! I am your production Agentic Knowledge Assistant. I monitor your live workspace across **Gmail**, **Notion**, and **Jira**, combined with pgvector indexed documents and persistent long-term memory. How can I help you today?`;
      tokensOut = Math.ceil(directAnswer.length / 4);
      const latencyMs = Date.now() - startTime;
      emit({ event: 'token', data: directAnswer });
      emit({ event: 'complete', data: { answer: directAnswer, citations: [], latencyMs } });
      return {
        answer: directAnswer,
        route,
        citations: [],
        latencyMs,
        tokensIn,
        tokensOut,
        cacheHit: false,
        groundingScore: 1.0,
      };
    }

    // Phase 4: Planning & Decomposition (for complex or multi-hop queries)
    let plan: ExecutionPlan | undefined;
    if (route.mode === 'MULTI_HOP' || route.mode === 'LIVE_TOOL') {
      emit({ event: 'phase', data: { phase: 'planning', message: 'Decomposing multi-step task...' } });
      plan = queryPlanner.decompose(sanitized, route.requiredTools);
      emit({ event: 'phase', data: { phase: 'plan_generated', plan } });
    }

    const collectedEvidence: (RetrievedChunk | ConnectorResource)[] = [];
    let recalledMemories: MemoryRecord[] = [];

    // Phase 5: Long-term Memory Recall (MAG)
    if (route.mode === 'MAG' || route.mode === 'MULTI_HOP' || route.subModes.includes('MAG')) {
      emit({ event: 'phase', data: { phase: 'memory_recall', message: 'Recalling long-term project context & preferences (MAG)...' } });
      recalledMemories = await longTermMemory.searchMemories(tenantId, sanitized, 3);
      emit({ event: 'phase', data: { phase: 'memory_recalled', count: recalledMemories.length } });
    }

    // Phase 6: Live MCP Tool Execution (Gmail, Notion, Jira)
    if (route.requiredTools.length > 0) {
      for (const tool of route.requiredTools) {
        emit({ event: 'tool_call', data: { tool, status: 'executing', query: sanitized } });
        try {
          let toolResults: ConnectorResource[] = [];
          if (tool === 'jira') {
            toolResults = await jiraConnector.search(sanitized, 3);
          } else if (tool === 'notion') {
            toolResults = await notionConnector.search(sanitized, 3);
          } else if (tool === 'gmail') {
            toolResults = await gmailConnector.search(sanitized, 3);
          }
          collectedEvidence.push(...toolResults);
          emit({ event: 'tool_call', data: { tool, status: 'completed', count: toolResults.length } });
        } catch (err) {
          logger.warn({ tool, err }, 'Live connector query failed; continuing with graceful fallback');
          emit({ event: 'tool_call', data: { tool, status: 'fallback', message: (err as Error).message } });
        }
      }
    }

    // Phase 7: Hybrid Retrieval & Reranking (Vector + BM25 + Reciprocal Rank Fusion)
    if (route.mode === 'RAG' || route.mode === 'MULTI_HOP' || route.subModes.includes('RAG')) {
      emit({ event: 'phase', data: { phase: 'retrieval_hybrid', message: 'Running parallel Vector + BM25 search with Reciprocal Rank Fusion (RRF)...' } });
      const rawCandidates = await hybridRetriever.search(tenantId, sanitized, 6);

      emit({ event: 'phase', data: { phase: 'reranking', message: 'Reranking candidates and validating relevance...' } });
      const rerankedChunks = reranker.rerank(sanitized, rawCandidates, 4);
      collectedEvidence.push(...rerankedChunks);
      emit({ event: 'phase', data: { phase: 'retrieval_complete', count: rerankedChunks.length } });
    }

    // Phase 8: Synthesis & Citation Grounding
    emit({ event: 'phase', data: { phase: 'synthesis', message: 'Grounding claims, cross-referencing citations, and synthesizing answer...' } });
    const { answer, citations, groundingScore } = citationSynthesizer.synthesize(
      sanitized,
      collectedEvidence,
      recalledMemories
    );

    // Stream out synthesized answer tokens
    const words = answer.split(' ');
    for (let i = 0; i < words.length; i++) {
      emit({ event: 'token', data: (i === 0 ? '' : ' ') + words[i] });
    }

    tokensOut = Math.ceil(answer.length / 4);
    tokensIn += collectedEvidence.reduce((acc, e) => acc + Math.ceil(e.content.length / 4), 0);
    const latencyMs = Date.now() - startTime;
    const costUsd = Number(((tokensIn * 0.00000015) + (tokensOut * 0.0000006)).toFixed(6));

    // Cache the verified response for CAG
    await cag.setExactResponse(tenantId, sanitized, {
      answer,
      route,
      plan,
      citations,
      tokensIn,
      tokensOut,
      groundingScore,
    }, 900);

    // Save to Short-term session memory
    await shortTermMemory.appendMessage(conversationId, 'user', sanitized);
    await shortTermMemory.appendMessage(conversationId, 'assistant', answer);

    // Record system telemetry
    metrics.recordRequest(latencyMs, false, tokensIn, tokensOut, costUsd);

    emit({ event: 'citations', data: citations });
    emit({
      event: 'complete',
      data: {
        answer,
        route,
        plan,
        citations,
        latencyMs,
        tokensIn,
        tokensOut,
        costUsd,
        groundingScore,
        cacheHit: false,
      },
    });

    return {
      answer,
      route,
      plan,
      citations,
      latencyMs,
      tokensIn,
      tokensOut,
      cacheHit: false,
      groundingScore,
    };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
