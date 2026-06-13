import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'querygpt.db');
const SOURCE_DB_PATH = path.resolve(process.cwd(), 'querygpt-dataset-kit', 'nf_buildathon.db');

function seedDatabase() {
  console.log('Starting database seeding...');
  
  if (!fs.existsSync(SOURCE_DB_PATH)) {
    console.error(`Source database file not found at: ${SOURCE_DB_PATH}`);
    console.error('Please ensure the querygpt-dataset-kit folder contains nf_buildathon.db');
    process.exit(1);
  }

  // Delete existing db file if it exists to start fresh
  if (fs.existsSync(DB_PATH)) {
    console.log('Removing old database file...');
    try {
      fs.unlinkSync(DB_PATH);
    } catch (e) {
      console.warn('Could not unlink database file: ' + (e as Error).message);
    }
  }

  try {
    fs.copyFileSync(SOURCE_DB_PATH, DB_PATH);
    console.log('SQLite database seeded successfully from querygpt-dataset-kit/nf_buildathon.db!');
  } catch (err) {
    console.error('Failed to copy database file:', (err as Error).message);
    process.exit(1);
  }
}

seedDatabase();
