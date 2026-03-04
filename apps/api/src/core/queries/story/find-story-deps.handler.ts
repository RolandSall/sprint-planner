import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { FindStoryDepsQuery } from './find-story-deps.query';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';

@Injectable()
@QueryHandler(FindStoryDepsQuery)
export class FindStoryDepsHandler implements IQueryHandler<FindStoryDepsQuery, string[]> {
  constructor(@Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository) {}
  async execute(query: FindStoryDepsQuery): Promise<string[]> {
    const deps = await this.depRepo.findByStoryId(query.storyId);
    return deps.map(d => d.dependsOnStoryId);
  }
}
