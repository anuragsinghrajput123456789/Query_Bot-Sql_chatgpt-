import sqlite3 from 'sqlite3';
import path from 'path';
import { HistoryItem } from '@/types';

const DB_PATH = path.resolve(process.cwd(), 'querygpt.db');

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

    // Ensure the query_history table exists (though it is created in seed.ts, we use safe guard here)
    const initSql = `
      CREATE TABLE IF NOT EXISTS query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        sql_query TEXT NOT NULL,
        execution_time_ms INTEGER NOT NULL,
        rows_returned INTEGER NOT NULL,
        timestamp TEXT NOT NULL
      );
    `;

    db.serialize(() => {
      db.run(initSql, (err) => {
        if (err) {
          db.close();
          return reject(err);
        }

        const insertSql = `
          INSERT INTO query_history (question, sql_query, execution_time_ms, rows_returned, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `;
        const timestamp = new Date().toISOString();

        db.run(insertSql, [question, sqlQuery, executionTimeMs, rowsReturned, timestamp], (err) => {
          db.close();
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  });
}

// Retrieve query history list
export function getHistory(limit: number = 20): Promise<HistoryItem[]> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch {
      // If db doesn't exist yet, return empty list
      return resolve([]);
    }

    const checkTableSql = "SELECT name FROM sqlite_master WHERE type='table' AND name='query_history'";
    db.get(checkTableSql, [], (err, row) => {
      if (err || !row) {
        db.close();
        return resolve([]);
      }

      const sql = 'SELECT * FROM query_history ORDER BY timestamp DESC LIMIT ?';
      db.all(sql, [limit], (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(rows as HistoryItem[]);
        }
      });
    });
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
    const sql = `
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'query_history'
    `;

    db.all(sql, [], (err, rows: { sql: string | null }[]) => {
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
