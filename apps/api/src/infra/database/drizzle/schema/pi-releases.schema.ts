import { pgTable, uuid, text, date, index } from 'drizzle-orm/pg-core';
import { pisTable } from './pis.schema';

export const piReleasesTable = pgTable('pi_releases', {
  id: uuid('id').primaryKey().defaultRandom(),
  piId: uuid('pi_id').notNull().references(() => pisTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  date: date('date').notNull(),
}, (t) => ({ piIdIdx: index('pi_releases_pi_id_idx').on(t.piId) }));

export type PiReleaseRow = typeof piReleasesTable.$inferSelect;
export type NewPiReleaseRow = typeof piReleasesTable.$inferInsert;
