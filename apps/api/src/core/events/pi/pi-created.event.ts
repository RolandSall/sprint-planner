import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('PI', 'piId')
export class PiCreatedEvent implements IEvent {
  constructor(
    public readonly piId: string,
    public readonly teamId: string,
    public readonly name: string,
    public readonly startDate: string,
    public readonly endDate: string,
  ) {}
}
