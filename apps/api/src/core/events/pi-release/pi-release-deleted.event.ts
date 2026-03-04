import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('PiRelease', 'releaseId')
export class PiReleaseDeletedEvent implements IEvent {
  constructor(public readonly releaseId: string) {}
}
