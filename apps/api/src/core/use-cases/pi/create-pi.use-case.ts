import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PI } from '../../domain/entities/pi';
import { IPIRepository, PI_REPOSITORY } from '../../repositories/pi.repository.interface';

@Injectable()
export class CreatePiUseCase {
  constructor(@Inject(PI_REPOSITORY) private readonly repo: IPIRepository) {}
  async execute(dto: { teamId: string; name: string; startDate: string; endDate: string }): Promise<PI> {
    return this.repo.save(new PI(randomUUID(), dto.teamId, dto.name, new Date(dto.startDate), new Date(dto.endDate)));
  }
}
