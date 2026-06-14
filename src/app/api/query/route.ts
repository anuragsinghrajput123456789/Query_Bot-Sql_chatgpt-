import { NextRequest, NextResponse } from 'next/server';
import { getDbSchema, runReadOnlyQuery, runReadWriteQuery, saveHistory } from '@/lib/db/sqlite';
import { generateSqlAndExplanation, generateBusinessInsights } from '@/lib/ai/gemini';
import { validateSqlQuery } from '@/lib/security/safety';
import { getSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    const userId = session ? session.userId : null;
    const isAdmin = session ? session.role === 'admin' : false;

    const body = await req.json();
    const { question, sqlQuery } = body;

    if (sqlQuery) {
      if (!isAdmin) {
        const validation = validateSqlQuery(sqlQuery);
        if (!validation.safe) {
          return NextResponse.json({
            success: false,
            error: `Security Shield blocked this query: ${validation.error}`,
          });
        }
      }
      let rows: Record<string, unknown>[] = [];
      try {
        if (isAdmin) {
          rows = await runReadWriteQuery(sqlQuery);
        } else {
          rows = await runReadOnlyQuery(sqlQuery);
        }
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: (err as Error).message,
        });
      }
      return NextResponse.json({
        success: true,
        rows,
      });
    }

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

    // 3. We have a generated SQL query - validate its security if user is not admin
    const sql = aiResult.sql;
    if (!sql) {
      return NextResponse.json({
        success: true,
        type: 'error',
        errorMessage: 'Gemini generated an empty SQL statement.',
      });
    }


    if (!isAdmin) {
      const validation = validateSqlQuery(sql);
      if (!validation.safe) {
        return NextResponse.json({
          success: true,
          type: 'error',
          sql,
          explanation: aiResult.explanation,
          sqlExplanation: aiResult.sqlExplanation,
          errorMessage: `Security Shield blocked this query: ${validation.error}`,
        });
      }
    }

    // 4. Run the query safely based on role and measure execution time
    const start = process.hrtime();
    let rows: Record<string, unknown>[] = [];
    let queryError: string | null = null;

    try {
      if (isAdmin) {
        rows = await runReadWriteQuery(sql);
      } else {
        rows = await runReadOnlyQuery(sql);
      }
    } catch (sqlErr) {
      queryError = (sqlErr as Error).message;
    }
    
    const diff = process.hrtime(start);
    const executionTimeMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6); // Convert nanoseconds to milliseconds

    const rowsCount = rows ? rows.length : 0;

    // 5. Save successfully executed queries (or attempted ones) to history
    try {
      await saveHistory(
        question.trim(),
        sql,
        executionTimeMs,
        queryError ? 0 : rowsCount,
        userId
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
      sqlExplanation: aiResult.sqlExplanation,
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
