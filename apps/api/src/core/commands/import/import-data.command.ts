import { ICommand } from '@rolandsall24/nest-mediator';
import type { ImportApiResponse } from '@org/shared-types';

export class ImportDataCommand implements ICommand {
  result?: ImportApiResponse;
  constructor(
    public readonly piId: string,
    public readonly fileBuffer: Buffer,
    public readonly filename: string,
  ) {}
}
