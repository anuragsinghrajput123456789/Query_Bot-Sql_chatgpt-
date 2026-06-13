import { NextResponse } from 'next/server';
import { getDbSchema, runReadOnlyQuery } from '@/lib/db/sqlite';

export async function GET() {
  try {
    const schema = await getDbSchema();

    // Fetch table names dynamically from sqlite_master
    const tableRows = await runReadOnlyQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'query_history'"
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
