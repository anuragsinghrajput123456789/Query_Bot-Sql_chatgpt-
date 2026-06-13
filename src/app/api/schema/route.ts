import { NextRequest, NextResponse } from 'next/server';
import { getDbSchema, runReadOnlyQuery } from '@/lib/db/sqlite';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const schema = await getDbSchema();

    // Fetch table names dynamically from sqlite_master
    const tableRows = await runReadOnlyQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('query_history', 'app_users')"
    );
    const tables = tableRows.map((row) => row.name as string);
    
    const metrics: { table: string; count: number }[] = [];

    for (const table of tables) {
      try {
        const countRes = await runReadOnlyQuery(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = Number(countRes[0]?.count || 0);
        metrics.push({ table, count });
      } catch {
        metrics.push({ table, count: 0 });
      }
    }

    return NextResponse.json({
      success: true,
      schema,
      metrics,
      isAiConfigured: !!process.env.GEMINI_API_KEY,
    });
  } catch (error) {
    console.error('Schema API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
