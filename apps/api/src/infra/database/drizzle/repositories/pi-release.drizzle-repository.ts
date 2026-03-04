import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT, DrizzleDb } from '../db';
import { piReleasesTable, PiReleaseRow } from '../schema/pi-releases.schema';
import { IPiReleaseRepository } from '../../../../core/repositories/pi-release.repository.interface';
import { PiRelease } from '../../../../core/domain/entities/pi-release';

@Injectable()
export class PiReleaseDrizzleRepository implements IPiReleaseRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleDb) {}

  async findByPiId(piId: string): Promise<PiRelease[]> {
    return (await this.db.select().from(piReleasesTable).where(eq(piReleasesTable.piId, piId))).map(this.toDomain);
  }
  async findById(id: string): Promise<PiRelease | null> {
    const [row] = await this.db.select().from(piReleasesTable).where(eq(piReleasesTable.id, id));
    return row ? this.toDomain(row) : null;
  }
  async save(release: PiRelease): Promise<PiRelease> {
    const values = { id: release.id, piId: release.piId, name: release.name, date: release.date.toISOString().split('T')[0] };
    const [row] = await this.db.insert(piReleasesTable).values(values)
      .onConflictDoUpdate({ target: piReleasesTable.id, set: { name: values.name, date: values.date } }).returning();
    return this.toDomain(row);
  }
  async delete(id: string): Promise<void> {
    await this.db.delete(piReleasesTable).where(eq(piReleasesTable.id, id));
  }
  private toDomain(row: PiReleaseRow): PiRelease {
    return new PiRelease(row.id, row.piId, row.name, new Date(row.date));
  }
}
