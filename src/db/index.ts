import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as authSchema from './schema';
import * as trackingSchema from './tracking-schema';

// Auth tables are CLI-generated; app tables live alongside them.
const schema = { ...authSchema, ...trackingSchema };

/**
 * Postgres via Drizzle.
 *
 * `prepare: false` is required, not optional: the connection string points at
 * port 6543, the conventional PgBouncer transaction-pooling port. Under
 * transaction pooling a connection is handed to a different backend between
 * statements, so a prepared statement from one query can silently vanish
 * before the next — postgres.js's own docs call this out as the standard fix
 * for exactly this deployment shape.
 */
const globalForDb = globalThis as unknown as {
  pgSingleton?: postgres.Sql;
};

const client =
  globalForDb.pgSingleton ??
  postgres(process.env.DATABASE_URL ?? '', {
    prepare: false,
    max: 10
  });
globalForDb.pgSingleton = client;

export const db = drizzle(client, { schema });
export { schema, authSchema, trackingSchema };
