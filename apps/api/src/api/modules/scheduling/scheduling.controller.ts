import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { MediatorBus } from '@rolandsall24/nest-mediator';
import { AutoScheduleCommand } from '../../../core/commands/scheduling/auto-schedule.command';
import { SuggestFixesQuery } from '../../../core/queries/scheduling/suggest-fixes.query';
import { ExploreQuery } from '../../../core/queries/scheduling/explore.query';
import type { SchedulingApiResponse, AutoScheduleApiRequest, SuggestFixesApiResponse, SuggestFixesApiRequest, ExploreApiResponse, ExploreApiRequest } from '@org/shared-types';

class AutoScheduleRequest implements AutoScheduleApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
}

class SuggestFixesRequest implements SuggestFixesApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
}

class ExploreRequest implements ExploreApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
  iterations?: number;
}

@ApiTags('scheduling')
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly mediator: MediatorBus) {}

  @Post('auto-schedule')
  async autoScheduleHandler(@Body() body: AutoScheduleRequest): Promise<SchedulingApiResponse> {
    const command = new AutoScheduleCommand(body.piId);
    await this.mediator.send(command);
    return command.result!;
  }

  @Post('suggest-fixes')
  async suggestFixesHandler(@Body() body: SuggestFixesRequest): Promise<SuggestFixesApiResponse> {
    return this.mediator.query(new SuggestFixesQuery(body.piId));
  }

  @Post('explore')
  async exploreHandler(@Body() body: ExploreRequest): Promise<ExploreApiResponse> {
    return this.mediator.query(new ExploreQuery(body.piId, body.iterations));
  }
}
