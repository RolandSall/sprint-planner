import { pgTable, uuid, text } from 'drizzle-orm/pg-core';

export const teamsTable = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
});

export type TeamRow = typeof teamsTable.$inferSelect;
export type NewTeamRow = typeof teamsTable.$inferInsert;
