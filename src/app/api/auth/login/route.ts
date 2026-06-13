import { NextRequest, NextResponse } from 'next/server';
import { applySessionCookie, createSessionToken } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { getUserByEmail } from '@/lib/auth/users';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const publicUser = {
      userId: user.id,
      name: user.name,
      email: user.email,
    };

    const response = NextResponse.json({
      success: true,
      user: publicUser,
    });

    applySessionCookie(response, await createSessionToken(publicUser));
    return response;
  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to log in right now.' },
      { status: 500 }
    );
  }
}
