'use client';

import React, { useState } from 'react';
import { X, RefreshCw, Mail, FileText, Cpu, CheckCircle2, ShieldAlert } from 'lucide-react';
import { IntegrationStatus } from '../types/index';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: IntegrationStatus[];
  onSync: (provider: string) => Promise<void>;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  integrations,
  onSync,
}) => {
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTriggerSync = async (provider: string) => {
    setSyncingProvider(provider);
    try {
      await onSync(provider);
    } finally {
      setSyncingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D1219] border border-[#1E2938] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#1E2938] flex items-center justify-between bg-[#111722]">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
              Live Workspace Connectors Hub
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-[#1E2938] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 leading-relaxed">
            Data connectors run with automated circuit breakers, rate-limiting, exponential retry backoff, and cursor-based incremental sync. Tokens are stored encrypted and never exposed to the frontend.
          </div>

          <div className="space-y-3">
            {integrations.map((item) => (
              <div
                key={item.provider}
                className="p-4 rounded-lg bg-[#121924] border border-[#1E2938] flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#182230] border border-[#233146] flex items-center justify-center">
                    {item.provider === 'gmail' && <Mail className="w-4 h-4 text-red-400" />}
                    {item.provider === 'notion' && <FileText className="w-4 h-4 text-slate-200" />}
                    {item.provider === 'jira' && <Cpu className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{item.name}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                      <span>•</span>
                      <span>{item.syncedItems} indexed</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleTriggerSync(item.provider)}
                  disabled={syncingProvider === item.provider}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1A2534] hover:bg-[#233145] border border-[#2B3B52] text-slate-200 text-xs font-medium font-mono transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingProvider === item.provider ? 'animate-spin text-amber-400' : ''}`} />
                  {syncingProvider === item.provider ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
