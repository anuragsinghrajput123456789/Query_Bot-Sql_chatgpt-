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
      'GROUP BY', 'ORDER BY', 'LIMIT', 'SUM', 'COUNT', 'AVG', 'MIN', 'MAX',
      'AND', 'OR', 'DESC', 'ASC', 'AS', 'IN', 'LIKE', 'NULL', 'IS'
    ];
    
    let html = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Color string literals
    html = html.replace(/('[^']*')/g, '<span class="text-emerald-400 font-medium">$1</span>');

    // Color numbers
    html = html.replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>');

    // Color keywords (with word boundaries)
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      html = html.replace(regex, `<span class="text-indigo-400 font-bold">$1</span>`);
    });

    return html;
  };

  return (
    <div className="flex flex-col bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-muted bg-white/2">
        <div className="flex items-center gap-2">
          <Code size={16} className="text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Generated SQLite Query</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-foreground hover:text-white transition-all duration-200 active:scale-95"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
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
      <div className="p-4 bg-background/50 font-mono text-xs overflow-x-auto border-b border-border-muted max-h-40 min-h-[3.5rem] leading-relaxed">
        <pre className="whitespace-pre">
          <code dangerouslySetInnerHTML={{ __html: highlightSql(sql) }} />
        </pre>
      </div>

      {/* Execution Stats Footer */}
      {(executionTimeMs !== undefined || rowsCount !== undefined) && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-white/1 text-[11px] text-text-muted">
          {executionTimeMs !== undefined && (
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-indigo-400" />
              <span>Query Time: <strong className="text-foreground">{executionTimeMs} ms</strong></span>
            </div>
          )}
          {rowsCount !== undefined && (
            <div className="flex items-center gap-1 border-l border-white/10 pl-4">
              <Database size={12} className="text-indigo-400" />
              <span>Rows Returned: <strong className="text-foreground">{rowsCount}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
