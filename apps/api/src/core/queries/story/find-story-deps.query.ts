import { IQuery } from '@rolandsall24/nest-mediator';

export class FindStoryDepsQuery implements IQuery {
  constructor(public readonly storyId: string) {}
}
