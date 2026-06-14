import sqlite3 from 'sqlite3';
import path from 'path';
import { HistoryItem } from '@/types';
import { hashPassword } from '../auth/session';

const DB_PATH = path.resolve(process.cwd(), 'querygpt.db');

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export function ensureDbInitialized(): Promise<void> {
  if (isInitialized) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    // Open connection in read-write mode to set up schemas
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) return reject(err);
    });

    db.serialize(() => {
      // 1. Create app_users table
      db.run(`
        CREATE TABLE IF NOT EXISTS app_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user'
        )
      `, (err) => {
        if (err) {
          db.close();
          return reject(err);
        }
      });

      // 2. Create query_history table
      db.run(`
        CREATE TABLE IF NOT EXISTS query_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          question TEXT NOT NULL,
          sql_query TEXT NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          rows_returned INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          is_favorite INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          db.close();
          return reject(err);
        }
      });

      // 3. Ensure user_id and is_favorite columns exist (in case query_history existed before)
      db.all("PRAGMA table_info(query_history)", [], (err, rows: any[]) => {
        if (err) {
          db.close();
          return reject(err);
        }
        
        const hasUserId = rows.some((row) => row.name === 'user_id');
        const hasIsFavorite = rows.some((row) => row.name === 'is_favorite');

        const runMigration = () => {
          if (!hasIsFavorite) {
            db.run("ALTER TABLE query_history ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0", (favErr) => {
              createPinnedWidgetsTable(db, resolve, reject);
            });
          } else {
            createPinnedWidgetsTable(db, resolve, reject);
          }
        };

        if (!hasUserId) {
          db.run("ALTER TABLE query_history ADD COLUMN user_id INTEGER", (alterErr) => {
            if (alterErr) {
              db.close();
              return reject(alterErr);
            }
            runMigration();
          });
        } else {
          runMigration();
        }
      });
    });
  });

  return initPromise;
}

function createPinnedWidgetsTable(db: sqlite3.Database, resolve: () => void, reject: (err: any) => void) {
  db.run(`
    CREATE TABLE IF NOT EXISTS pinned_widgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      question TEXT NOT NULL,
      sql_query TEXT NOT NULL,
      chart_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      db.close();
      return reject(err);
    }
    seedAdmin(db, resolve, reject);
  });
}

function seedAdmin(db: sqlite3.Database, resolve: () => void, reject: (err: any) => void) {
  const adminUsername = 'admin';
  db.get("SELECT id FROM app_users WHERE username = ?", [adminUsername], (err, row) => {
    if (err) {
      db.close();
      return reject(err);
    }
    if (!row) {
      const hash = hashPassword('admin123');
      db.run("INSERT INTO app_users (username, password_hash, role) VALUES (?, ?, 'admin')", [adminUsername, hash], (insertErr) => {
        db.close();
        if (insertErr) {
          reject(insertErr);
        } else {
          isInitialized = true;
          resolve();
        }
      });
    } else {
      db.close();
      isInitialized = true;
      resolve();
    }
  });
}

