import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, createUser } from '@/lib/db/sqlite';
import { hashPassword, encryptSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, role } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByUsername(cleanUsername);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username is already taken.' },
        { status: 400 }
      );
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const passwordHash = hashPassword(password);
    const userId = await createUser(cleanUsername, passwordHash, assignedRole);

    const payload = { userId, username: cleanUsername, role: assignedRole as 'user' | 'admin' };
    const token = encryptSession(payload);

    const response = NextResponse.json({
      success: true,
      user: { id: userId, username: cleanUsername, role: assignedRole }
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
    console.error('Signup Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
