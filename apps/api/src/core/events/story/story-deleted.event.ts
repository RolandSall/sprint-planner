import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Story', 'storyId')
export class StoryDeletedEvent implements IEvent {
  constructor(public readonly storyId: string) {}
}
