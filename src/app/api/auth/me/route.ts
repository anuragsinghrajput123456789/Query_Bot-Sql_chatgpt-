import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: true, user: null });
    }
    return NextResponse.json({
      success: true,
      user: {
        id: session.userId,
        username: session.username,
        role: session.role
      }
    });
  } catch (error) {
    console.error('Session retrieve error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
