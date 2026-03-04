import { pgTable, uuid, primaryKey, index } from 'drizzle-orm/pg-core';
import { storiesTable } from './stories.schema';

export const storyDependenciesTable = pgTable('story_dependencies', {
  storyId: uuid('story_id').notNull().references(() => storiesTable.id, { onDelete: 'cascade' }),
  dependsOnStoryId: uuid('depends_on_story_id').notNull().references(() => storiesTable.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.storyId, t.dependsOnStoryId] }),
  storyIdIdx: index('story_deps_story_id_idx').on(t.storyId),
}));

export type StoryDependencyRow = typeof storyDependenciesTable.$inferSelect;
