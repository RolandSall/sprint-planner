import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Feature', 'featureId')
export class FeatureCreatedEvent implements IEvent {
  constructor(
    public readonly featureId: string,
    public readonly piId: string,
    public readonly externalId: string,
    public readonly title: string,
    public readonly color: string | null,
  ) {}
}
