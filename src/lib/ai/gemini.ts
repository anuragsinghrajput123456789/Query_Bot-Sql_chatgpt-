import { GoogleGenAI } from '@google/genai';
import { BusinessInsights } from '@/types';

export interface GeminiResponse {
  type: 'sql' | 'clarification' | 'error';
  sql: string | null;
  explanation: string | null;
  sqlExplanation?: {
    tablesUsed: string[];
    joinExplanation: string;
    businessExplanation: string;
  } | null;
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
 * Transcribe natural language (English/Hinglish/Hindi) questions into safe SQL and explanations
 * using the database schema dynamically fetched from SQLite.
 */
export async function generateSqlAndExplanation(
  question: string,
  schema: string
): Promise<GeminiResponse> {
  const ai = getAiClient();

  const systemInstruction = `
You are an expert AI Assistant and SQL Translator for SQLite.
Your job is to translate user questions in English, Hindi, or Hinglish into a read-only SQLite SELECT statement based on the provided DATABASE SCHEMA.

DATABASE SCHEMA:
${schema}

CURRENT DATE/TIME CONTEXT:
The current reference date is 2026-06-11 (YYYY-MM-DD). Use this specific reference date (2026-06-11) as the current time to resolve questions referencing relative times (e.g. "last week", "yesterday", "last month", "this year", "last 30 days").
- "last week" means 2026-06-04 to 2026-06-10.
- "yesterday" means 2026-06-10.
- "last month" means May 2026 (i.e. '2026-05-01' to '2026-05-31').
- "last 30 days" means from '2026-05-12' to '2026-06-11'.

INSTRUCTIONS:
1. NATURAL LANGUAGE FILTERS:
   Understand filters like "yesterday", "Delhi users", "premium female users", "highest revenue", "top customers" without requiring SQL syntax and translate them to SQLite queries.
   - "premium female users" means users who have a subscription that is active (from subscriptions where status='active') and users who are Female.
   - "highest revenue" or "top customers" means sorting by payments amount_inr descending.

2. MULTILANGUAGE & HINGLISH SUPPORT:
   Understand mixed Hindi-English (Hinglish), pure Hindi, or pure English naturally. E.g.:
   - "Delhi ke users dikhao" -> SELECT * FROM users WHERE city = 'Delhi'
   - "kal kitne payment verify huye" -> SELECT COUNT(*) FROM payments WHERE status = 'success' AND date(created_at) = '2026-06-10'

3. CLARIFICATION DETECTION:
   If the user query is highly ambiguous, generic, or incomplete (e.g., "show users", "show report", "last report dikhao", "revenue list"), set "type" to "clarification" and return exactly 3 options in "options" that clarify what data they want.

4. SQL GENERATION & EXPLANATION:
   If the query is clear and can be translated to a SELECT statement:
   - Formulate a clean, correct, and optimized SQLite SELECT statement.
   - Set "type" to "sql".
   - Set "sql" to the SQL string.
   - Set "explanation" to a clear, concise paragraph explaining what the query does in plain English.
   - Set "sqlExplanation" to an object containing:
     - "tablesUsed": Array of table names used.
     - "joinExplanation": A simple description of how tables are joined (or "None" if no joins).
     - "businessExplanation": A non-technical explanation of the query's business value.

5. SAFETY BLOCK:
   - You must NEVER generate queries that modify the database (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, etc.). If requested, set "type" to "error" and set "errorMessage".

OUTPUT FORMAT:
You must respond with a JSON object containing:
{
  "type": "sql" | "clarification" | "error",
  "sql": "SELECT ... " (or null),
  "explanation": "This query retrieves ... " (or null),
  "sqlExplanation": {
    "tablesUsed": ["users"],
    "joinExplanation": "Joined users and payments on user_id",
    "businessExplanation": "Displays the total registered users from Delhi"
  } (or null),
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



export async function generateBusinessInsights(
  question: string,
  sql: string,
  rows: Record<string, unknown>[]
): Promise<BusinessInsights> {
  const ai = getAiClient();
  
  // Truncate rows to keep context window compact and fast
  const sampleRows = rows.slice(0, 30);
  
  const systemInstruction = `
You are a business intelligence expert, startup founder, and product designer. Your job is to analyze the query results of an SQLite query and provide:
1. A concise business summary (1-2 sentences) of what the data shows.
2. A list of 2-3 key insights or trends.
3. A list of anomalies, warnings, or patterns (e.g., failed payments, spikes in support tickets, outlier values). If none, return an empty array.
4. **AI Storytelling**: A narrative, human-like story of the results instead of raw data. E.g., "Registrations increased steadily throughout the week with a significant spike from Delhi on Friday."
5. **Decision Assistant Mode**:
   - "businessImpact": A concise statement of the business impact of this data (positive growth, risk warnings, etc.).
   - "risks": A list of 1-2 key risks identified from the data (e.g. "Refund rate spiked by 7%").
   - "opportunities": A list of 1-2 opportunities (e.g. "Scale Srinagar marketing due to high conversion").
   - "recommendedActions": A list of 2-3 recommended actions based on the insights.
   - "confidenceScore": A confidence percentage (0-100) based on data size, consistency, and completeness.
   - "followUpQuestions": A list of 3-4 smart follow-up suggestions (e.g. "Compare Srinagar with Delhi", "Find root cause of payment failure", "Forecast next month's subscriptions").
6. **Auto Chart Selection**: Choose EXACTLY one of: "kpi", "table", "bar", "line", "pie", "area", "heatmap", or "none".
   - "kpi": Best when query returns a single numerical metric/stat (e.g. count of users, total revenue, average age).
   - "table": Best for high-cardinality strings, profiles, lists, or multi-column detailed data.
   - "line": Best for sequential trends over dates/time.
   - "area": Best for cumulative totals or volume trends over dates/time.
   - "pie": Best for parts-of-a-whole categorical splits where categories are <= 8.
   - "bar": Best for comparing quantities across discrete categories (e.g. user counts by city/profession).
   - "heatmap": Best for cross-tabulations or dense comparison matrices (e.g. cities vs sect counts).
   - "none": If not chartable.
7. A "chartConfig" mapping if a chart is recommended (i.e. not "none" or "kpi" or "table"):
   - "xAxisKey": The exact property/column name from the data to use as the X-axis label.
   - "yAxisKey": The exact property/column name from the data representing the numerical Y-axis value.

Output MUST be a JSON object matching this structure:
{
  "summary": "string describing the overall result",
  "insights": ["insight line 1", "insight line 2"],
  "anomalies": ["anomaly 1"],
  "storytelling": "A narrative story...",
  "businessImpact": "The impact...",
  "risks": ["risk 1"],
  "opportunities": ["opportunity 1"],
  "recommendedActions": ["action 1"],
  "confidenceScore": 85,
  "followUpQuestions": ["question 1"],
  "recommendedChart": "bar" | "line" | "pie" | "area" | "heatmap" | "kpi" | "table" | "none",
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
          recommendedChart: ['bar', 'line', 'pie', 'area', 'heatmap', 'kpi', 'table', 'none'].includes(parsed.recommendedChart)
            ? parsed.recommendedChart
            : 'none',
          chartConfig: parsed.chartConfig && typeof parsed.chartConfig === 'object'
            ? {
                xAxisKey: String(parsed.chartConfig.xAxisKey || ''),
                yAxisKey: String(parsed.chartConfig.yAxisKey || ''),
              }
            : undefined,
          businessImpact: parsed.businessImpact || '',
          risks: Array.isArray(parsed.risks) ? parsed.risks : [],
          opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
          recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
          confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 90,
          followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
          storytelling: parsed.storytelling || '',
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
