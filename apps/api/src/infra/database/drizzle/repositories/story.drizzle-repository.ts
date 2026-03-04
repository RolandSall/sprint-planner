import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE_CLIENT, DrizzleDb } from '../db';
import { storiesTable, StoryRow } from '../schema/stories.schema';
import { sprintsTable } from '../schema/sprints.schema';
import { featuresTable } from '../schema/features.schema';
import { pisTable } from '../schema/pis.schema';
import { IStoryRepository } from '../../../../core/repositories/story.repository.interface';
import { Story } from '../../../../core/domain/entities/story';

@Injectable()
export class StoryDrizzleRepository implements IStoryRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleDb) {}

  async findByFeatureId(featureId: string): Promise<Story[]> {
    return (await this.db.select().from(storiesTable).where(eq(storiesTable.featureId, featureId))).map(this.toDomain);
  }
  async findBySprintId(sprintId: string): Promise<Story[]> {
    return (await this.db.select().from(storiesTable).where(eq(storiesTable.sprintId, sprintId))).map(this.toDomain);
  }
  async findByPiId(piId: string): Promise<Story[]> {
    const rows = await this.db
      .select({ story: storiesTable })
      .from(storiesTable)
      .innerJoin(featuresTable, eq(storiesTable.featureId, featuresTable.id))
      .where(eq(featuresTable.piId, piId));
    return rows.map(r => this.toDomain(r.story));
  }
  async findById(id: string): Promise<Story | null> {
    const [row] = await this.db.select().from(storiesTable).where(eq(storiesTable.id, id));
    return row ? this.toDomain(row) : null;
  }
  async save(story: Story): Promise<Story> {
    const values = { id: story.id, featureId: story.featureId, sprintId: story.sprintId, externalId: story.externalId, title: story.title, estimation: story.estimation, externalDependencySprint: story.externalDependencySprint };
    const [row] = await this.db.insert(storiesTable).values(values)
      .onConflictDoUpdate({ target: storiesTable.id, set: { sprintId: values.sprintId, externalId: values.externalId, title: values.title, estimation: values.estimation, externalDependencySprint: values.externalDependencySprint } }).returning();
    return this.toDomain(row);
  }
  async saveMany(stories: Story[]): Promise<Story[]> {
    return Promise.all(stories.map(s => this.save(s)));
  }
  async delete(id: string): Promise<void> {
    await this.db.delete(storiesTable).where(eq(storiesTable.id, id));
  }
  private toDomain(row: StoryRow): Story { return new Story(row.id, row.featureId, row.sprintId ?? null, row.externalId, row.title, row.estimation, row.externalDependencySprint ?? null); }
}
