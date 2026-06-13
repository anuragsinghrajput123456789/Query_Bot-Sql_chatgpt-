import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/db/sqlite';
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

    const history = await getHistory(session.userId, 25);
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
