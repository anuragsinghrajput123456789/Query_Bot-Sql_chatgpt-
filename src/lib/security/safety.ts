/**
 * SQL Security Validator
 * Ensures generated SQL is strictly a read-only SELECT statement and free of malicious injections or statements.
 */
export function validateSqlQuery(sql: string): { safe: boolean; error?: string } {
  try {
    if (!sql || typeof sql !== 'string') {
      return { safe: false, error: 'Query is empty or invalid.' };
    }

    // 1. Remove SQL comments to prevent bypasses where malicious keywords are hidden
    // Remove single line comments: -- comment
    // Remove multi-line comments: /* comment */
    let cleanedSql = sql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();

    // 2. Normalize whitespace
    cleanedSql = cleanedSql.replace(/\s+/g, ' ');

    // 3. Remove trailing semicolon for validation, then check if another semicolon exists
    if (cleanedSql.endsWith(';')) {
      cleanedSql = cleanedSql.slice(0, -1).trim();
    }

    if (cleanedSql.includes(';')) {
      return {
        safe: false,
        error: 'Query contains semicolon (;) characters. Stacked/multi-statement queries are not allowed.',
      };
    }

    // 4. Ensure query starts with SELECT
    if (!/^SELECT\b/i.test(cleanedSql)) {
      return {
        safe: false,
        error: 'Query must be a read-only SELECT statement. No other operations are permitted.',
      };
    }

    // 5. Check for destructive/unsafe SQL keywords using strict word boundaries
    const blacklist = [
      'INSERT',
      'UPDATE',
      'DELETE',
      'DROP',
      'ALTER',
      'TRUNCATE',
      'CREATE',
      'PRAGMA',
      'ATTACH',
      'DETACH',
      'VACUUM',
      'REPLACE',
      'RENAME',
    ];

    for (const keyword of blacklist) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(cleanedSql)) {
        return {
          safe: false,
          error: `Query contains forbidden destructive or administrative keyword: "${keyword}".`,
        };
      }
    }

    return { safe: true };
  } catch (e) {
    return {
      safe: false,
      error: `Security Validator internal error: ${(e as Error).message}`,
    };
  }
}
