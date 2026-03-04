import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('Feature', 'featureId')
export class FeatureDeletedEvent implements IEvent {
  constructor(public readonly featureId: string) {}
}
