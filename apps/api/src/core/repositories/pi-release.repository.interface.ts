import { PiRelease } from '../domain/entities/pi-release';

export const PI_RELEASE_REPOSITORY = Symbol('PI_RELEASE_REPOSITORY');

export interface IPiReleaseRepository {
  findByPiId(piId: string): Promise<PiRelease[]>;
  findById(id: string): Promise<PiRelease | null>;
  save(release: PiRelease): Promise<PiRelease>;
  delete(id: string): Promise<void>;
}
