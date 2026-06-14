'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Message } from '@/types';
import MessageItem from './MessageItem';
import { Send, Terminal, Database, HelpCircle, ArrowRight, Sparkles, ShieldCheck, Table2, Upload, Mic, MicOff } from 'lucide-react';

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
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please try Chrome or Edge.');
      return;
    }
    
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'hi-IN'; // Setting default Hinglish/Hindi listening, parses English well too
    
    rec.onstart = () => {
      setIsListening(true);
    };
    
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? ' ' : '') + transcript);
    };
    
    rec.onerror = (err: any) => {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    };
    
    rec.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-card-border bg-card-bg/85 shadow-2xl shadow-black/25 backdrop-blur-xl">
      {/* Panel Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border-muted bg-white/2 px-3 py-3 sm:px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
          <Terminal size={16} className="animate-pulse" />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-xs font-semibold uppercase tracking-wider text-foreground">Ask your database</span>
          <span className="block text-[10px] text-text-muted">Natural language to safe SQLite</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/5 bg-background/50 px-2.5 py-1">
          <span className={`h-2 w-2 rounded-full ${isLoading ? 'bg-accent animate-pulse' : 'bg-accent-green'}`}></span>
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
          <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center py-6 text-center select-none">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-accent-secondary/35 via-accent/25 to-accent-green/20 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-background/80 text-accent shadow-2xl">
                <Database size={28} className="animate-icon-float" />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl bg-gradient-to-r from-white via-slate-100 to-accent bg-clip-text text-transparent">
              Talk to any data source
            </h2>
            <p className="mb-6 max-w-lg text-sm leading-6 text-text-muted">
              Ask in English or Hinglish. Ingest CSVs, Excel spreadsheets, or explore SQLite databases with guided SQL, explanations, charts, and clean tables.
            </p>

            <div className="mb-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="group rounded-xl border border-white/5 bg-white/2 p-3.5 text-left transition-all duration-300 hover:border-accent-green/30 hover:bg-accent-green-bg">
                <Upload size={16} className="mb-2 text-accent-green icon-hover-scale" />
                <p className="text-xs font-semibold text-foreground">Import spreadsheet</p>
                <p className="mt-1 text-[10px] leading-4 text-text-muted">Upload CSV or Excel directly.</p>
              </div>
              <div className="group rounded-xl border border-white/5 bg-white/2 p-3.5 text-left transition-all duration-300 hover:border-accent/30 hover:bg-accent/5">
                <Sparkles size={16} className="mb-2 text-accent icon-hover-scale" />
                <p className="text-xs font-semibold text-foreground">AI translation</p>
                <p className="mt-1 text-[10px] leading-4 text-text-muted">Hinglish / English queries.</p>
              </div>
              <div className="group rounded-xl border border-white/5 bg-white/2 p-3.5 text-left transition-all duration-300 hover:border-accent-secondary/30 hover:bg-accent-secondary/5">
                <Table2 size={16} className="mb-2 text-accent-secondary icon-hover-scale" />
                <p className="text-xs font-semibold text-foreground">Flexible views</p>
                <p className="mt-1 text-[10px] leading-4 text-text-muted">Hide/show chats & charts.</p>
              </div>
            </div>

            <div className="w-full text-left">
              <p className="mb-2 flex items-center gap-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <HelpCircle size={12} className="text-accent-secondary" /> Try a sample question:
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {EXAMPLE_QUERIES.map((eq, i) => {
                  const Icon = eq.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => onSendMessage(eq.text)}
                      className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/2 px-3.5 py-2.5 text-left text-xs text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent/5 hover:text-white active:scale-[0.99] cursor-pointer"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-background/60 text-accent transition-all group-hover:border-accent/25">
                          <Icon size={14} className="icon-hover-scale" />
                        </span>
                        <span className="line-clamp-2 leading-snug">&quot;{eq.text}&quot;</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5 rounded-md border border-white/5 bg-white/3 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-text-muted group-hover:border-accent/20 group-hover:text-accent">
                        {eq.type} <ArrowRight size={8} className="transition-transform group-hover:translate-x-1" />
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
            {isLoading && messages[messages.length - 1]?.content !== '' && (
              <div className="flex justify-start">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent shadow-sm">
                  <Database size={16} className="animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border-muted bg-white/2 p-3"
      >
        <div className="relative flex items-center rounded-xl border border-card-border bg-background/80 pr-20 shadow-inner transition-all duration-300 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10">
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
            type="button"
            onClick={toggleListening}
            className={`absolute right-11 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 ${
              isListening
                ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                : 'border-white/5 hover:border-accent/30 hover:bg-accent/10 text-text-muted hover:text-white'
            }`}
            title={isListening ? "Listening... click to stop" : "Voice search (Hindi/Hinglish/English)"}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-tr from-accent-secondary to-accent text-white shadow-md shadow-accent-secondary/20 transition-all duration-200 hover:brightness-110 disabled:bg-none disabled:bg-white/5 disabled:text-text-muted disabled:shadow-none cursor-pointer disabled:cursor-not-allowed active:scale-95"
            aria-label="Send message"
          >
            <Send size={14} className="send-icon-takeoff" />
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-[9px] text-text-muted">
          Press <span className="font-mono text-foreground bg-white/5 px-1 py-0.5 rounded border border-white/5">Enter</span> to send, <span className="font-mono text-foreground bg-white/5 px-1 py-0.5 rounded border border-white/5">Shift+Enter</span> for new line. Safe-read shield active.
        </p>
      </form>
    </div>
  );
}
