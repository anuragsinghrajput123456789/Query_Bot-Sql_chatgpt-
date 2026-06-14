import React from 'react';
import { Info } from 'lucide-react';

interface ExplanationProps {
  explanation: string;
}

export default function Explanation({ explanation }: ExplanationProps) {
  if (!explanation) return null;

  return (
    <div className="flex flex-col bg-card-bg border border-card-border rounded-xl p-4 shadow-lg leading-relaxed backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <Info size={16} className="text-accent" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground select-none">Query Explanation</span>
      </div>
      <p className="text-xs text-text-muted">
        {explanation}
      </p>
    </div>
  );
}
