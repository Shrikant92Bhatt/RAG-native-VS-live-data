'use client';

import React, { useState } from 'react';
import { RefreshCw, Mail, FileText, Cpu, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { IntegrationStatus } from '../types/index';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

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

  const handleTriggerSync = async (provider: string) => {
    setSyncingProvider(provider);
    try {
      await onSync(provider);
    } finally {
      setSyncingProvider(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <DialogTitle>Live Workspace Connectors Hub</DialogTitle>
          </div>
          <DialogDescription>
            Manage live synchronization and credentials for Gmail, Notion, and Jira workspace connectors.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <div className="p-3 rounded-lg bg-secondary/40 border border-border text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-semibold flex items-center gap-1.5 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Live API vs Offline Sandbox Mode:
            </span>
            Connectors run in <strong className="text-amber-300">Sandbox Simulation Mode</strong> by default so the agent and hybrid search work immediately. To connect live enterprise data, provide your OAuth tokens or API keys in <code className="text-amber-300 font-mono">.env</code>.
          </div>

          <div className="space-y-3">
            {integrations.map((item: any) => {
              const isLive = item.status === 'connected';

              return (
                <div
                  key={item.provider}
                  className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-secondary border border-border flex items-center justify-center">
                        {item.provider === 'gmail' && <Mail className="w-4 h-4 text-red-400" />}
                        {item.provider === 'notion' && <FileText className="w-4 h-4 text-slate-200" />}
                        {item.provider === 'jira' && <Cpu className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{item.name}</h3>
                          {isLive ? (
                            <Badge variant="emerald" className="text-[9px] px-1.5 py-0 font-mono">
                              Live Connected
                            </Badge>
                          ) : (
                            <Badge variant="amber" className="text-[9px] px-1.5 py-0 font-mono">
                              Sandbox (Offline)
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                          <span>{item.syncedItems} indexed items</span>
                          <span>•</span>
                          <span>{isLive ? 'Live API synced' : 'Simulated dataset'}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleTriggerSync(item.provider)}
                      disabled={syncingProvider === item.provider}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingProvider === item.provider ? 'animate-spin text-amber-400' : ''}`} />
                      {syncingProvider === item.provider ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  </div>

                  {!isLive && item.requiredEnvVars && (
                    <div className="pt-2 border-t border-border flex items-center gap-2 text-[11px] font-mono text-muted-foreground bg-secondary/20 p-2 rounded">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">
                        Requires in .env: {item.requiredEnvVars.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
