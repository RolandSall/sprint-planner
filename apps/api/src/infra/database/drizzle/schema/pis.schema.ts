import { pgTable, uuid, text, date } from 'drizzle-orm/pg-core';
import { teamsTable } from './teams.schema';

export const pisTable = pgTable('pis', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teamsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
});

export type PiRow = typeof pisTable.$inferSelect;
export type NewPiRow = typeof pisTable.$inferInsert;
