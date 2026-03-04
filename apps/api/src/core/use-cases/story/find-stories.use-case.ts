import { Inject, Injectable } from '@nestjs/common';
import { Story } from '../../domain/entities/story';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';

@Injectable()
export class FindStoriesUseCase {
  constructor(@Inject(STORY_REPOSITORY) private readonly repo: IStoryRepository) {}
  async byId(id: string): Promise<Story | null> { return this.repo.findById(id); }
  async byFeatureId(featureId: string): Promise<Story[]> { return this.repo.findByFeatureId(featureId); }
  async byPiId(piId: string): Promise<Story[]> { return this.repo.findByPiId(piId); }
}
