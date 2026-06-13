import React from 'react';
import { Info } from 'lucide-react';

interface ExplanationProps {
  explanation: string;
}

export default function Explanation({ explanation }: ExplanationProps) {
  if (!explanation) return null;

  return (
    <div className="flex flex-col bg-card-bg border border-card-border rounded-xl p-4 shadow-lg leading-relaxed">
      <div className="flex items-center gap-2 mb-2">
        <Info size={16} className="text-indigo-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Query Explanation</span>
      </div>
      <p className="text-xs text-text-muted">
        {explanation}
      </p>
    </div>
  );
}
