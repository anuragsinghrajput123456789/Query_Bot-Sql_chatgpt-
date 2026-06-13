import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/db/sqlite';

export async function GET() {
  try {
    const history = await getHistory(25);
    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('History API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
