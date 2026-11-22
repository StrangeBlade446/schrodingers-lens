import React, { useEffect, useRef, useState } from 'react';
import {
  ImagePlus,
  Loader2,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { CatLogo } from './CatLogo';
import type {
  SentinelChatImage,
  SentinelChatMessage,
  SentinelWorkspaceContext,
} from '../types/ats';
import { sendSentinelChatMessage } from '../services/aiScreening';

interface SentinelChatPanelProps {
  messages: SentinelChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<SentinelChatMessage[]>>;
  workspaceContext: SentinelWorkspaceContext;
  onClose: () => void;
}

function renderFormattedInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${keyCounter++}`} className="font-semibold text-[#111936]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`c-${keyCounter++}`}
          className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1E40AF] text-[12px] font-medium"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts;
}

function FormattedAssistantContent({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="space-y-2.5 text-[13.5px] leading-relaxed text-[#1E293B]">
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length === 0) return null;

        const isBulletBlock = lines.every((l) => /^\s*([•*-]|\d+\.)\s+/.test(l));
        if (isBulletBlock) {
          return (
            <ul key={bIdx} className="space-y-1.5 pl-1">
              {lines.map((line, lIdx) => {
                const cleaned = line.replace(/^\s*([•*-]|\d+\.)\s+/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] mt-2 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">{renderFormattedInline(cleaned)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <div key={bIdx} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
                const headingText = trimmed.replace(/^#{2,3}\s+/, '');
                return (
                  <p key={lIdx} className="font-display font-bold text-[#111936] text-sm pt-1">
                    {renderFormattedInline(headingText)}
                  </p>
                );
              }
              if (/^\s*([•*-]|\d+\.)\s+/.test(line)) {
                const cleaned = line.replace(/^\s*([•*-]|\d+\.)\s+/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] mt-2 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">{renderFormattedInline(cleaned)}</span>
                  </div>
                );
              }
              return <p key={lIdx}>{renderFormattedInline(trimmed)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

const VIEW_LABELS: Record<string, string> = {
  landing: 'Landing Hero',
  jobs: 'All Job Descriptions',
  overview: 'Role Overview',
  upload: 'Upload Resumes',
  dashboard: 'Candidate Dashboard',
  ranklist: 'Rank List',
  pipeline: 'Hiring Pipeline',
  compare: 'Side-by-Side Comparison',
};

function readImageAsDataUrl(file: File): Promise<SentinelChatImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        reject(new Error(`Unable to read image: ${file.name}`));
        return;
      }
      resolve({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name || 'pasted-image.png',
        mimeType: file.type || 'image/png',
        dataUrl,
      });
    };
    reader.onerror = () => reject(new Error(`Unable to read image: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function toApiImages(images?: SentinelChatImage[]) {
  if (!images || images.length === 0) return undefined;
  return images
    .map((img) => ({
      name: img.name,
      mimeType: img.mimeType,
      base64Data: img.dataUrl.includes(',') ? img.dataUrl.split(',')[1] : img.dataUrl,
    }))
    .filter((img) => img.base64Data.length > 0);
}

export const SentinelChatPanel: React.FC<SentinelChatPanelProps> = ({
  messages,
  setMessages,
  workspaceContext,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<SentinelChatImage[]>([]);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<SentinelChatImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const appendImageFiles = async (fileList: FileList | File[]) => {
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    try {
      const encoded = await Promise.all(imageFiles.map(readImageAsDataUrl));
      setPendingImages((prev) => [...prev, ...encoded]);
      textareaRef.current?.focus();
    } catch {
      // Ignore malformed file reads cleanly
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      void appendImageFiles(pastedFiles);
    }
  };

  const sendMessage = async (
    textOverride?: string,
    imagesOverride?: SentinelChatImage[]
  ) => {
    const text = (textOverride ?? input).trim();
    const attachedImages = imagesOverride ?? pendingImages;
    if ((!text && attachedImages.length === 0) || isLoading) return;

    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: SentinelChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      images: attachedImages.length > 0 ? attachedImages : undefined,
      timestamp: nowLabel,
    };

    const conversationBeforeUser = messages.filter(
      (m) =>
        !m.isError &&
        !m.id.startsWith('sentinel-welcome') &&
        !m.id.startsWith('welcome-')
    );
    const nextHistory = [...conversationBeforeUser, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    if (textOverride === undefined) {
      setInput('');
    }
    if (imagesOverride === undefined) {
      setPendingImages([]);
    }
    setIsLoading(true);
    setStatusText(null);

    try {
      const apiHistory = nextHistory.map((m) => ({
        role: m.role,
        content: m.content,
        images: toApiImages(m.images),
      }));
      const { reply } = await sendSentinelChatMessage(
        apiHistory,
        workspaceContext,
        (msg) => setStatusText(msg)
      );

      const assistantMsg: SentinelChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMessage =
        err instanceof Error && err.message
          ? err.message
          : "Schrodinger's cat could not respond right now. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      setStatusText(null);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: "Hi! I'm **Schrodinger's cat**. How can I help?",
        timestamp: 'Now',
      },
    ]);
    setPendingImages([]);
    textareaRef.current?.focus();
  };

  const viewLabel = VIEW_LABELS[workspaceContext.currentView] || 'Workspace';

  return (
    <aside
      aria-label="Schrodinger's cat Assistant"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDraggingImages(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingImages(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingImages(false);
        if (e.dataTransfer.files?.length) {
          void appendImageFiles(e.dataTransfer.files);
        }
      }}
      className="fixed bottom-0 inset-x-0 h-[52dvh] md:top-0 md:bottom-0 md:left-auto md:right-0 md:h-dvh md:w-1/2 w-full flex flex-col bg-[#FAF9F6] border-t md:border-t-0 md:border-l border-[#E2E4EC] shadow-2xl md:shadow-none z-40 md:z-30 font-sans"
    >
      {isDraggingImages && (
        <div className="absolute inset-0 z-50 bg-[#111936]/75 backdrop-blur-xs border-2 border-dashed border-[#EAB308] flex items-center justify-center p-6 pointer-events-none">
          <div className="px-5 py-4 rounded-xl bg-[#111936] border border-[#EAB308]/75 text-center text-[#FAF9F6] shadow-xl">
            <ImagePlus className="w-7 h-7 text-[#EAB308] mx-auto mb-2" />
            <p className="font-display text-sm font-bold">Drop image(s) to study</p>
            <p className="text-xs text-[#CBD5E1] mt-0.5">
              Schrodinger&apos;s cat will read text and analyze details
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-16 px-4 sm:px-5 bg-[#111936] text-[#FAF9F6] border-b border-[#1F2A52] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] border border-[#EAB308]/75 flex items-center justify-center shrink-0">
            <CatLogo className="w-4 h-4 text-[#EAB308]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-sm text-white truncate">
                Schrodinger&apos;s cat
              </h2>
            </div>
            <p className="text-[11px] text-[#CBD5E1] truncate">
              Viewing: {viewLabel}
              {workspaceContext.activeJob?.title
                ? ` · ${workspaceContext.activeJob.title}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleResetChat}
            title="Clear conversation"
            aria-label="Clear conversation"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#CBD5E1] hover:text-white hover:bg-[#1A2650] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Schrodinger's cat split panel"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#FAF9F6] bg-[#1A2650] hover:bg-[#1D4ED8] border border-[#2F407A] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Conversation Feed */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
        {messages.map((msg, idx) => {
          const previousUserMsg = msg.isError
            ? [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user')
            : undefined;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#111936] text-[#FAF9F6] text-[13.5px] leading-relaxed'
                    : msg.isError
                      ? 'bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-[13px]'
                      : 'bg-white border border-[#E2E4EC] text-[#111936]'
                }`}
              >
                {msg.images && msg.images.length > 0 && (
                  <div
                    className={`grid gap-2 ${
                      msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                    } ${msg.content ? 'mb-2.5' : ''}`}
                  >
                    {msg.images.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setLightboxImage(img)}
                        className="group relative rounded-lg overflow-hidden border border-white/15 bg-black/20 text-left cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAB308]"
                        title={`View ${img.name}`}
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="max-h-52 w-full object-contain bg-[#0B1126]"
                        />
                        <span className="block px-2 py-1 text-[10px] text-[#CBD5E1] truncate bg-[#0B1126]/90">
                          {img.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {msg.role === 'user' ? (
                  msg.content ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : null
                ) : (
                  <FormattedAssistantContent content={msg.content} />
                )}

                {msg.isError && previousUserMsg && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                      void sendMessage(previousUserMsg.content, previousUserMsg.images ?? []);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#FECDD3] text-[#9F1239] hover:bg-[#FFE4E6] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry question</span>
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1 tabular-nums">
                {msg.role === 'user' ? 'You' : "Schrodinger's cat"} · {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E2E4EC] text-xs text-[#475569]">
              <Loader2 className="w-3.5 h-3.5 text-[#1D4ED8] animate-spin" />
              <span>{statusText || "Schrodinger's cat is thinking..."}</span>
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
        className="p-3 sm:p-4 bg-white border-t border-[#E2E4EC] shrink-0"
      >
        {pendingImages.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {pendingImages.map((img) => (
              <div
                key={img.id}
                className="relative group flex items-center gap-2 pr-7 pl-1.5 py-1 rounded-lg border border-[#E2E4EC] bg-[#FAF9F6] max-w-[200px]"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-9 h-9 rounded object-cover border border-[#E2E4EC] shrink-0"
                />
                <span className="text-[11px] font-medium text-[#111936] truncate">
                  {img.name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPendingImages((prev) => prev.filter((item) => item.id !== img.id))
                  }
                  aria-label={`Remove ${img.name}`}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-[#BE123C] hover:bg-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void appendImageFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Upload image(s) to analyze or read text"
            aria-label="Upload image(s) to analyze or read text"
            className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-lg border border-[#E2E4EC] bg-[#FAF9F6] hover:bg-[#EFF6FF] hover:border-[#93C5FD] text-[#111936] hover:text-[#1D4ED8] disabled:opacity-45 transition-colors cursor-pointer shrink-0"
          >
            <ImagePlus className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask Schrodinger's cat or upload/paste an image..."
            className="flex-1 resize-none rounded-lg border border-[#E2E4EC] bg-[#FAF9F6] px-3 py-2 text-[13.5px] text-[#111936] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:bg-white"
          />

          <button
            type="submit"
            disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
            aria-label="Send message to Schrodinger's cat"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 h-[42px] rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold disabled:opacity-45 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>

        <p className="mt-1.5 text-[10px] text-slate-400">
          Enter to send · Shift+Enter for new line · Upload, paste, or drop images to study &amp; read text
        </p>
      </form>

      {/* Lightbox for full-size image inspection */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-[#0B1126]/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImage.name}
        >
          <div
            className="relative max-w-3xl max-h-[88dvh] bg-[#111936] border border-[#2F407A] rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-[#1F2A52] flex items-center justify-between gap-4 text-[#FAF9F6]">
              <span className="text-xs font-medium truncate">{lightboxImage.name}</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                aria-label="Close image preview"
                className="p-1 rounded-md text-[#CBD5E1] hover:text-white hover:bg-[#1A2650] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-center bg-[#0B1126]">
              <img
                src={lightboxImage.dataUrl}
                alt={lightboxImage.name}
                className="max-h-[75dvh] max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
