'use client';

import React from 'react';
import { CheckCircle2, Loader2, Terminal } from 'lucide-react';
import { PlanStep } from '../types/index';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface ExecutionTimelineProps {
  currentPhase?: string;
  isStreaming: boolean;
  cacheHit?: boolean;
  latencyMs?: number;
  plan?: { steps: PlanStep[] };
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  currentPhase,
  isStreaming,
  cacheHit,
  latencyMs,
  plan,
}) => {
  if (!isStreaming && !currentPhase && !plan) return null;

  return (
    <Card className="my-2 bg-secondary/50 border-border">
      <CardContent className="p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {isStreaming ? 'Execution Pipeline Active' : 'Pipeline Execution Complete'}
            </span>
          </div>

          {latencyMs !== undefined && (
            <Badge variant={cacheHit ? 'emerald' : 'secondary'}>
              {cacheHit ? `⚡ CAG Hit (${latencyMs}ms)` : `Latency: ${latencyMs}ms`}
            </Badge>
          )}
        </div>

        {/* Phase status description */}
        {currentPhase && (
          <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
            <Terminal className="w-3 h-3 text-amber-400" />
            <span>{currentPhase}</span>
          </div>
        )}

        {/* Decomposed Plan Steps */}
        {plan && plan.steps && plan.steps.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">
              Decomposed Multi-Hop Plan
            </span>
            <div className="space-y-1">
              {plan.steps.map((s) => (
                <div key={s.stepIndex} className="flex items-start gap-2 text-[11px] text-foreground/90">
                  <span className="w-4 h-4 rounded bg-secondary border border-border flex items-center justify-center font-mono text-[9px] text-amber-400 shrink-0 mt-0.5">
                    {s.stepIndex}
                  </span>
                  <span>{s.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
