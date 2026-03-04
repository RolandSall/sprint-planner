import type { Story } from '../domain/entities/story';
export const STORY_REPOSITORY = Symbol('STORY_REPOSITORY');
export interface IStoryRepository {
  findByFeatureId(featureId: string): Promise<Story[]>;
  findBySprintId(sprintId: string): Promise<Story[]>;
  findByPiId(piId: string): Promise<Story[]>;
  findById(id: string): Promise<Story | null>;
  save(story: Story): Promise<Story>;
  saveMany(stories: Story[]): Promise<Story[]>;
  delete(id: string): Promise<void>;
}
