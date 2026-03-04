import { Inject, Injectable } from '@nestjs/common';
import { Story } from '../../domain/entities/story';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import type { StoryProjection } from '@org/shared-types';

@Injectable()
export class FindStoriesUseCase {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly repo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
  ) {}
  async byId(id: string): Promise<Story | null> { return this.repo.findById(id); }
  async byFeatureId(featureId: string): Promise<Story[]> { return this.repo.findByFeatureId(featureId); }
  async byPiId(piId: string): Promise<Story[]> { return this.repo.findByPiId(piId); }

  async depIdsForStory(storyId: string): Promise<string[]> {
    const deps = await this.depRepo.findByStoryId(storyId);
    return deps.map(d => d.dependsOnStoryId);
  }

  async byFeatureIdAsProjections(featureId: string): Promise<StoryProjection[]> {
    const stories = await this.repo.findByFeatureId(featureId);
    const deps = await Promise.all(stories.map(s => this.depRepo.findByStoryId(s.id)));
    return stories.map((s, i) => this.toProjection(s, deps[i].map(d => d.dependsOnStoryId)));
  }

  private toProjection(s: Story, depIds: string[]): StoryProjection {
    return {
      id: s.id, featureId: s.featureId, sprintId: s.sprintId, externalId: s.externalId,
      title: s.title, estimation: s.estimation, externalDependencySprint: s.externalDependencySprint,
      dependsOnStoryIds: depIds,
    };
  }
}
