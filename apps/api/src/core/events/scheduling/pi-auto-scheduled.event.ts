import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('PI', 'piId')
export class PiAutoScheduledEvent implements IEvent {
  constructor(
    public readonly piId: string,
    public readonly assignmentCount: number,
    public readonly warningCount: number,
  ) {}
}
