import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db/sqlite';
import { verifyPassword, encryptSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await getUserByUsername(cleanUsername);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const payload = { userId: user.id, username: user.username, role: user.role };
    const token = encryptSession(payload);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role }
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
