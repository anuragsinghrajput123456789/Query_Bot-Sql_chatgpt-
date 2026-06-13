import sqlite3 from 'sqlite3';
import path from 'path';
import { HistoryItem } from '@/types';

const DB_PATH = path.resolve(process.cwd(), 'querygpt.db');
const INTERNAL_TABLES = ['query_history', 'app_users'];

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

function getAllRows<T>(db: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows as T[]);
    });
  });
}

async function ensureQueryHistoryTable(db: sqlite3.Database) {
  await runStatement(
    db,
    `CREATE TABLE IF NOT EXISTS query_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      question TEXT NOT NULL,
      sql_query TEXT NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      rows_returned INTEGER NOT NULL,
      timestamp TEXT NOT NULL
    )`
  );

  const columns = await getAllRows<{ name: string }>(db, 'PRAGMA table_info(query_history)');
  const hasUserId = columns.some((column) => column.name === 'user_id');
  if (!hasUserId) {
    await runStatement(db, 'ALTER TABLE query_history ADD COLUMN user_id INTEGER');
  }
}

// Helper to open a connection in read-only mode
export function openReadOnlyDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// Helper to open a connection in read-write mode (used for seeding and logging history)
export function openReadWriteDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// Execute a query in read-only mode
export function runReadOnlyQuery(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadOnlyDb();
    } catch (err) {
      return reject(new Error(`Database connection failed: ${(err as Error).message}`));
    }

    db.all(sql, params, (err, rows) => {
      db.close(); // always close the database connection
      if (err) {
        reject(err);
      } else {
        resolve(rows as Record<string, unknown>[]);
      }
    });
  });
}

// Save queries to history table (requires read-write)
export function saveHistory(
  userId: number,
  question: string,
  sqlQuery: string,
  executionTimeMs: number,
  rowsReturned: number
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch (err) {
      return reject(err);
    }

    try {
      await ensureQueryHistoryTable(db);
      const insertSql = `
        INSERT INTO query_history (user_id, question, sql_query, execution_time_ms, rows_returned, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const timestamp = new Date().toISOString();
      await runStatement(db, insertSql, [userId, question, sqlQuery, executionTimeMs, rowsReturned, timestamp]);
      resolve();
    } catch (err) {
      reject(err);
    } finally {
      db.close();
    }
  });
}

// Retrieve query history list
export function getHistory(userId: number, limit: number = 20): Promise<HistoryItem[]> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch {
      // If db doesn't exist yet, return empty list
      return resolve([]);
    }

    try {
      const checkTableSql = "SELECT name FROM sqlite_master WHERE type='table' AND name='query_history'";
      const row = await getRow<{ name: string }>(db, checkTableSql);
      if (!row) {
        resolve([]);
        return;
      }

      await ensureQueryHistoryTable(db);
      const sql = 'SELECT * FROM query_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?';
      const rows = await getAllRows<HistoryItem>(db, sql, [userId, limit]);
      resolve(rows);
    } catch (err) {
      reject(err);
    } finally {
      db.close();
    }
  });
}

// Retrieve current database schema CREATE TABLE commands dynamically (excluding history and internal tables)
export function getDbSchema(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadOnlyDb();
    } catch (err) {
      return reject(err);
    }

    // Fetch schema details for user tables
    const placeholders = INTERNAL_TABLES.map(() => '?').join(', ');
    const sql = `
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN (${placeholders})
    `;

    db.all(sql, INTERNAL_TABLES, (err, rows: { sql: string | null }[]) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        const schema = rows
          .map((row) => row.sql)
          .filter(Boolean)
          .join('\n\n');
        resolve(schema);
      }
    });
  });
}
