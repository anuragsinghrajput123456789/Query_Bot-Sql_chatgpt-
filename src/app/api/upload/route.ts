import { NextRequest, NextResponse } from 'next/server';
import { openReadWriteDb } from '@/lib/db/sqlite';

export async function POST(req: NextRequest) {
  try {
    const { tableName, columns, rows } = await req.json();

    if (!tableName || !columns || !rows || !Array.isArray(columns) || !Array.isArray(rows)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload. tableName, columns (array), and rows (array) are required.' },
        { status: 400 }
      );
    }

    // Sanitize table name: allow only alphanumeric + underscores, force lowercase, prefix with uploaded_
    const sanitizedBaseName = tableName
      .replace(/[^a-zA-Z0-9_]/g, '')
      .replace(/^uploaded_/i, '')
      .toLowerCase();

    if (!sanitizedBaseName) {
      return NextResponse.json(
        { success: false, error: 'Table name must contain valid alphanumeric characters.' },
        { status: 400 }
      );
    }

    const finalTableName = `uploaded_${sanitizedBaseName}`;

    // Sanitize column names: allow only alphanumeric + underscores, verify no duplicates or empty columns
    const seenCols = new Set<string>();
    const sanitizedColumns = columns.map((col: unknown, idx: number) => {
      let cleaned = String(col ?? '')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .trim();
      if (!cleaned) {
        cleaned = `column_${idx + 1}`;
      }
      // Handle duplicates
      let uniqueCol = cleaned;
      let count = 1;
      while (seenCols.has(uniqueCol)) {
        uniqueCol = `${cleaned}_${count}`;
        count++;
      }
      seenCols.add(uniqueCol);
      return uniqueCol;
    });

    const db = await openReadWriteDb();

    try {
      await new Promise<void>((resolve, reject) => {
        db.serialize(() => {
          // Start transaction
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);
          });

          // Drop existing table if exists (replaces identical name dataset)
          db.run(`DROP TABLE IF EXISTS "${finalTableName}"`, (err) => {
            if (err) return reject(err);
          });

          // Create table
          const colDefinitions = sanitizedColumns.map((col) => `"${col}" TEXT`).join(', ');
          db.run(`CREATE TABLE "${finalTableName}" (${colDefinitions})`, (err) => {
            if (err) return reject(err);
          });

          // Prepare insert statement
          const placeholders = sanitizedColumns.map(() => '?').join(', ');
          const insertSql = `INSERT INTO "${finalTableName}" (${sanitizedColumns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
          const stmt = db.prepare(insertSql, (err) => {
            if (err) return reject(err);
          });

          // Insert rows
          for (const row of rows) {
            const rowArr = Array.isArray(row) ? row : [];
            // Pad or truncate row to match column length
            const rowData = sanitizedColumns.map((_, idx) => {
              const val = rowArr[idx];
              return val === null || val === undefined ? null : String(val);
            });
            stmt.run(rowData, (err) => {
              if (err) {
                stmt.finalize(() => {});
                return reject(err);
              }
            });
          }

          stmt.finalize((err) => {
            if (err) return reject(err);
          });

          // Commit transaction
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK', () => {});
              return reject(err);
            }
            resolve();
          });
        });
      });
    } catch (dbErr) {
      await new Promise<void>((res) => db.run('ROLLBACK', () => res()));
      db.close();
      throw dbErr;
    }

    db.close();

    return NextResponse.json({
      success: true,
      tableName: finalTableName,
      rowCount: rows.length,
      columnsCount: sanitizedColumns.length,
      columns: sanitizedColumns,
    });
  } catch (error) {
    console.error('Database upload error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
