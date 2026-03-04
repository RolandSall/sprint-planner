import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Story } from '../../domain/entities/story';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';

@Injectable()
export class MoveStoryUseCase {
  constructor(@Inject(STORY_REPOSITORY) private readonly repo: IStoryRepository) {}
  async execute(storyId: string, targetSprintId: string | null): Promise<Story> {
    const story = await this.repo.findById(storyId);
    if (!story) throw new NotFoundException(`Story ${storyId} not found`);
    story.sprintId = targetSprintId;
    return this.repo.save(story);
  }
}
