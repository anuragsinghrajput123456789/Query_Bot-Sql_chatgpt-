import { NextRequest, NextResponse } from 'next/server';
import { getDbSchema, runReadOnlyQuery, saveHistory } from '@/lib/db/sqlite';
import { generateSqlAndExplanation, generateBusinessInsights } from '@/lib/ai/gemini';
import { validateSqlQuery } from '@/lib/security/safety';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { question } = body;

    if (!question || typeof question !== 'string' || question.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Question parameter is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch current database schema dynamically
    let schema: string;
    try {
      schema = await getDbSchema();
    } catch (dbErr) {
      console.error('Failed to retrieve db schema:', dbErr);
      return NextResponse.json(
        { success: false, error: 'Database is not initialized or seeded.' },
        { status: 500 }
      );
    }

    // 2. Call Gemini AI to translate question
    let aiResult;
    try {
      aiResult = await generateSqlAndExplanation(question.trim(), schema);
    } catch (aiErr) {
      console.error('Gemini generation critical crash:', aiErr);
      return NextResponse.json({
        success: true,
        type: 'error',
        errorMessage: `AI service encountered an unexpected error: ${(aiErr as Error).message}`,
      });
    }

    if (aiResult.type === 'error') {
      return NextResponse.json({
        success: true,
        type: 'error',
        errorMessage: aiResult.errorMessage || 'AI was unable to process this request.',
      });
    }

    if (aiResult.type === 'clarification') {
      return NextResponse.json({
        success: true,
        type: 'clarification',
        options: aiResult.options || [],
      });
    }

    // 3. We have a generated SQL query - validate its security
    const sql = aiResult.sql;
    if (!sql) {
      return NextResponse.json({
        success: true,
        type: 'error',
        errorMessage: 'Gemini generated an empty SQL statement.',
      });
    }

    const validation = validateSqlQuery(sql);
    if (!validation.safe) {
      return NextResponse.json({
        success: true,
        type: 'error',
        sql,
        explanation: aiResult.explanation,
        errorMessage: `Security Shield blocked this query: ${validation.error}`,
      });
    }

    // 4. Run the query safely in read-only mode and measure execution time
    const start = process.hrtime();
    let rows: Record<string, unknown>[] = [];
    let queryError: string | null = null;

    try {
      rows = await runReadOnlyQuery(sql);
    } catch (sqlErr) {
      queryError = (sqlErr as Error).message;
    }
    
    const diff = process.hrtime(start);
    const executionTimeMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6); // Convert nanoseconds to milliseconds

    const rowsCount = rows ? rows.length : 0;

    // 5. Save successfully executed queries (or attempted ones) to history
    // We log it even if SQLite threw a query error (e.g. column not found), so that users can review the history.
    try {
      await saveHistory(
        session.userId,
        question.trim(),
        sql,
        executionTimeMs,
        queryError ? 0 : rowsCount
      );
    } catch (historyErr) {
      console.warn('Failed to save to history logs:', historyErr);
    }

    if (queryError) {
      return NextResponse.json({
        success: true,
        type: 'database_error',
        sql,
        explanation: aiResult.explanation,
        errorMessage: `SQLite Error: ${queryError}`,
        executionTimeMs,
      });
    }

    let insights = null;
    if (rowsCount > 0) {
      try {
        insights = await generateBusinessInsights(question.trim(), sql, rows);
      } catch (insErr) {
        console.error('Business insights generation failed:', insErr);
      }
    }

    return NextResponse.json({
      success: true,
      type: 'sql',
      sql,
      explanation: aiResult.explanation,
      rows,
      executionTimeMs,
      rowsCount,
      insights,
    });
  } catch (error) {
    console.error('Query execution route crash:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
