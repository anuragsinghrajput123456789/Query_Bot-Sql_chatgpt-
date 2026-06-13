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
}

export interface BusinessInsights {
  summary: string;
  insights: string[];
  anomalies: string[];
  recommendedChart: 'bar' | 'line' | 'pie' | 'none';
  chartConfig?: {
    xAxisKey: string;
    yAxisKey: string;
  };
}

export interface HistoryItem {
  id: number;
  question: string;
  sql_query: string;
  execution_time_ms: number;
  rows_returned: number;
  timestamp: string;
}

export interface DbMetric {
  table: string;
  count: number;
}
