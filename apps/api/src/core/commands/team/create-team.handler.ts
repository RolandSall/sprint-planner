import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { randomUUID } from 'crypto';
import { CreateTeamCommand } from './create-team.command';
import { Team } from '../../domain/entities/team';
import { ITeamRepository, TEAM_REPOSITORY } from '../../repositories/team.repository.interface';
import { TeamCreatedEvent } from '../../events/team/team-created.event';

@Injectable()
@CommandHandler(CreateTeamCommand)
export class CreateTeamHandler implements ICommandHandler<CreateTeamCommand> {
  constructor(
    @Inject(TEAM_REPOSITORY) private readonly repo: ITeamRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: CreateTeamCommand): Promise<void> {
    const team = await this.repo.save(new Team(randomUUID(), command.name));
    command.result = team;
    await this.mediator.publish(new TeamCreatedEvent(team.id, team.name));
  }
}
