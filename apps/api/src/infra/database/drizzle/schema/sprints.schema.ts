import { pgTable, uuid, text, integer, date, index } from 'drizzle-orm/pg-core';
import { pisTable } from './pis.schema';

export const sprintsTable = pgTable('sprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  piId: uuid('pi_id').notNull().references(() => pisTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  order: integer('order').notNull(),
  capacity: integer('capacity').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
}, (t) => ({ piIdIdx: index('sprints_pi_id_idx').on(t.piId) }));

export type SprintRow = typeof sprintsTable.$inferSelect;
export type NewSprintRow = typeof sprintsTable.$inferInsert;
