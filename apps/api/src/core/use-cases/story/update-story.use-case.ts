import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Story } from '../../domain/entities/story';
import { StoryDependency } from '../../domain/entities/story-dependency';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';

@Injectable()
export class UpdateStoryUseCase {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
  ) {}
  async execute(id: string, dto: { externalId?: string; title?: string; estimation?: number; externalDependencySprint?: number | null; dependsOnStoryIds?: string[] }): Promise<Story> {
    const story = await this.storyRepo.findById(id);
    if (!story) throw new NotFoundException(`Story ${id} not found`);
    if (dto.externalId !== undefined) story.externalId = dto.externalId;
    if (dto.title !== undefined) story.title = dto.title;
    if (dto.estimation !== undefined) story.estimation = dto.estimation;
    if ('externalDependencySprint' in dto) story.externalDependencySprint = dto.externalDependencySprint ?? null;
    const saved = await this.storyRepo.save(story);
    if (dto.dependsOnStoryIds !== undefined) {
      await this.depRepo.deleteByStoryId(id);
      if (dto.dependsOnStoryIds.length) await this.depRepo.saveMany(dto.dependsOnStoryIds.map(d => new StoryDependency(id, d)));
    }
    return saved;
  }
}
