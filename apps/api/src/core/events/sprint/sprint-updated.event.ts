import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Sprint', 'sprintId')
export class SprintUpdatedEvent implements IEvent {
  constructor(
    public readonly sprintId: string,
    public readonly changes: { name?: string; capacity?: number; startDate?: string | null; endDate?: string | null },
  ) {}
}
