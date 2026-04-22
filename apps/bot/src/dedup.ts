import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'dedup.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS processed_urls (
        url TEXT PRIMARY KEY,
        processed_at TEXT NOT NULL DEFAULT (datetime('now')),
        post_id TEXT
      )
    `);
  }
  return db;
}

export function isProcessed(url: string): boolean {
  const row = getDb().prepare('SELECT 1 FROM processed_urls WHERE url = ?').get(url);
  return !!row;
}

export function markProcessed(url: string, postId?: string): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO processed_urls (url, post_id) VALUES (?, ?)')
    .run(url, postId ?? null);
}

export function getRecentlyProcessed(hours = 24): string[] {
  const rows = getDb()
    .prepare(
      `SELECT url FROM processed_urls
       WHERE processed_at > datetime('now', '-${hours} hours')`
    )
    .all() as { url: string }[];
  return rows.map((r) => r.url);
}
