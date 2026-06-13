import { NextRequest, NextResponse } from 'next/server';
import { AuthenticatedUser } from '@/types';

export const SESSION_COOKIE_NAME = 'nfqgpt_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload extends AuthenticatedUser {
  exp: number;
}

function getAuthSecret() {
  return process.env.AUTH_SECRET || 'dev-auth-secret-change-me';
}

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function signValue(value: string) {
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getAuthSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(value));
  return bytesToHex(new Uint8Array(signature));
}

export async function createSessionToken(user: AuthenticatedUser) {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const serializedPayload = JSON.stringify(payload);
  const signature = await signValue(serializedPayload);
  return `${encodeURIComponent(serializedPayload)}.${signature}`;
}

export async function verifySessionToken(token?: string | null): Promise<AuthenticatedUser | null> {
  if (!token) return null;

  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex <= 0) return null;

  const payloadPart = token.slice(0, separatorIndex);
  const signaturePart = token.slice(separatorIndex + 1);

  let serializedPayload = '';
  try {
    serializedPayload = decodeURIComponent(payloadPart);
  } catch {
    return null;
  }

  const expectedSignature = await signValue(serializedPayload);
  if (!safeCompare(signaturePart, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(serializedPayload) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return {
      userId: payload.userId,
      name: payload.name,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function applySessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
