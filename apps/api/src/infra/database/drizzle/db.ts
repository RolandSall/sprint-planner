import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');

export function createDrizzleClient(databaseUrl: string): DrizzleDb {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}
