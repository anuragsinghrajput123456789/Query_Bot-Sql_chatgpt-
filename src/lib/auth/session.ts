import { NextRequest } from 'next/server';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'query_bot_super_secret_key_change_me_123456';

export interface SessionPayload {
  userId: number;
  username: string;
  role: 'user' | 'admin';
}

// Session signing/encryption
export function encryptSession(payload: SessionPayload): string {
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64') + '.' + signature;
}

export function decryptSession(sessionStr: string): SessionPayload | null {
  try {
    const [dataBase64, signature] = sessionStr.split('.');
    if (!dataBase64 || !signature) return null;
    const data = Buffer.from(dataBase64, 'base64').toString('utf8');
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    if (signature !== expectedSignature) return null;
    return JSON.parse(data) as SessionPayload;
  } catch {
    return null;
  }
}

export function getSession(req: NextRequest): SessionPayload | null {
  const sessionCookie = req.cookies.get('session');
  if (!sessionCookie) return null;
  return decryptSession(sessionCookie.value);
}

// Password hashing using pbkdf2
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  const salt = parts[0];
  const hash = parts[1];
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}
