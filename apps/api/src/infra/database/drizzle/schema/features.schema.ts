import { pgTable, uuid, text, index } from 'drizzle-orm/pg-core';
import { pisTable } from './pis.schema';
import { piReleasesTable } from './pi-releases.schema';

export const featuresTable = pgTable('features', {
  id: uuid('id').primaryKey().defaultRandom(),
  piId: uuid('pi_id').notNull().references(() => pisTable.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  color: text('color'),
  releaseId: uuid('release_id').references(() => piReleasesTable.id, { onDelete: 'set null' }),
}, (t) => ({ piIdIdx: index('features_pi_id_idx').on(t.piId) }));

export type FeatureRow = typeof featuresTable.$inferSelect;
export type NewFeatureRow = typeof featuresTable.$inferInsert;
