import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT, DrizzleDb } from '../db';
import { featuresTable, FeatureRow } from '../schema/features.schema';
import { IFeatureRepository } from '../../../../core/repositories/feature.repository.interface';
import { Feature } from '../../../../core/domain/entities/feature';

@Injectable()
export class FeatureDrizzleRepository implements IFeatureRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleDb) {}

  async findByPiId(piId: string): Promise<Feature[]> {
    return (await this.db.select().from(featuresTable).where(eq(featuresTable.piId, piId))).map(this.toDomain);
  }
  async findById(id: string): Promise<Feature | null> {
    const [row] = await this.db.select().from(featuresTable).where(eq(featuresTable.id, id));
    return row ? this.toDomain(row) : null;
  }
  async save(feature: Feature): Promise<Feature> {
    const values = { id: feature.id, piId: feature.piId, externalId: feature.externalId, title: feature.title, color: feature.color };
    const [row] = await this.db.insert(featuresTable).values(values)
      .onConflictDoUpdate({ target: featuresTable.id, set: { externalId: values.externalId, title: values.title, color: values.color } }).returning();
    return this.toDomain(row);
  }
  async delete(id: string): Promise<void> {
    await this.db.delete(featuresTable).where(eq(featuresTable.id, id));
  }
  private toDomain(row: FeatureRow): Feature { return new Feature(row.id, row.piId, row.externalId, row.title, row.color ?? null); }
}
