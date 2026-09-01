'use client';

import React from 'react';
import { X, ExternalLink, ShieldCheck, FileCheck, Layers, Hash } from 'lucide-react';
import { Citation } from '../types/index';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface CitationInspectorProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationInspector: React.FC<CitationInspectorProps> = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    <div className="w-84 md:w-96 bg-card border-l border-border flex flex-col h-full z-20 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Source Provenance [{citation.citationIndex}]
          </h3>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content Body */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Source Title & Provider */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="amber" className="uppercase font-mono text-[10px]">
              {citation.provider}
            </Badge>
            <span className="text-[11px] font-mono text-muted-foreground">
              Score: {(citation.score * 100).toFixed(1)}%
            </span>
          </div>
          <h4 className="text-sm font-medium text-foreground leading-snug">
            {citation.title}
          </h4>
        </div>

        {/* Metadata Details Card */}
        <Card className="bg-secondary/40 border-border">
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
                Author
              </span>
              <span className="text-foreground font-medium truncate max-w-[180px]">
                {citation.author}
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                Chunk ID
              </span>
              <span className="font-mono text-[10px] text-foreground">
                {citation.sourceId}
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                Retrieval Mode
              </span>
              <Badge variant="emerald" className="text-[9px] px-1.5 py-0 font-mono">
                Hybrid RRF + Rerank
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Verifiable Excerpt */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-muted-foreground">
            Grounded Evidence Excerpt
          </span>
          <div className="p-3 rounded-md bg-background border border-border text-xs text-foreground/90 leading-relaxed font-mono-code whitespace-pre-wrap">
            {citation.excerpt}
          </div>
        </div>

        {/* Direct Link Button */}
        {citation.url && (
          <div>
            <Button
              asChild
              variant="outline"
              className="w-full justify-center gap-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 text-xs"
            >
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Original Resource <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
