import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Feature', 'featureId')
export class FeatureUpdatedEvent implements IEvent {
  constructor(
    public readonly featureId: string,
    public readonly changes: { externalId?: string; title?: string; color?: string },
  ) {}
}
