import { ICommand } from '@rolandsall24/nest-mediator';
import type { Feature } from '../../domain/entities/feature';

export class UpdateFeatureCommand implements ICommand {
  result?: Feature;
  constructor(
    public readonly featureId: string,
    public readonly changes: { externalId?: string; title?: string; color?: string },
  ) {}
}
