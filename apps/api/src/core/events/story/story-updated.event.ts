import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Story', 'storyId')
export class StoryUpdatedEvent implements IEvent {
  constructor(
    public readonly storyId: string,
    public readonly changes: { externalId?: string; title?: string; estimation?: number; externalDependencySprint?: number | null; dependsOnStoryIds?: string[] },
  ) {}
}
