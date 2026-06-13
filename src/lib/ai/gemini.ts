import { GoogleGenAI } from '@google/genai';

export interface GeminiResponse {
  type: 'sql' | 'clarification' | 'error';
  sql: string | null;
  explanation: string | null;
  options: string[] | null;
  errorMessage: string | null;
}

// Ordered list of models to try — if the primary is overloaded, we fall back
const MODEL_PRIORITY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500; // 1.5s, 3s, 6s exponential backoff

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set in env files.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a retryable server-side error (429, 500, 503)
 */
function isRetryableError(error: unknown): boolean {
  const msg = String((error as Error)?.message || error || '');
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('500') ||
    msg.includes('INTERNAL') ||
    msg.includes('overloaded') ||
    msg.includes('high demand')
  );
}

/**
 * Attempt a single Gemini API call for a given model name
 */
async function tryGenerateContent(
  ai: GoogleGenAI,
  modelName: string,
  question: string,
  systemInstruction: string
): Promise<GeminiResponse> {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: question,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Received empty response from Gemini API.');
  }

  return JSON.parse(text) as GeminiResponse;
}

/**
 * Transcribe natural language (English/Hinglish) questions into safe SQL and explanations
 * using the database schema dynamically fetched from SQLite.
 *
 * Implements:
 * - Exponential backoff retry (up to 3 attempts per model)
 * - Automatic fallback to alternative Gemini models when the primary is overloaded
 */
