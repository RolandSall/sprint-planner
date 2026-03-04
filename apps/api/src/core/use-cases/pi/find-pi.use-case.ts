import { Inject, Injectable } from '@nestjs/common';
import { PI } from '../../domain/entities/pi';
import { IPIRepository, PI_REPOSITORY } from '../../repositories/pi.repository.interface';

@Injectable()
export class FindPiUseCase {
  constructor(@Inject(PI_REPOSITORY) private readonly repo: IPIRepository) {}
  async byTeamId(teamId: string): Promise<PI[]> { return this.repo.findByTeamId(teamId); }
  async byId(id: string): Promise<PI | null> { return this.repo.findById(id); }
}
