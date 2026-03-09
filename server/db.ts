import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';

const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/sqlite.db' : 'sqlite.db';
console.log(`[DB] Using database at: ${dbPath}`);
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
