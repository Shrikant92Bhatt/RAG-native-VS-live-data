'use client';

import React, { useState } from 'react';
import { Database, Plus, Trash2 } from 'lucide-react';
import { MemoryItem } from '../types/index';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface MemoryVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onAddMemory: (type: string, content: string) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
}

export const MemoryVaultModal: React.FC<MemoryVaultModalProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onDeleteMemory,
}) => {
  const [newType, setNewType] = useState('preference');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddMemory(newType, newContent.trim());
      setNewContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <DialogTitle>Persistent Memory Vault (MAG)</DialogTitle>
          </div>
          <DialogDescription>
            Memory-Augmented Generation maintains long-term project facts and preferences across sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Architecture notice */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
            Memories are persisted in PostgreSQL with pgvector embeddings and tenant-level SQL data isolation.
          </div>

          {/* Add New Memory Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-secondary/40 border border-border space-y-3">
            <span className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Register New Memory
            </span>
            <div className="flex gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="bg-background border border-input rounded px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="preference">Preference</option>
                <option value="project_context">Project Context</option>
                <option value="fact">Fact</option>
                <option value="summary">Summary</option>
              </select>
              <Input
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="e.g. Production database is PostgreSQL 16 with pgvector..."
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isSubmitting || !newContent.trim()}
                variant="amber"
                size="sm"
              >
                {isSubmitting ? 'Saving...' : 'Add'}
              </Button>
            </div>
          </form>

          {/* Stored Memories List */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
              Stored Facts ({memories.length})
            </span>
            <div className="space-y-2">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg bg-secondary/30 border border-border flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="amber" className="uppercase font-mono text-[9px]">
                        {m.memoryType}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Importance: {(m.importance * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-foreground/90 leading-relaxed">{m.content}</p>
                  </div>
                  <Button
                    onClick={() => onDeleteMemory(m.id)}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
