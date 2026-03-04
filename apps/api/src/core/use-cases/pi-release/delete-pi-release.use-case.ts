import { Inject, Injectable } from '@nestjs/common';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';

@Injectable()
export class DeletePiReleaseUseCase {
  constructor(@Inject(PI_RELEASE_REPOSITORY) private readonly repo: IPiReleaseRepository) {}
  async execute(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
