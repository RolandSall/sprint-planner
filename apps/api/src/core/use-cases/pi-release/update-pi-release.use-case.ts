import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';
import { PiRelease } from '../../domain/entities/pi-release';

@Injectable()
export class UpdatePiReleaseUseCase {
  constructor(@Inject(PI_RELEASE_REPOSITORY) private readonly repo: IPiReleaseRepository) {}
  async execute(id: string, dto: { name?: string; date?: string }): Promise<PiRelease> {
    const release = await this.repo.findById(id);
    if (!release) throw new NotFoundException(`PiRelease ${id} not found`);
    if (dto.name !== undefined) release.name = dto.name;
    if (dto.date !== undefined) release.date = new Date(dto.date);
    return this.repo.save(release);
  }
}
