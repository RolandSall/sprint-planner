import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Story', 'storyId')
export class StoryCreatedEvent implements IEvent {
  constructor(
    public readonly storyId: string,
    public readonly featureId: string,
    public readonly externalId: string,
    public readonly title: string,
    public readonly estimation: number,
    public readonly externalDependencySprint: number | null,
    public readonly dependsOnStoryIds: string[],
  ) {}
}
