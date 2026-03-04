import type { StoryDependency } from '../domain/entities/story-dependency';
export const STORY_DEPENDENCY_REPOSITORY = Symbol('STORY_DEPENDENCY_REPOSITORY');
export interface IStoryDependencyRepository {
  findByStoryId(storyId: string): Promise<StoryDependency[]>;
  findByPiId(piId: string): Promise<StoryDependency[]>;
  saveMany(deps: StoryDependency[]): Promise<void>;
  deleteByStoryId(storyId: string): Promise<void>;
  deleteByPiId(piId: string): Promise<void>;
}
