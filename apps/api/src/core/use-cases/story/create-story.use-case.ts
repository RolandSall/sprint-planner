import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Story } from '../../domain/entities/story';
import { StoryDependency } from '../../domain/entities/story-dependency';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';

@Injectable()
export class CreateStoryUseCase {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
  ) {}
  async execute(dto: { featureId: string; externalId: string; title: string; estimation: number; externalDependencySprint?: number | null; dependsOnStoryIds?: string[] }): Promise<Story> {
    const story = await this.storyRepo.save(new Story(randomUUID(), dto.featureId, null, dto.externalId, dto.title, dto.estimation, dto.externalDependencySprint ?? null));
    if (dto.dependsOnStoryIds?.length) {
      await this.depRepo.saveMany(dto.dependsOnStoryIds.map(depId => new StoryDependency(story.id, depId)));
    }
    return story;
  }
}
