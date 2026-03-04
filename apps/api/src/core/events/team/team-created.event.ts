import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Team', 'teamId')
export class TeamCreatedEvent implements IEvent {
  constructor(public readonly teamId: string, public readonly name: string) {}
}
