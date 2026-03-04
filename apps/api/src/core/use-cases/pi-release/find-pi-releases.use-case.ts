import { Inject, Injectable } from '@nestjs/common';
import { PiRelease } from '../../domain/entities/pi-release';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';

@Injectable()
export class FindPiReleasesUseCase {
  constructor(@Inject(PI_RELEASE_REPOSITORY) private readonly repo: IPiReleaseRepository) {}
  async byPiId(piId: string): Promise<PiRelease[]> { return this.repo.findByPiId(piId); }
}
