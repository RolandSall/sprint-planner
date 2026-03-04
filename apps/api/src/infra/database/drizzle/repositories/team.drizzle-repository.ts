import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT, DrizzleDb } from '../db';
import { teamsTable, TeamRow } from '../schema/teams.schema';
import { ITeamRepository } from '../../../../core/repositories/team.repository.interface';
import { Team } from '../../../../core/domain/entities/team';

@Injectable()
export class TeamDrizzleRepository implements ITeamRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleDb) {}

  async findAll(): Promise<Team[]> {
    return (await this.db.select().from(teamsTable)).map(this.toDomain);
  }
  async findById(id: string): Promise<Team | null> {
    const [row] = await this.db.select().from(teamsTable).where(eq(teamsTable.id, id));
    return row ? this.toDomain(row) : null;
  }
  async save(team: Team): Promise<Team> {
    const [row] = await this.db.insert(teamsTable).values({ id: team.id, name: team.name })
      .onConflictDoUpdate({ target: teamsTable.id, set: { name: team.name } }).returning();
    return this.toDomain(row);
  }
  async delete(id: string): Promise<void> {
    await this.db.delete(teamsTable).where(eq(teamsTable.id, id));
  }
  private toDomain(row: TeamRow): Team { return new Team(row.id, row.name); }
}
