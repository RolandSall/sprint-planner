import { ICommand } from '@rolandsall24/nest-mediator';
import type { Story } from '../../domain/entities/story';

export class CreateStoryCommand implements ICommand {
  result?: Story;
  constructor(
    public readonly featureId: string,
    public readonly externalId: string,
    public readonly title: string,
    public readonly estimation: number,
    public readonly externalDependencySprint?: number | null,
    public readonly dependsOnStoryIds?: string[],
  ) {}
}
