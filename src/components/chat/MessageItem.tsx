'use client';

import React from 'react';
import { Message } from '@/types';
import { Bot, User, Sparkles, AlertTriangle } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onSelectOption?: (option: string) => void;
}

export default function MessageItem({ message, onSelectOption }: MessageItemProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex w-full gap-2 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-message-in`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-200 shadow-sm shadow-sky-950/20">
          <Bot size={18} />
        </div>
      )}

      {/* Message Bubble */}
      <div className="flex max-w-[88%] flex-col gap-1 sm:max-w-[82%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-md leading-relaxed break-words ${
            isUser
              ? 'rounded-tr-none bg-gradient-to-tr from-indigo-600 to-sky-600 text-white shadow-indigo-950/25'
              : message.type === 'error' || message.type === 'database_error'
              ? 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-tl-none'
              : 'bg-card-bg/90 border border-card-border text-foreground rounded-tl-none'
          }`}
        >
          {/* Text Content */}
          <div className="whitespace-pre-wrap">{message.content}</div>

          {/* Typing Indicator */}
          {message.content === '' && (
            <div className="py-1">
              <div className="typing-dots">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}

          {/* Clarification Options */}
          {message.type === 'clarification' && message.options && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-text-muted font-medium mb-1 flex items-center gap-1">
                <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                Select one of the queries below:
              </p>
              {message.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => onSelectOption?.(opt)}
                  className="w-full rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-left text-xs text-sky-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-500/20 hover:text-white hover:shadow-sky-950/20 active:scale-[0.98]"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Error Details */}
          {(message.type === 'error' || message.type === 'database_error') && (
            <div className="mt-2 text-xs opacity-80 flex items-center gap-1 text-red-400 font-mono">
              <AlertTriangle size={12} />
              {message.type === 'error' ? 'Security Shield Active' : 'Execution Failed'}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className={`text-[10px] text-text-muted ${isUser ? 'text-right' : 'text-left'} px-1`}>
          {time}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground shadow-sm">
          <User size={18} />
        </div>
      )}
    </div>
  );
}
