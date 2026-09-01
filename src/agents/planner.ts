import { logger } from '../observability/logger';

export interface PlanStep {
  stepIndex: number;
  description: string;
  action: 'search_tool' | 'retrieve_rag' | 'recall_memory' | 'synthesize';
  targetProvider?: 'gmail' | 'notion' | 'jira';
  subQuery: string;
  dependsOn?: number[];
}

export interface ExecutionPlan {
  originalQuery: string;
  steps: PlanStep[];
  estimatedDifficulty: 'simple' | 'moderate' | 'complex';
}

export class QueryPlanner {
  decompose(query: string, requiredTools: ('gmail' | 'notion' | 'jira')[]): ExecutionPlan {
    const q = query.toLowerCase();
    const steps: PlanStep[] = [];
    let stepIndex = 1;

    // Check if memory recall is beneficial
    if (/we|our|my|project|prefer|architecture/i.test(q)) {
      steps.push({
        stepIndex: stepIndex++,
        description: 'Recall relevant user preferences and project architectural facts from long-term memory (MAG).',
        action: 'recall_memory',
        subQuery: query,
      });
    }

    // Allocate steps for live tools if identified
    for (const tool of requiredTools) {
      steps.push({
        stepIndex: stepIndex++,
        description: `Query live ${tool.toUpperCase()} workspace connector for real-time status and changes.`,
        action: 'search_tool',
        targetProvider: tool,
        subQuery: query,
      });
    }

    // Add indexed knowledge retrieval step
    steps.push({
      stepIndex: stepIndex++,
      description: 'Execute hybrid retrieval (Vector + BM25 + Reciprocal Rank Fusion) on indexed enterprise knowledge base.',
      action: 'retrieve_rag',
      subQuery: query,
    });

    // Final synthesis step
    steps.push({
      stepIndex: stepIndex,
      description: 'Synthesize multi-source findings, validate claims, and compute grounded citation provenance.',
      action: 'synthesize',
      subQuery: query,
      dependsOn: steps.map(s => s.stepIndex),
    });

    const difficulty = steps.length > 3 ? 'complex' : steps.length > 2 ? 'moderate' : 'simple';

    logger.debug({ stepsCount: steps.length, difficulty }, 'Decomposed query into execution plan');
    return {
      originalQuery: query,
      steps,
      estimatedDifficulty: difficulty,
    };
  }
}

export const queryPlanner = new QueryPlanner();