// Helper to open a connection in read-only mode
export async function openReadOnlyDb(): Promise<sqlite3.Database> {
  await ensureDbInitialized();
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
export async function openReadWriteDb(): Promise<sqlite3.Database> {
  await ensureDbInitialized();
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

// User CRUD helper operations
export async function getUserByUsername(username: string): Promise<any> {
  await ensureDbInitialized();
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadOnlyDb();
    } catch (err) {
      return reject(err);
    }

    db.get("SELECT * FROM app_users WHERE username = ?", [username], (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function createUser(username: string, passwordHash: string, role: string): Promise<number> {
  await ensureDbInitialized();
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch (err) {
      return reject(err);
    }

    db.run(
      "INSERT INTO app_users (username, password_hash, role) VALUES (?, ?, ?)",
      [username, passwordHash, role],
      function (err) {
        db.close();
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
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

// Execute a query in read-write mode (Admins only)
export function runReadWriteQuery(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
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
  rowsReturned: number,
  userId: number | null = null
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch (err) {
      return reject(err);
    }

    const insertSql = `
      INSERT INTO query_history (user_id, question, sql_query, execution_time_ms, rows_returned, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const timestamp = new Date().toISOString();

    db.run(insertSql, [userId, question, sqlQuery, executionTimeMs, rowsReturned, timestamp], (err) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Retrieve query history list (based on role - admin sees everything, users see their own, guest sees isolated anonymous logs)
export function getHistory(userId: number | null, role: 'user' | 'admin' | 'guest', limit: number = 25): Promise<HistoryItem[]> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadOnlyDb();
    } catch {
      // If db doesn't exist yet, return empty list
      return resolve([]);
    }

    // Admins query all history joined with usernames; Users query only their own history; Guests query where user_id is null
    let sql: string;
    let params: any[];

    if (role === 'admin') {
      sql = `
        SELECT qh.*, u.username as username 
        FROM query_history qh
        LEFT JOIN app_users u ON qh.user_id = u.id
        ORDER BY qh.timestamp DESC LIMIT ?
      `;
      params = [limit];
    } else if (role === 'guest' || userId === null) {
      sql = `
        SELECT * FROM query_history 
        WHERE user_id IS NULL 
        ORDER BY timestamp DESC LIMIT ?
      `;
      params = [limit];
    } else {
      sql = `
        SELECT * FROM query_history 
        WHERE user_id = ? 
        ORDER BY timestamp DESC LIMIT ?
      `;
      params = [userId, limit];
    }

    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(rows as HistoryItem[]);
      }
    });
  });
}

// Delete a history log item
export function deleteHistoryItem(id: number, userId: number | null, isAdmin: boolean): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch (err) {
      return reject(err);
    }

    let sql = 'DELETE FROM query_history WHERE id = ?';
    let params: any[] = [id];

    if (!isAdmin) {
      if (userId === null) {
        sql += ' AND user_id IS NULL';
      } else {
        sql += ' AND user_id = ?';
        params.push(userId);
      }
    }

    db.run(sql, params, function (err) {
      db.close();
      if (err) reject(err);
      else resolve(this.changes > 0);
    });
  });
}

// Update a history log item's question text
export function updateHistoryItem(id: number, userId: number | null, isAdmin: boolean, question: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch (err) {
      return reject(err);
    }

    let sql = 'UPDATE query_history SET question = ? WHERE id = ?';
    let params: any[] = [question, id];

    if (!isAdmin) {
      if (userId === null) {
        sql += ' AND user_id IS NULL';
      } else {
        sql += ' AND user_id = ?';
        params.push(userId);
      }
    }

    db.run(sql, params, function (err) {
      db.close();
      if (err) reject(err);
      else resolve(this.changes > 0);
    });
  });
}

// Retrieve current database schema CREATE TABLE commands dynamically
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
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'query_history' AND name != 'app_users'
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

// Toggle favorite status on a history item
export function toggleHistoryFavorite(id: number, userId: number | null): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch (err) {
      return reject(err);
    }

    // Toggle current is_favorite state (1 to 0 or 0 to 1)
    let sql = 'UPDATE query_history SET is_favorite = NOT is_favorite WHERE id = ?';
    let params: any[] = [id];

    if (userId !== null) {
      sql += ' AND user_id = ?';
      params.push(userId);
    } else {
      sql += ' AND user_id IS NULL';
    }

    db.run(sql, params, function (err) {
      db.close();
      if (err) reject(err);
      else resolve(this.changes > 0);
    });
  });
}

// Fetch all pinned widgets for a user
export function getPinnedWidgets(userId: number | null): Promise<any[]> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadOnlyDb();
    } catch {
      return resolve([]);
    }

    let sql = 'SELECT * FROM pinned_widgets WHERE user_id = ? ORDER BY created_at DESC';
    let params: any[] = [userId];

    if (userId === null) {
      sql = 'SELECT * FROM pinned_widgets WHERE user_id IS NULL ORDER BY created_at DESC';
      params = [];
    }

    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Pin a new widget to dashboard
export function pinWidget(
  userId: number | null,
  title: string,
  question: string,
  sqlQuery: string,
  chartType: string
): Promise<number> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch (err) {
      return reject(err);
    }

    const sql = `
      INSERT INTO pinned_widgets (user_id, title, question, sql_query, chart_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const createdAt = new Date().toISOString();

    db.run(sql, [userId, title, question, sqlQuery, chartType, createdAt], function (err) {
      db.close();
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

// Unpin a widget from dashboard
export function unpinWidget(id: number, userId: number | null): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = await openReadWriteDb();
    } catch (err) {
      return reject(err);
    }

    let sql = 'DELETE FROM pinned_widgets WHERE id = ?';
    let params: any[] = [id];

    if (userId !== null) {
      sql += ' AND user_id = ?';
      params.push(userId);
    } else {
      sql += ' AND user_id IS NULL';
    }

    db.run(sql, params, function (err) {
      db.close();
      if (err) reject(err);
      else resolve(this.changes > 0);
    });
  });
}
