import { logger } from '../observability/logger.js';

export type ExecutionMode = 'DIRECT' | 'CAG' | 'RAG' | 'MAG' | 'LIVE_TOOL' | 'MULTI_HOP';

export interface RouteDecision {
  mode: ExecutionMode;
  confidence: number;
  reasoning: string;
  subModes: ExecutionMode[];
  requiredTools: ('gmail' | 'notion' | 'jira')[];
  requiresFreshness: boolean;
}

export class QueryRouter {
  route(query: string, explicitMode?: string): RouteDecision {
    const q = query.trim().toLowerCase();

    // If explicit mode requested by user
    if (explicitMode && ['DIRECT', 'CAG', 'RAG', 'MAG', 'LIVE_TOOL', 'MULTI_HOP'].includes(explicitMode)) {
      return {
        mode: explicitMode as ExecutionMode,
        confidence: 1.0,
        reasoning: `User explicitly designated execution mode: ${explicitMode}`,
        subModes: [explicitMode as ExecutionMode],
        requiredTools: ['jira', 'notion', 'gmail'],
        requiresFreshness: explicitMode === 'LIVE_TOOL' || explicitMode === 'MULTI_HOP',
      };
    }

    // 1. Simple Conversational / Greeting -> DIRECT
    if (/^(hi|hello|hey|good morning|who are you|help|thank you|thanks)\b/i.test(q) && q.length < 25) {
      return {
        mode: 'DIRECT',
        confidence: 0.95,
        reasoning: 'Conversational greeting; answered directly without retrieval overhead.',
        subModes: ['DIRECT'],
        requiredTools: [],
        requiresFreshness: false,
      };
    }

    // 2. Freshness & live external tool queries (Jira, Gmail, Notion) -> LIVE_TOOL
    const mentionsJira = /jira|ticket|issue|sprint|proj-|bug\b/i.test(q);
    const mentionsGmail = /gmail|email|inbox|thread|sent to|message from/i.test(q);
    const mentionsNotion = /notion|wiki|doc|page|architecture doc/i.test(q);
    const needsLive = /current|latest|recent|live|status of|open|check/i.test(q);

    const tools: ('gmail' | 'notion' | 'jira')[] = [];
    if (mentionsJira) tools.push('jira');
    if (mentionsGmail) tools.push('gmail');
    if (mentionsNotion) tools.push('notion');

    // 3. Multi-hop queries (comparing across multiple sources or step-by-step logic)
    const isMultiHop = (tools.length >= 2) ||
      (/compare|correlate|both|and also|verify with|across/i.test(q) && tools.length >= 1) ||
      (/what is the status .* and .* sent/i.test(q));

    if (isMultiHop) {
      return {
        mode: 'MULTI_HOP',
        confidence: 0.92,
        reasoning: 'Complex multi-hop question requiring decomposition across multiple workspace tools and indexed knowledge.',
        subModes: ['LIVE_TOOL', 'RAG', 'MAG'],
        requiredTools: tools.length > 0 ? tools : ['jira', 'notion', 'gmail'],
        requiresFreshness: true,
      };
    }

    // 4. Memory / User / Preferences / Project context -> MAG
    if (/remember|my preference|what did i say|recall|preference|my project/i.test(q)) {
      return {
        mode: 'MAG',
        confidence: 0.90,
        reasoning: 'Query references persistent user or project memory.',
        subModes: ['MAG'],
        requiredTools: [],
        requiresFreshness: false,
      };
    }

    // 5. Live Tool Call
    if (tools.length > 0 && needsLive) {
      return {
        mode: 'LIVE_TOOL',
        confidence: 0.88,
        reasoning: `Requires live real-time inspection of ${tools.join(', ')}.`,
        subModes: ['LIVE_TOOL', 'RAG'],
        requiredTools: tools,
        requiresFreshness: true,
      };
    }

    // 6. Default to Hybrid RAG
    return {
      mode: 'RAG',
      confidence: 0.85,
      reasoning: 'Standard knowledge lookup requiring hybrid vector + BM25 retrieval.',
      subModes: ['RAG', 'CAG'],
      requiredTools: [],
      requiresFreshness: false,
    };
  }
}

export const queryRouter = new QueryRouter();
