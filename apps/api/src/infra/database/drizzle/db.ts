import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');
export const DATABASE_POOL = 'DATABASE_POOL';

export function createPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl });
}

export function createDrizzleClient(pool: Pool): DrizzleDb {
  return drizzle(pool, { schema });
}
