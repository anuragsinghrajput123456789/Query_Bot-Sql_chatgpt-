import sqlite3 from 'sqlite3';
import { AuthenticatedUser } from '@/types';
import { openReadWriteDb } from '@/lib/db/sqlite';

interface UserRecord extends AuthenticatedUser {
  password_hash: string;
  created_at: string;
}

function runStatement(db: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<{ lastID: number; changes: number }>((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        lastID: this.lastID,
        changes: this.changes,
      });
    });
  });
}

function getRow<T>(db: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row as T | undefined);
    });
  });
}

async function ensureUsersTable(db: sqlite3.Database) {
  await runStatement(
    db,
    `CREATE TABLE IF NOT EXISTS app_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toPublicUser(user: Pick<UserRecord, 'id' | 'name' | 'email'>): AuthenticatedUser {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
  };
}

export async function getUserByEmail(email: string) {
  const db = await openReadWriteDb();

  try {
    await ensureUsersTable(db);
    const row = await getRow<UserRecord>(
      db,
      'SELECT id, name, email, password_hash, created_at FROM app_users WHERE email = ? LIMIT 1',
      [normalizeEmail(email)]
    );
    return row || null;
  } finally {
    db.close();
  }
}

export async function createUser(params: { name: string; email: string; passwordHash: string }) {
  const db = await openReadWriteDb();

  try {
    await ensureUsersTable(db);
    const createdAt = new Date().toISOString();
    const insertResult = await runStatement(
      db,
      'INSERT INTO app_users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [params.name.trim(), normalizeEmail(params.email), params.passwordHash, createdAt]
    );

    return {
      userId: insertResult.lastID,
      name: params.name.trim(),
      email: normalizeEmail(params.email),
    } satisfies AuthenticatedUser;
  } finally {
    db.close();
  }
}

export async function getAuthenticatedUserByEmail(email: string) {
  const user = await getUserByEmail(email);
  if (!user) return null;
  return toPublicUser(user);
}
