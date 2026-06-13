'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Message } from '@/types';
import MessageItem from './MessageItem';
import { Send, Terminal, Database, HelpCircle, ArrowRight, Sparkles, ShieldCheck, Table2 } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
}

const EXAMPLE_QUERIES = [
  { text: 'Show all active plans', type: 'English', icon: Database },
  { text: 'Average height of female users', type: 'English', icon: Table2 },
  { text: 'Most common support ticket categories', type: 'English', icon: Sparkles },
  { text: 'Srinagar ke active users dikhao', type: 'Hinglish', icon: Database },
  { text: 'sabse jyada use hone wala subscription plan kaun sa hai', type: 'Hinglish', icon: Sparkles },
  { text: 'total verified users kitne hain', type: 'Hinglish', icon: ShieldCheck },
];

export default function ChatWindow({ messages, isLoading, onSendMessage }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-card-border bg-card-bg/80 shadow-2xl shadow-black/20 backdrop-blur-xl">
      {/* Panel Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border-muted bg-white/3 px-3 py-3 sm:px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-200">
          <Terminal size={16} />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-xs font-semibold uppercase tracking-wider text-foreground">Ask your database</span>
          <span className="block text-[10px] text-text-muted">Natural language to safe SQLite</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/7 bg-background/50 px-2.5 py-1">
          <span className={`h-2 w-2 rounded-full ${isLoading ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'}`}></span>
          <span className="text-[10px] font-medium text-text-muted">{isLoading ? 'Thinking' : 'Ready'}</span>
        </div>
      </div>

      {/* Messages Scroll Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 space-y-4 overflow-y-auto bg-grid-pattern p-3 sm:p-4"
      >
        {messages.length === 0 ? (
          // Empty State / Welcome Screen
          <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center py-6 text-center">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500/30 via-sky-400/20 to-emerald-400/25 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-300/20 bg-background/70 text-sky-100 shadow-2xl shadow-sky-950/30">
                <Database size={28} className="animate-float" />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Talk to your SQLite data</h2>
            <p className="mb-6 max-w-lg text-sm leading-6 text-text-muted">
              Ask in English or Hinglish, get guarded SQL, readable explanations, charts, and exportable results in one workspace.
            </p>

            <div className="mb-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/7 bg-white/4 p-3 text-left">
                <ShieldCheck size={16} className="mb-2 text-emerald-300" />
                <p className="text-xs font-semibold text-foreground">Read-only safety</p>
                <p className="mt-1 text-[10px] leading-4 text-text-muted">Blocks risky statements.</p>
              </div>
              <div className="rounded-xl border border-white/7 bg-white/4 p-3 text-left">
                <Sparkles size={16} className="mb-2 text-sky-300" />
                <p className="text-xs font-semibold text-foreground">AI summaries</p>
                <p className="mt-1 text-[10px] leading-4 text-text-muted">Turns rows into insights.</p>
              </div>
              <div className="rounded-xl border border-white/7 bg-white/4 p-3 text-left">
                <Table2 size={16} className="mb-2 text-amber-300" />
                <p className="text-xs font-semibold text-foreground">Clean outputs</p>
                <p className="mt-1 text-[10px] leading-4 text-text-muted">Inspect, chart, export.</p>
              </div>
            </div>

            <div className="w-full text-left">
              <p className="mb-2 flex items-center gap-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <HelpCircle size={12} className="text-indigo-400" /> Try a sample question:
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLE_QUERIES.map((eq, i) => {
                  const Icon = eq.icon;
                  return (
                  <button
                    key={i}
                    onClick={() => onSendMessage(eq.text)}
                    className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-white/7 bg-white/4 px-3 py-2.5 text-left text-xs text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/35 hover:bg-sky-400/8 hover:text-white hover:shadow-lg hover:shadow-sky-950/20 active:scale-[0.99]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/7 bg-background/50 text-sky-200 transition-colors group-hover:border-sky-400/25">
                        <Icon size={14} />
                      </span>
                      <span className="line-clamp-2">&quot;{eq.text}&quot;</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 rounded-md border border-white/7 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-text-muted group-hover:border-sky-400/25 group-hover:text-sky-200">
                      {eq.type} <ArrowRight size={8} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // Messages List
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onSelectOption={onSendMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border-muted bg-white/3 p-3"
      >
        <div className="relative flex items-center rounded-xl border border-card-border bg-background/85 pr-12 shadow-inner transition-all duration-200 focus-within:border-sky-400/55 focus-within:ring-2 focus-within:ring-sky-400/15">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask in English or Hinglish (e.g. total verified users kitne hain)..."
            rows={1}
            disabled={isLoading}
            className="max-h-24 min-h-[46px] w-full resize-none bg-transparent py-3 pl-4 text-sm text-foreground placeholder-text-muted focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-md shadow-indigo-950/30 transition-all duration-200 hover:brightness-110 disabled:bg-none disabled:bg-white/5 disabled:text-text-muted disabled:shadow-none cursor-pointer disabled:cursor-not-allowed active:scale-95"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-[9px] text-text-muted">
          Press <span className="font-mono text-foreground bg-white/5 px-1 py-0.5 rounded border border-white/5">Enter</span> to send, <span className="font-mono text-foreground bg-white/5 px-1 py-0.5 rounded border border-white/5">Shift+Enter</span> for new line. Security guard protects database.
        </p>
      </form>
    </div>
  );
}
