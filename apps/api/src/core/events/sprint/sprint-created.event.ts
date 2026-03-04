import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Sprint', 'sprintId')
export class SprintCreatedEvent implements IEvent {
  constructor(
    public readonly sprintId: string,
    public readonly piId: string,
    public readonly name: string,
    public readonly order: number,
    public readonly capacity: number,
    public readonly startDate: string | null,
    public readonly endDate: string | null,
  ) {}
}
