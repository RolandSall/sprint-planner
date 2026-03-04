import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('PI', 'piId')
export class PiDeletedEvent implements IEvent {
  constructor(public readonly piId: string) {}
}
