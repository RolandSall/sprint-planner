import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE_CLIENT, DrizzleDb } from '../db';
import { storyDependenciesTable } from '../schema/story-dependencies.schema';
import { storiesTable } from '../schema/stories.schema';
import { featuresTable } from '../schema/features.schema';
import { IStoryDependencyRepository } from '../../../../core/repositories/story-dependency.repository.interface';
import { StoryDependency } from '../../../../core/domain/entities/story-dependency';

@Injectable()
export class StoryDependencyDrizzleRepository implements IStoryDependencyRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleDb) {}

  async findByStoryId(storyId: string): Promise<StoryDependency[]> {
    const rows = await this.db.select().from(storyDependenciesTable).where(eq(storyDependenciesTable.storyId, storyId));
    return rows.map(r => new StoryDependency(r.storyId, r.dependsOnStoryId));
  }
  async findByPiId(piId: string): Promise<StoryDependency[]> {
    const piStories = await this.db.select({ id: storiesTable.id })
      .from(storiesTable).innerJoin(featuresTable, eq(storiesTable.featureId, featuresTable.id))
      .where(eq(featuresTable.piId, piId));
    if (!piStories.length) return [];
    const storyIds = piStories.map(s => s.id);
    const rows = await this.db.select().from(storyDependenciesTable).where(inArray(storyDependenciesTable.storyId, storyIds));
    return rows.map(r => new StoryDependency(r.storyId, r.dependsOnStoryId));
  }
  async saveMany(deps: StoryDependency[]): Promise<void> {
    if (!deps.length) return;
    await this.db.insert(storyDependenciesTable).values(deps.map(d => ({ storyId: d.storyId, dependsOnStoryId: d.dependsOnStoryId }))).onConflictDoNothing();
  }
  async deleteByStoryId(storyId: string): Promise<void> {
    await this.db.delete(storyDependenciesTable).where(eq(storyDependenciesTable.storyId, storyId));
  }
  async deleteByPiId(piId: string): Promise<void> {
    const piStories = await this.db.select({ id: storiesTable.id })
      .from(storiesTable).innerJoin(featuresTable, eq(storiesTable.featureId, featuresTable.id))
      .where(eq(featuresTable.piId, piId));
    if (!piStories.length) return;
    const storyIds = piStories.map(s => s.id);
    await this.db.delete(storyDependenciesTable).where(inArray(storyDependenciesTable.storyId, storyIds));
  }
}
