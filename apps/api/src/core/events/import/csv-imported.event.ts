import { IEvent, DomainEvent } from '@rolandsall24/nest-mediator';

@DomainEvent('PI', 'piId')
export class CsvImportedEvent implements IEvent {
  constructor(
    public readonly piId: string,
    public readonly imported: number,
    public readonly skipped: number,
  ) {}
}
