import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { FindStoryProjectionsByFeatureIdQuery } from './find-story-projections-by-feature-id.query';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import type { StoryProjection } from '@org/shared-types';

@Injectable()
@QueryHandler(FindStoryProjectionsByFeatureIdQuery)
export class FindStoryProjectionsByFeatureIdHandler implements IQueryHandler<FindStoryProjectionsByFeatureIdQuery, StoryProjection[]> {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
  ) {}

  async execute(query: FindStoryProjectionsByFeatureIdQuery): Promise<StoryProjection[]> {
    const stories = await this.storyRepo.findByFeatureId(query.featureId);
    const deps = await Promise.all(stories.map(s => this.depRepo.findByStoryId(s.id)));
    return stories.map((s, i) => ({
      id: s.id, featureId: s.featureId, sprintId: s.sprintId, externalId: s.externalId,
      title: s.title, estimation: s.estimation, externalDependencySprint: s.externalDependencySprint,
      dependsOnStoryIds: deps[i].map(d => d.dependsOnStoryId),
    }));
  }
}
