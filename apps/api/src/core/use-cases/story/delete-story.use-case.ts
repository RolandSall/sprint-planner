import { Inject, Injectable } from '@nestjs/common';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';

@Injectable()
export class DeleteStoryUseCase {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
  ) {}
  async execute(id: string): Promise<void> {
    await this.depRepo.deleteByStoryId(id);
    return this.storyRepo.delete(id);
  }
}
