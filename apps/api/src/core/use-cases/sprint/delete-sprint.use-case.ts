import { Inject, Injectable } from '@nestjs/common';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';

@Injectable()
export class DeleteSprintUseCase {
  constructor(@Inject(SPRINT_REPOSITORY) private readonly repo: ISprintRepository) {}
  async execute(id: string): Promise<void> { return this.repo.delete(id); }
}
