import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('PiRelease', 'releaseId')
export class PiReleaseCreatedEvent implements IEvent {
  constructor(
    public readonly releaseId: string,
    public readonly piId: string,
    public readonly name: string,
    public readonly date: string,
  ) {}
}
