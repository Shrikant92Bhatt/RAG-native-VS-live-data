'use client';

import React, { useState, useRef } from 'react';
import { 
  FileUp, 
  Trash2, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Layers, 
  Plus, 
  Loader2,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';
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
import { Card, CardContent } from './ui/card';

export interface DocumentItem {
  id: string;
  title: string;
  provider: string;
  author: string;
  chunkCount: number;
  createdAt: string;
}

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  onUploadFile: (file: File) => Promise<void>;
  onAddManualText: (title: string, content: string) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  documents,
  onUploadFile,
  onAddManualText,
  onDeleteDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'list'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Manual paste state
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploading(true);
    setUploadSuccess(null);
    try {
      await onUploadFile(file);
      setUploadSuccess(`Successfully indexed "${file.name}" into pgvector knowledge base!`);
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualContent.trim()) return;

    setIsUploading(true);
    try {
      await onAddManualText(manualTitle.trim(), manualContent.trim());
      setManualTitle('');
      setManualContent('');
      setUploadSuccess(`Successfully ingested "${manualTitle}" into vector knowledge base!`);
      setTimeout(() => setUploadSuccess(null), 4000);
      setActiveTab('list');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileChange(e.dataTransfer.files);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-2">
            <FileUp className="w-4 h-4 text-amber-400" />
            <DialogTitle>Knowledge Base Manager</DialogTitle>
          </div>
          <DialogDescription>
            Upload documents, notes, and specs to index them into the PostgreSQL pgvector hybrid search knowledge base.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-0 flex items-center gap-2 border-b border-border bg-card">
          <Button
            onClick={() => setActiveTab('upload')}
            variant={activeTab === 'upload' ? 'amber' : 'ghost'}
            size="sm"
            className="h-7 text-xs font-mono"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            Upload File
          </Button>
          <Button
            onClick={() => setActiveTab('paste')}
            variant={activeTab === 'paste' ? 'amber' : 'ghost'}
            size="sm"
            className="h-7 text-xs font-mono"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Paste Text
          </Button>
          <Button
            onClick={() => setActiveTab('list')}
            variant={activeTab === 'list' ? 'amber' : 'ghost'}
            size="sm"
            className="h-7 text-xs font-mono"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Indexed Docs ({documents.length})
          </Button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {uploadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* TAB 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-border hover:border-amber-500/40 bg-secondary/20 hover:bg-secondary/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.markdown,.json,.csv,.pdf,.doc,.docx"
                  onChange={(e) => handleFileChange(e.target.files)}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center mb-3 text-amber-400">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>

                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {isUploading ? 'Chunking & Embedding Document...' : 'Click to upload or drag and drop'}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-3">
                  Supports Markdown (.md), Plain Text (.txt), JSON, CSV, and code documentation files.
                </p>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] font-mono">Max 10MB</Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono">Auto 500-token chunks</Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono">pgvector indexed</Badge>
                </div>
              </div>

              {/* Ingestion Pipeline Architecture Info */}
              <Card className="bg-secondary/30 border-border">
                <CardContent className="p-3 text-xs space-y-1 text-muted-foreground">
                  <span className="font-mono text-[10px] uppercase text-foreground font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Automated Ingestion Pipeline:
                  </span>
                  <p>1. Character-boundary chunking with 100-character contextual overlap.</p>
                  <p>2. Generation of 1536-dimensional cosine embeddings stored in <code className="text-amber-300 font-mono">pgvector</code>.</p>
                  <p>3. Automatic keyword stem tokenization for BM25 <code className="text-amber-300 font-mono">tsvector</code> Reciprocal Rank Fusion.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: Direct Paste Text */}
          {activeTab === 'paste' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground">Document Title</label>
                <Input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Q4 Security Compliance Policy"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground">Content</label>
                <textarea
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Paste documentation, meeting notes, requirements, or architecture specs here..."
                  rows={8}
                  required
                  className="w-full rounded-md border border-input bg-background/50 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <Button
                type="submit"
                disabled={isUploading || !manualTitle.trim() || !manualContent.trim()}
                variant="amber"
                className="w-full justify-center"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ingesting & Embedding...
                  </>
                ) : (
                  'Ingest Document into Knowledge Base'
                )}
              </Button>
            </form>
          )}

          {/* TAB 3: List of Indexed Documents */}
          {activeTab === 'list' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>Indexed Documents: {documents.length}</span>
                <span>Tenant: tenant_default_production</span>
              </div>

              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg bg-secondary/30 border border-border flex items-center justify-between gap-3 text-xs hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-secondary border border-border flex items-center justify-center text-amber-400 shrink-0">
                        {doc.title.endsWith('.csv') ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        ) : doc.title.endsWith('.json') ? (
                          <FileCode className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-medium text-foreground truncate max-w-sm">{doc.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                          <Badge variant="amber" className="text-[9px] uppercase px-1 py-0 font-mono">
                            {doc.provider}
                          </Badge>
                          <span>•</span>
                          <span>{doc.chunkCount} chunks</span>
                          <span>•</span>
                          <span>{doc.author}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => onDeleteDocument(doc.id)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
