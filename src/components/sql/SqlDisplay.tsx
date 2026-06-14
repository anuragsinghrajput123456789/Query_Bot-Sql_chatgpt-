'use client';

import React, { useState } from 'react';
import { Copy, Check, Code, Clock, Database } from 'lucide-react';

interface SqlDisplayProps {
  sql: string;
  executionTimeMs?: number;
  rowsCount?: number;
}

export default function SqlDisplay({ sql, executionTimeMs, rowsCount }: SqlDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Custom regex highlighter for SQLite keywords
  const highlightSql = (code: string) => {
    if (!code) return '';
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON',
      'GROUP BY', 'ORDER BY', 'LIMIT', 'AND', 'OR', 'DESC', 'ASC', 'AS', 
      'IN', 'LIKE', 'NULL', 'IS'
    ];
    const functions = [
      'SUM', 'COUNT', 'AVG', 'MIN', 'MAX'
    ];
    
    let html = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Color string literals: Emerald (#10b981)
    html = html.replace(/('[^']*')/g, '<span class="text-accent-green font-medium">$1</span>');

    // Color numbers
    html = html.replace(/\b(\d+)\b/g, '<span class="text-amber-400 font-mono">$1</span>');

    // Color functions: Indigo (#6366f1)
    functions.forEach((func) => {
      const regex = new RegExp(`\\b(${func})\\b`, 'gi');
      html = html.replace(regex, `<span class="text-accent-secondary font-semibold">$1</span>`);
    });

    // Color keywords: Cyan (#00f2ff)
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      html = html.replace(regex, `<span class="text-accent font-bold">$1</span>`);
    });

    return html;
  };

  return (
    <div className="flex flex-col bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-lg backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-muted bg-white/2">
        <div className="flex items-center gap-2">
          <Code size={16} className="text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Generated SQLite Query</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white/5 border border-white/5 hover:border-accent/30 hover:bg-accent/5 text-foreground hover:text-white transition-all duration-200 active:scale-95 cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={12} className="text-accent-green" />
              <span className="text-accent-green">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy SQL</span>
            </>
          )}
        </button>
      </div>

      {/* Code Display */}
      <div className="p-4 bg-background/30 font-mono text-xs overflow-x-auto border-b border-border-muted max-h-40 min-h-[3.5rem] leading-relaxed">
        <pre className="whitespace-pre">
          <code dangerouslySetInnerHTML={{ __html: highlightSql(sql) }} />
        </pre>
      </div>

      {/* Execution Stats Footer */}
      {(executionTimeMs !== undefined || rowsCount !== undefined) && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-white/1 text-[11px] text-text-muted select-none">
          {executionTimeMs !== undefined && (
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-accent-secondary" />
              <span>Query Time: <strong className="text-foreground">{executionTimeMs} ms</strong></span>
            </div>
          )}
          {rowsCount !== undefined && (
            <div className="flex items-center gap-1 border-l border-white/10 pl-4">
              <Database size={12} className="text-accent" />
              <span>Rows Returned: <strong className="text-foreground">{rowsCount}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
