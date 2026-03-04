import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPIRepository, PI_REPOSITORY } from '../../repositories/pi.repository.interface';

@Injectable()
export class DeletePiUseCase {
  constructor(@Inject(PI_REPOSITORY) private readonly repo: IPIRepository) {}

  async execute(id: string): Promise<void> {
    const pi = await this.repo.findById(id);
    if (!pi) throw new NotFoundException(`PI ${id} not found`);
    return this.repo.delete(id);
  }
}
