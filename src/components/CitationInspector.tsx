'use client';

import React from 'react';
import { X, ExternalLink, ShieldCheck, FileCheck, Layers, Hash } from 'lucide-react';
import { Citation } from '../types/index';

interface CitationInspectorProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationInspector: React.FC<CitationInspectorProps> = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    <div className="w-84 md:w-96 bg-[#0E131A] border-l border-[#1D2633] flex flex-col h-full z-20 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[#1D2633] flex items-center justify-between bg-[#121822]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Source Provenance [{citation.citationIndex}]
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-[#1D2633] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Source Title & Provider */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 border border-amber-500/30 text-amber-300">
              {citation.provider}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Score: {(citation.score * 100).toFixed(1)}%
            </span>
          </div>
          <h4 className="text-sm font-medium text-slate-100 leading-snug">
            {citation.title}
          </h4>
        </div>

        {/* Metadata Details */}
        <div className="p-3 rounded bg-[#141B26] border border-[#202B3A] space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-slate-400" />
              Author
            </span>
            <span className="text-slate-200 font-medium truncate max-w-[180px]">
              {citation.author}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              Chunk ID
            </span>
            <span className="font-mono text-[10px] text-slate-300">
              {citation.sourceId}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Retrieval Mode
            </span>
            <span className="font-mono text-[10px] text-emerald-400">
              Hybrid RRF + Rerank
            </span>
          </div>
        </div>

        {/* Verifiable Excerpt */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            Grounded Evidence Excerpt
          </span>
          <div className="p-3 rounded-md bg-[#090C10] border border-[#1F2733] text-xs text-slate-300 leading-relaxed font-mono-code whitespace-pre-wrap">
            {citation.excerpt}
          </div>
        </div>

        {/* Direct Link */}
        {citation.url && (
          <div>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
            >
              Open Original Resource <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
