import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, applySessionCookie } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { createUser, getUserByEmail } from '@/lib/auth/users';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const user = await createUser({
      name,
      email,
      passwordHash: hashPassword(password),
    });

    const response = NextResponse.json({
      success: true,
      user,
    });

    applySessionCookie(response, await createSessionToken(user));
    return response;
  } catch (error) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to create your account right now.' },
      { status: 500 }
    );
  }
}
