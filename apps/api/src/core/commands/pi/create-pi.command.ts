import { ICommand } from '@rolandsall24/nest-mediator';
import type { PI } from '../../domain/entities/pi';

export class CreatePiCommand implements ICommand {
  result?: PI;
  constructor(
    public readonly teamId: string,
    public readonly name: string,
    public readonly startDate: string,
    public readonly endDate: string,
  ) {}
}
