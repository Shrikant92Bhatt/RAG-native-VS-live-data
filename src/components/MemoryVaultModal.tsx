'use client';

import React, { useState } from 'react';
import { X, Database, Plus, Trash2, BrainCircuit, Sparkles } from 'lucide-react';
import { MemoryItem } from '../types/index';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D1219] border border-[#1E2938] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#1E2938] flex items-center justify-between bg-[#111722]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
              Persistent Memory Vault (MAG)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-[#1E2938] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Information Notice */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
            <strong>Memory-Augmented Generation (MAG)</strong> maintains persistent long-term facts, user preferences, and project decisions across sessions. Memories are stored in PostgreSQL with pgvector embeddings and tenant-level data isolation.
          </div>

          {/* Add New Memory Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-[#131B26] border border-[#202C3E] space-y-3">
            <span className="text-xs font-mono uppercase text-slate-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Register New Memory
            </span>
            <div className="flex gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="bg-[#0A0E14] border border-[#222E40] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="preference">Preference</option>
                <option value="project_context">Project Context</option>
                <option value="fact">Fact</option>
                <option value="summary">Summary</option>
              </select>
              <input
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="e.g. Production database is PostgreSQL 16 with pgvector..."
                className="flex-1 bg-[#0A0E14] border border-[#222E40] rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newContent.trim()}
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black text-xs font-semibold transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Add'}
              </button>
            </div>
          </form>

          {/* Stored Memories List */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Stored Facts ({memories.length})
            </span>
            <div className="space-y-2">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg bg-[#111721] border border-[#1E2836] flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[#1A2330] border border-[#2A374A] text-amber-300">
                        {m.memoryType}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Importance: {(m.importance * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{m.content}</p>
                  </div>
                  <button
                    onClick={() => onDeleteMemory(m.id)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