export async function generateSqlAndExplanation(
  question: string,
  schema: string
): Promise<GeminiResponse> {
  const ai = getAiClient();

  const systemInstruction = `
You are an expert AI Assistant and SQL Translator for SQLite.
Your job is to translate user questions in English or Hinglish into a read-only SQLite SELECT statement based on the provided DATABASE SCHEMA.

DATABASE SCHEMA:
${schema}

CURRENT DATE/TIME CONTEXT:
The current reference date is 2026-06-11 (YYYY-MM-DD). Use this specific reference date (2026-06-11) as the current time to resolve questions referencing relative times (e.g. "last month", "this year", "last 30 days").
- "last month" means May 2026 (i.e. '2026-05-01' to '2026-05-31').
- "last 30 days" means from '2026-05-12' to '2026-06-11'.
- "last month ka revenue" means: SELECT SUM(amount_inr) FROM payments WHERE status = 'success' AND created_at BETWEEN '2026-05-01 00:00:00' AND '2026-05-31 23:59:59'

EXAMPLES & TRANSLATIONS:
- "Srinagar se female users dikhao" -> SELECT * FROM users WHERE city = 'Srinagar' AND gender = 'Female'
- "Average annual income by profession" -> SELECT profession, AVG(annual_income_inr) as avg_income FROM users WHERE annual_income_inr IS NOT NULL GROUP BY profession ORDER BY avg_income DESC
- "most popular plan" -> SELECT p.plan_name, COUNT(s.subscription_id) as subscriber_count FROM plans p JOIN subscriptions s ON p.plan_id = s.plan_id GROUP BY p.plan_name ORDER BY subscriber_count DESC LIMIT 1
- "total verified users" -> SELECT COUNT(*) FROM users WHERE is_verified = 1

INSTRUCTIONS:
1. CLARIFICATION DETECTION:
   If the user query is highly ambiguous, generic, or incomplete (e.g., "show users", "show report", "last report dikhao", "revenue list", "payments"), set "type" to "clarification" and return exactly 3 options in "options" that clarify what data they want.
   Example options: ["Show all active users", "Total revenue from subscriptions", "Most common support ticket categories"].

2. SQL GENERATION:
   If the query is clear and can be translated to a SELECT statement:
   - Formulate a clean, correct, and optimized SQLite SELECT statement.
   - Use correct table names and join conditions as per the schema.
   - Set "type" to "sql".
   - Set "sql" to the SQL string.
   - Set "explanation" to a clear, concise paragraph explaining what the query does in plain English.
   - Support English and Hinglish (e.g. "total verified users kitne hain" -> "SELECT COUNT(*) FROM users WHERE is_verified = 1").

3. SAFETY BLOCK:
   - You must NEVER generate queries that modify the database: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, PRAGMA, ATTACH, DETACH, VACUUM, REPLACE, RENAME.
   - If the user asks you to modify data or perform administrative tasks, set "type" to "error" and set "errorMessage" to a helpful, friendly message stating that only SELECT queries are permitted for safety.

OUTPUT FORMAT:
You must respond with a JSON object containing:
{
  "type": "sql" | "clarification" | "error",
  "sql": "SELECT ... " (or null),
  "explanation": "This query retrieves ... " (or null),
  "options": ["Option 1", "Option 2", "Option 3"] (or null),
  "errorMessage": "Safety block: Only select queries are allowed." (or null)
}
`;

  // Try each model in priority order
  for (let modelIdx = 0; modelIdx < MODEL_PRIORITY.length; modelIdx++) {
    const modelName = MODEL_PRIORITY[modelIdx];

    // Retry loop with exponential backoff for each model
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Gemini] Attempt ${attempt}/${MAX_RETRIES} using model "${modelName}"...`);
        const result = await tryGenerateContent(ai, modelName, question, systemInstruction);
        console.log(`[Gemini] Success with model "${modelName}" on attempt ${attempt}.`);
        return result;
      } catch (error) {
        const errMsg = (error as Error).message || String(error);
        console.warn(`[Gemini] Model "${modelName}" attempt ${attempt} failed: ${errMsg}`);

        if (isRetryableError(error)) {
          // If we still have retries left for this model, wait and retry
          if (attempt < MAX_RETRIES) {
            const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 1.5s, 3s, 6s
            console.log(`[Gemini] Retrying in ${delayMs}ms...`);
            await sleep(delayMs);
            continue;
          }
          // Exhausted retries for this model — fall through to try the next model
          console.warn(`[Gemini] Exhausted ${MAX_RETRIES} retries for "${modelName}". Trying next model...`);
          break;
        } else {
          // Non-retryable error (bad API key, invalid request, etc.) — fail immediately
          return {
            type: 'error',
            sql: null,
            explanation: null,
            options: null,
            errorMessage: `AI Processing failed: ${errMsg}`,
          };
        }
      }
    }
  }

  // All models and retries exhausted
  return {
    type: 'error',
    sql: null,
    explanation: null,
    options: null,
    errorMessage:
      'All AI models are currently experiencing high demand. Please wait a minute and try again. ' +
      'This is a temporary issue on Google\'s side.',
  };
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

export async function generateBusinessInsights(
  question: string,
  sql: string,
  rows: Record<string, unknown>[]
): Promise<BusinessInsights> {
  const ai = getAiClient();
  
  // Truncate rows to keep context window compact and fast
  const sampleRows = rows.slice(0, 30);
  
  const systemInstruction = `
You are a business intelligence expert. Your job is to analyze the query results of an SQL query and provide:
1. A concise business summary (1-2 sentences) of what the data shows.
2. A list of 2-3 key insights or trends.
3. A list of anomalies, warnings, or patterns (e.g., missing fields, outlier values), or an empty list if none are found.
4. The recommended chart type to visualize this dataset. Choose EXACTLY one of: "bar", "line", "pie", or "none".
   Guidelines for chart recommendation:
   - "line": Best for sequential data over time/dates (e.g., count/sum by day/month/year).
   - "pie": Best for parts-of-a-whole/categorical distributions where categories are small (<= 8 slices). e.g., gender distribution, plan subscription splits.
   - "bar": Best for comparing quantities across discrete categories (e.g. sales by city, count of users by age group).
   - "none": If the data is text-only, single row with no numeric comparisons, or too complex to plot.
5. A "chartConfig" mapping if a chart is recommended (i.e. not "none"):
   - "xAxisKey": The exact property/column name from the data to use as the label/X-axis.
   - "yAxisKey": The exact property/column name from the data representing the numerical value/Y-axis.

Output MUST be a JSON object matching this structure:
{
  "summary": "string describing the overall result",
  "insights": ["insight line 1", "insight line 2"],
  "anomalies": ["anomaly 1" or none],
  "recommendedChart": "bar" | "line" | "pie" | "none",
  "chartConfig": {
    "xAxisKey": "name_of_col",
    "yAxisKey": "name_of_numeric_col"
  }
}
`;

  const prompt = `
User Question: "${question}"
Executed SQL: "${sql}"
Returned Rows (Sample of first 30 rows out of ${rows.length} total rows):
${JSON.stringify(sampleRows, null, 2)}
`;

  // Try each model in priority order
  for (let modelIdx = 0; modelIdx < MODEL_PRIORITY.length; modelIdx++) {
    const modelName = MODEL_PRIORITY[modelIdx];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error('Received empty response from Gemini API for insights.');
        }

        const parsed = JSON.parse(text);
        return {
          summary: parsed.summary || 'No summary available.',
          insights: Array.isArray(parsed.insights) ? parsed.insights : [],
          anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies : [],
          recommendedChart: ['bar', 'line', 'pie', 'none'].includes(parsed.recommendedChart)
            ? parsed.recommendedChart
            : 'none',
          chartConfig: parsed.chartConfig && typeof parsed.chartConfig === 'object'
            ? {
                xAxisKey: String(parsed.chartConfig.xAxisKey || ''),
                yAxisKey: String(parsed.chartConfig.yAxisKey || ''),
              }
            : undefined
        };
      } catch (error) {
        console.warn(`[Gemini-Insights] Model "${modelName}" attempt ${attempt} failed:`, error);
        if (isRetryableError(error)) {
          if (attempt < MAX_RETRIES) {
            await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
            continue;
          }
          break;
        } else {
          // Non-retryable
          break;
        }
      }
    }
  }

  // Fallback insights if all models fail
  return {
    summary: 'Failed to automatically generate AI business summary for these query results.',
    insights: [],
    anomalies: [],
    recommendedChart: 'none',
  };
}
