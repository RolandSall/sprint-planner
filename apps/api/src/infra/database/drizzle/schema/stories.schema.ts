import { pgTable, uuid, text, integer, index } from 'drizzle-orm/pg-core';
import { featuresTable } from './features.schema';
import { sprintsTable } from './sprints.schema';

export const storiesTable = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  featureId: uuid('feature_id').notNull().references(() => featuresTable.id, { onDelete: 'cascade' }),
  sprintId: uuid('sprint_id').references(() => sprintsTable.id, { onDelete: 'set null' }),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  estimation: integer('estimation').notNull(),
  externalDependencySprint: integer('external_dependency_sprint'),
}, (t) => ({
  featureIdIdx: index('stories_feature_id_idx').on(t.featureId),
  sprintIdIdx: index('stories_sprint_id_idx').on(t.sprintId),
}));

export type StoryRow = typeof storiesTable.$inferSelect;
export type NewStoryRow = typeof storiesTable.$inferInsert;
