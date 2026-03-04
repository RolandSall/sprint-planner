import { ICommand } from '@rolandsall24/nest-mediator';
import type { Story } from '../../domain/entities/story';

export class UpdateStoryCommand implements ICommand {
  result?: Story;
  constructor(
    public readonly storyId: string,
    public readonly changes: { externalId?: string; title?: string; estimation?: number; externalDependencySprint?: number | null; dependsOnStoryIds?: string[] },
  ) {}
}
