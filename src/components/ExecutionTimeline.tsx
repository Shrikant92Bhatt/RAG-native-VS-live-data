'use client';

import React from 'react';
import { CheckCircle2, Loader2, Sparkles, Terminal, Database, Cpu } from 'lucide-react';
import { PlanStep } from '../types/index';

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
    <div className="my-2 p-3 rounded-lg bg-[#111720] border border-[#1E2836] space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300">
            {isStreaming ? 'Execution Pipeline Active' : 'Pipeline Execution Complete'}
          </span>
        </div>

        {latencyMs !== undefined && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
            cacheHit 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
            {cacheHit ? `⚡ CAG Hit (${latencyMs}ms)` : `Latency: ${latencyMs}ms`}
          </span>
        )}
      </div>

      {/* Phase status description */}
      {currentPhase && (
        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
          <Terminal className="w-3 h-3 text-amber-400" />
          <span>{currentPhase}</span>
        </div>
      )}

      {/* Decomposed Plan Steps */}
      {plan && plan.steps && plan.steps.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#1C2532] space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-500">
            Decomposed Multi-Hop Plan
          </span>
          <div className="space-y-1">
            {plan.steps.map((s) => (
              <div key={s.stepIndex} className="flex items-start gap-2 text-[11px] text-slate-300">
                <span className="w-4 h-4 rounded bg-[#18212E] border border-[#253347] flex items-center justify-center font-mono text-[9px] text-amber-400 shrink-0 mt-0.5">
                  {s.stepIndex}
                </span>
                <span>{s.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
