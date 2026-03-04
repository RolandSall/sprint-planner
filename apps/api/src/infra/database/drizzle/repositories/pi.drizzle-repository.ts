import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT, DrizzleDb } from '../db';
import { pisTable, PiRow } from '../schema/pis.schema';
import { IPIRepository } from '../../../../core/repositories/pi.repository.interface';
import { PI } from '../../../../core/domain/entities/pi';

@Injectable()
export class PiDrizzleRepository implements IPIRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleDb) {}

  async findByTeamId(teamId: string): Promise<PI[]> {
    return (await this.db.select().from(pisTable).where(eq(pisTable.teamId, teamId))).map(this.toDomain);
  }
  async findById(id: string): Promise<PI | null> {
    const [row] = await this.db.select().from(pisTable).where(eq(pisTable.id, id));
    return row ? this.toDomain(row) : null;
  }
  async save(pi: PI): Promise<PI> {
    const values = {
      id: pi.id, teamId: pi.teamId, name: pi.name,
      startDate: pi.startDate.toISOString().split('T')[0],
      endDate: pi.endDate.toISOString().split('T')[0],
    };
    const [row] = await this.db.insert(pisTable).values(values)
      .onConflictDoUpdate({ target: pisTable.id, set: { name: values.name, startDate: values.startDate, endDate: values.endDate } }).returning();
    return this.toDomain(row);
  }
  async delete(id: string): Promise<void> {
    await this.db.delete(pisTable).where(eq(pisTable.id, id));
  }
  private toDomain(row: PiRow): PI {
    return new PI(row.id, row.teamId, row.name, new Date(row.startDate), new Date(row.endDate));
  }
}
