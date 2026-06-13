import { validateSqlQuery } from './safety';

interface TestCase {
  sql: string;
  expectedSafe: boolean;
  description: string;
}

const testCases: TestCase[] = [
  // Safe cases
  {
    sql: 'SELECT * FROM customers;',
    expectedSafe: true,
    description: 'Simple select with trailing semicolon',
  },
  {
    sql: "SELECT name, join_date FROM customers WHERE join_date > '2026-01-01' LIMIT 10",
    expectedSafe: true,
    description: 'Select with WHERE clause and limit',
  },
  {
    sql: 'select name from employees where salary > 100000;',
    expectedSafe: true,
    description: 'Lowercase select keyword',
  },
  {
    sql: 'SELECT c.name, SUM(o.total_amount) FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.name',
    expectedSafe: true,
    description: 'Complex join query with aggregate functions',
  },
  {
    sql: 'SELECT created_at, updater_name FROM system_logs',
    expectedSafe: true,
    description: 'Select containing words like create/update as part of column name',
  },
  // Unsafe cases
  {
    sql: 'DROP TABLE customers',
    expectedSafe: false,
    description: 'Direct DROP TABLE',
  },
  {
    sql: "INSERT INTO customers (name) VALUES ('Hacker')",
    expectedSafe: false,
    description: 'Direct INSERT',
  },
  {
    sql: 'UPDATE employees SET salary = 999999',
    expectedSafe: false,
    description: 'Direct UPDATE',
  },
  {
    sql: 'DELETE FROM orders',
    expectedSafe: false,
    description: 'Direct DELETE',
  },
  {
    sql: 'SELECT * FROM customers; DROP TABLE orders;',
    expectedSafe: false,
    description: 'Stacked query injection',
  },
  {
    sql: 'SELECT * FROM customers; DROP TABLE orders -- comment',
    expectedSafe: false,
    description: 'Stacked query with trailing comment',
  },
  {
    sql: 'CREATE TABLE test (id int)',
    expectedSafe: false,
    description: 'Direct CREATE TABLE',
  },
  {
    sql: 'ALTER TABLE customers ADD COLUMN hack TEXT',
    expectedSafe: false,
    description: 'Direct ALTER TABLE',
  },
  {
    sql: 'PRAGMA schema_version',
    expectedSafe: false,
    description: 'Direct PRAGMA query',
  },
];

function runTests() {
  console.log('Running SQL Safety Validator tests...');
  let failed = 0;

  testCases.forEach((tc, idx) => {
    const result = validateSqlQuery(tc.sql);
    const passed = result.safe === tc.expectedSafe;
    if (passed) {
      console.log(`[PASS] Case #${idx + 1}: ${tc.description}`);
    } else {
      console.error(`[FAIL] Case #${idx + 1}: ${tc.description}`);
      console.error(`  Query: ${tc.sql}`);
      console.error(`  Expected Safe: ${tc.expectedSafe}, Got: ${result.safe}`);
      if (result.error) console.error(`  Error message: ${result.error}`);
      failed++;
    }
  });

  if (failed === 0) {
    console.log('\nAll tests passed successfully!');
  } else {
    console.error(`\nTests finished with ${failed} failure(s).`);
    process.exit(1);
  }
}

runTests();
