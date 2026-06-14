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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent shadow-sm shadow-accent/5">
          <Bot size={18} className="animate-icon-float" />
        </div>
      )}

      {/* Message Bubble */}
      <div className="flex max-w-[88%] flex-col gap-1 sm:max-w-[82%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-md leading-relaxed break-words ${
            isUser
              ? 'rounded-tr-none bg-gradient-to-tr from-accent-secondary to-accent text-white shadow-accent/10'
              : message.type === 'error' || message.type === 'database_error'
              ? 'bg-red-500/10 border border-red-500/25 text-red-200 rounded-tl-none font-mono text-xs'
              : 'bg-card-bg border border-card-border text-foreground rounded-tl-none backdrop-blur-md'
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
              <p className="text-xs text-text-muted font-medium mb-1 flex items-center gap-1.5 select-none">
                <Sparkles size={12} className="text-accent animate-pulse" />
                Select one of the queries below:
              </p>
              {message.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => onSelectOption?.(opt)}
                  className="w-full rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-left text-xs text-accent shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/15 hover:text-white cursor-pointer active:scale-[0.98]"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Error Details */}
          {(message.type === 'error' || message.type === 'database_error') && (
            <div className="mt-2.5 text-[10px] opacity-90 flex items-center gap-1 text-red-400 font-mono select-none">
              <AlertTriangle size={12} className="animate-bounce" />
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
