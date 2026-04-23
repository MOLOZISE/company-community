import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbInstance | undefined;

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super('DATABASE_URL environment variable is not set');
    this.name = 'MissingDatabaseUrlError';
  }
}

function getDb(): DbInstance {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new MissingDatabaseUrlError();
    }
    const client = postgres(connectionString, { prepare: false, max: 3 });
    _db = drizzle(client, { schema, logger: process.env.NODE_ENV === 'development' });
  }
  return _db;
}

export const db = new Proxy({} as DbInstance, {
  get(_, prop: string | symbol) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export * from './schema/index.js';
