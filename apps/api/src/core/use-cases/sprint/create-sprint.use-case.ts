import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Sprint } from '../../domain/entities/sprint';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';

@Injectable()
export class CreateSprintUseCase {
  constructor(@Inject(SPRINT_REPOSITORY) private readonly repo: ISprintRepository) {}
  async execute(dto: { piId: string; name: string; order: number; capacity: number; startDate?: string | null; endDate?: string | null }): Promise<Sprint> {
    return this.repo.save(new Sprint(randomUUID(), dto.piId, dto.name, dto.order, dto.capacity,
      dto.startDate ? new Date(dto.startDate) : null,
      dto.endDate ? new Date(dto.endDate) : null));
  }
}
