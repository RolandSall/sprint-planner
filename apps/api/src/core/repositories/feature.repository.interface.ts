import type { Feature } from '../domain/entities/feature';
export const FEATURE_REPOSITORY = Symbol('FEATURE_REPOSITORY');
export interface IFeatureRepository {
  findByPiId(piId: string): Promise<Feature[]>;
  findById(id: string): Promise<Feature | null>;
  save(feature: Feature): Promise<Feature>;
  delete(id: string): Promise<void>;
}
