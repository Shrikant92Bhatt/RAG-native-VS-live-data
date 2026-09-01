'use client';

import React from 'react';
import { 
  Database, 
  Layers, 
  Activity, 
  MessageSquarePlus, 
  FolderGit2, 
  Cpu, 
  ExternalLink,
  Mail,
  FileText,
  BrainCircuit
} from 'lucide-react';
import { IntegrationStatus } from '../types/index';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface SidebarProps {
  onNewChat: () => void;
  onOpenMemory: () => void;
  onOpenTelemetry: () => void;
  onOpenIntegrations: () => void;
  integrations: IntegrationStatus[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  onNewChat,
  onOpenMemory,
  onOpenTelemetry,
  onOpenIntegrations,
  integrations,
}) => {
  return (
    <aside className="w-72 bg-card border-r border-border flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-foreground uppercase">Agentic RAG</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Live Data & Memory</p>
          </div>
        </div>
        <Badge variant="emerald">PROD</Badge>
      </div>

      {/* Primary Actions */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          variant="secondary"
          className="w-full justify-center gap-2 text-xs"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
          New Investigation
        </Button>
      </div>

      {/* Active Workspace / Session */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-2 py-1 text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
          Active Workspace
        </div>
        <div className="px-3 py-2.5 rounded-md bg-secondary/60 border border-amber-500/30 text-xs text-foreground flex items-start gap-2 cursor-pointer shadow-sm">
          <Layers className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <div className="truncate">
            <p className="font-medium truncate">Architecture & Live Sync</p>
            <p className="text-[10px] text-muted-foreground font-mono">3 sources • 2 memories</p>
          </div>
        </div>
      </div>

      {/* Knowledge Connectors Telemetry */}
      <div className="p-3 border-t border-border bg-background/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
            <FolderGit2 className="w-3 h-3 text-muted-foreground" />
            Connectors
          </span>
          <Button 
            onClick={onOpenIntegrations}
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-[10px] text-amber-400 hover:text-amber-300 font-mono gap-0.5"
          >
            Manage <ExternalLink className="w-2.5 h-2.5" />
          </Button>
        </div>

        <div className="space-y-1.5">
          {integrations.map((item) => (
            <div 
              key={item.provider}
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-secondary/40 border border-border text-xs text-foreground"
            >
              <div className="flex items-center gap-2">
                {item.provider === 'gmail' && <Mail className="w-3.5 h-3.5 text-red-400" />}
                {item.provider === 'notion' && <FileText className="w-3.5 h-3.5 text-slate-300" />}
                {item.provider === 'jira' && <Cpu className="w-3.5 h-3.5 text-blue-400" />}
                <span className="capitalize">{item.provider}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-mono text-muted-foreground">{item.syncedItems} synced</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Utilities Footer */}
      <div className="p-3 border-t border-border space-y-1 bg-card">
        <Button
          onClick={onOpenMemory}
          variant="ghost"
          className="w-full justify-between px-2.5 h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            Memory Vault (MAG)
          </span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">2 Facts</Badge>
        </Button>

        <Button
          onClick={onOpenTelemetry}
          variant="ghost"
          className="w-full justify-between px-2.5 h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Benchmark Telemetry
          </span>
          <Badge variant="emerald" className="text-[9px] px-1.5 py-0">p95 &lt; 800ms</Badge>
        </Button>
      </div>
    </aside>
  );
};
