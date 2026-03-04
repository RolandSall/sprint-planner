import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('PiRelease', 'releaseId')
export class PiReleaseUpdatedEvent implements IEvent {
  constructor(
    public readonly releaseId: string,
    public readonly changes: { name?: string; date?: string },
  ) {}
}
