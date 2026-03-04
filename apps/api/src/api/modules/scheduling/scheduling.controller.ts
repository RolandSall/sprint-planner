import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { AutoScheduleUseCase } from '../../../core/use-cases/scheduling/auto-schedule.use-case';
import { SuggestFixesUseCase } from '../../../core/use-cases/scheduling/suggest-fixes.use-case';
import type { SchedulingApiResponse, AutoScheduleApiRequest, SuggestFixesApiResponse, SuggestFixesApiRequest } from '@org/shared-types';

class AutoScheduleRequest implements AutoScheduleApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
}

class SuggestFixesRequest implements SuggestFixesApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
}

@ApiTags('scheduling')
@Controller('scheduling')
export class SchedulingController {
  constructor(
    private readonly autoSchedule: AutoScheduleUseCase,
    private readonly suggestFixes: SuggestFixesUseCase,
  ) {}

  @Post('auto-schedule')
  async autoScheduleHandler(@Body() body: AutoScheduleRequest): Promise<SchedulingApiResponse> {
    return this.autoSchedule.execute(body.piId);
  }

  @Post('suggest-fixes')
  async suggestFixesHandler(@Body() body: SuggestFixesRequest): Promise<SuggestFixesApiResponse> {
    return this.suggestFixes.execute(body.piId);
  }
}
