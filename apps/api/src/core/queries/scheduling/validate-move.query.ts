import { IQuery } from '@rolandsall24/nest-mediator';

export class ValidateMoveQuery implements IQuery {
  constructor(
    public readonly storyId: string,
    public readonly targetSprintId: string,
  ) {}
}
