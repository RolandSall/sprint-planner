import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT, DrizzleDb } from '../db';
import { sprintsTable, SprintRow } from '../schema/sprints.schema';
import { ISprintRepository } from '../../../../core/repositories/sprint.repository.interface';
import { Sprint } from '../../../../core/domain/entities/sprint';

@Injectable()
export class SprintDrizzleRepository implements ISprintRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleDb) {}

  async findByPiId(piId: string): Promise<Sprint[]> {
    return (await this.db.select().from(sprintsTable).where(eq(sprintsTable.piId, piId))).map(this.toDomain);
  }
  async findById(id: string): Promise<Sprint | null> {
    const [row] = await this.db.select().from(sprintsTable).where(eq(sprintsTable.id, id));
    return row ? this.toDomain(row) : null;
  }
  async save(sprint: Sprint): Promise<Sprint> {
    const values = {
      id: sprint.id, piId: sprint.piId, name: sprint.name, order: sprint.order, capacity: sprint.capacity,
      startDate: sprint.startDate ? sprint.startDate.toISOString().split('T')[0] : null,
      endDate: sprint.endDate ? sprint.endDate.toISOString().split('T')[0] : null,
    };
    const [row] = await this.db.insert(sprintsTable).values(values)
      .onConflictDoUpdate({ target: sprintsTable.id, set: { name: values.name, order: values.order, capacity: values.capacity, startDate: values.startDate, endDate: values.endDate } }).returning();
    return this.toDomain(row);
  }
  async delete(id: string): Promise<void> {
    await this.db.delete(sprintsTable).where(eq(sprintsTable.id, id));
  }
  private toDomain(row: SprintRow): Sprint {
    return new Sprint(row.id, row.piId, row.name, row.order, row.capacity,
      row.startDate ? new Date(row.startDate) : null,
      row.endDate ? new Date(row.endDate) : null);
  }
}
