import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Story', 'storyId')
export class StoryMovedEvent implements IEvent {
  constructor(
    public readonly storyId: string,
    public readonly fromSprintId: string | null,
    public readonly toSprintId: string | null,
  ) {}
}
