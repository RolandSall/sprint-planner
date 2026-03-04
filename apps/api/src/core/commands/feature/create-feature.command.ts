import { ICommand } from '@rolandsall24/nest-mediator';
import type { Feature } from '../../domain/entities/feature';

export class CreateFeatureCommand implements ICommand {
  result?: Feature;
  constructor(
    public readonly piId: string,
    public readonly externalId: string,
    public readonly title: string,
    public readonly color?: string,
    public readonly releaseId?: string | null,
  ) {}
}
