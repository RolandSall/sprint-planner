import { pgTable, uuid, text, index } from 'drizzle-orm/pg-core';
import { pisTable } from './pis.schema';

export const featuresTable = pgTable('features', {
  id: uuid('id').primaryKey().defaultRandom(),
  piId: uuid('pi_id').notNull().references(() => pisTable.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  color: text('color'),
}, (t) => ({ piIdIdx: index('features_pi_id_idx').on(t.piId) }));

export type FeatureRow = typeof featuresTable.$inferSelect;
export type NewFeatureRow = typeof featuresTable.$inferInsert;
