export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'sql' | 'clarification' | 'error' | 'database_error';
  sql?: string | null;
  explanation?: string | null;
  options?: string[] | null;
  rows?: Record<string, unknown>[] | null;
  executionTimeMs?: number;
  rowsCount?: number;
  insights?: BusinessInsights | null;
  sqlExplanation?: {
    tablesUsed: string[];
    joinExplanation: string;
    businessExplanation: string;
  } | null;
}

export interface BusinessInsights {
  summary: string;
  insights: string[];
  anomalies: string[];
  recommendedChart: 'bar' | 'line' | 'pie' | 'area' | 'heatmap' | 'kpi' | 'table' | 'none';
  chartConfig?: {
    xAxisKey: string;
    yAxisKey: string;
  };
  businessImpact?: string;
  risks?: string[];
  opportunities?: string[];
  recommendedActions?: string[];
  confidenceScore?: number;
  followUpQuestions?: string[];
  storytelling?: string;
}

export interface HistoryItem {
  id: number;
  question: string;
  sql_query: string;
  execution_time_ms: number;
  rows_returned: number;
  timestamp: string;
  username?: string;
  is_favorite?: number;
}

export interface DbMetric {
  table: string;
  count: number;
}
