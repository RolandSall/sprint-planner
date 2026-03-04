import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PiRelease } from '../../domain/entities/pi-release';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';

@Injectable()
export class CreatePiReleaseUseCase {
  constructor(@Inject(PI_RELEASE_REPOSITORY) private readonly repo: IPiReleaseRepository) {}
  async execute(dto: { piId: string; name: string; date: string }): Promise<PiRelease> {
    return this.repo.save(new PiRelease(randomUUID(), dto.piId, dto.name, new Date(dto.date)));
  }
}
