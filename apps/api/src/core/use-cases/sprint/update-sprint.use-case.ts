import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Sprint } from '../../domain/entities/sprint';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';

@Injectable()
export class UpdateSprintUseCase {
  constructor(@Inject(SPRINT_REPOSITORY) private readonly repo: ISprintRepository) {}
  async execute(id: string, dto: { name?: string; capacity?: number; startDate?: string | null; endDate?: string | null }): Promise<Sprint> {
    const sprint = await this.repo.findById(id);
    if (!sprint) throw new NotFoundException(`Sprint ${id} not found`);
    if (dto.name !== undefined) sprint.name = dto.name;
    if (dto.capacity !== undefined) sprint.capacity = dto.capacity;
    if ('startDate' in dto) sprint.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if ('endDate' in dto) sprint.endDate = dto.endDate ? new Date(dto.endDate) : null;
    return this.repo.save(sprint);
  }
}
