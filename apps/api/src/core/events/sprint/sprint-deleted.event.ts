import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Sprint', 'sprintId')
export class SprintDeletedEvent implements IEvent {
  constructor(public readonly sprintId: string) {}
}
