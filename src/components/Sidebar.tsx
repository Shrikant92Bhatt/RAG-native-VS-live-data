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
  CheckCircle2,
  BrainCircuit
} from 'lucide-react';
import { IntegrationStatus } from '../types/index';

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
    <aside className="w-72 bg-[#0C1016] border-r border-[#1B232E] flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1B232E] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">Agentic RAG</h1>
            <p className="text-[10px] text-slate-400 font-mono">Live Data & Memory</p>
          </div>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          PROD
        </span>
      </div>

      {/* Primary Actions */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-[#161E28] hover:bg-[#1E2938] border border-[#232F40] text-slate-200 transition-all shadow-sm active:scale-[0.98]"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
          New Investigation
        </button>
      </div>

      {/* Conversations / Sessions */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-2 py-1 text-[11px] font-mono uppercase text-slate-500 tracking-wider">
          Active Workspace
        </div>
        <div className="px-3 py-2 rounded-md bg-[#141B24] border border-amber-500/30 text-xs text-slate-200 flex items-start gap-2 cursor-pointer">
          <Layers className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <div className="truncate">
            <p className="font-medium truncate">Architecture & Live Sync</p>
            <p className="text-[10px] text-slate-400 font-mono">3 sources • 2 memories</p>
          </div>
        </div>
      </div>

      {/* Knowledge Connectors Telemetry */}
      <div className="p-3 border-t border-[#1B232E] bg-[#0A0D12]/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <FolderGit2 className="w-3 h-3 text-slate-400" />
            Connectors
          </span>
          <button 
            onClick={onOpenIntegrations}
            className="text-[10px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-0.5"
          >
            Manage <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          {integrations.map((item) => (
            <div 
              key={item.provider}
              className="flex items-center justify-between px-2 py-1.5 rounded bg-[#10151C] border border-[#1B232E] text-xs text-slate-300"
            >
              <div className="flex items-center gap-2">
                {item.provider === 'gmail' && <Mail className="w-3.5 h-3.5 text-red-400" />}
                {item.provider === 'notion' && <FileText className="w-3.5 h-3.5 text-slate-300" />}
                {item.provider === 'jira' && <Cpu className="w-3.5 h-3.5 text-blue-400" />}
                <span className="capitalize">{item.provider}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-mono text-slate-400">{item.syncedItems} synced</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Utilities Footer */}
      <div className="p-3 border-t border-[#1B232E] space-y-1 bg-[#090C10]">
        <button
          onClick={onOpenMemory}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded text-slate-400 hover:text-slate-200 hover:bg-[#141B24] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            Memory Vault (MAG)
          </span>
          <span className="text-[10px] font-mono text-slate-500">2 Facts</span>
        </button>

        <button
          onClick={onOpenTelemetry}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded text-slate-400 hover:text-slate-200 hover:bg-[#141B24] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Benchmark Telemetry
          </span>
          <span className="text-[10px] font-mono text-emerald-400">p95 &lt; 800ms</span>
        </button>
      </div>
    </aside>
  );
};
