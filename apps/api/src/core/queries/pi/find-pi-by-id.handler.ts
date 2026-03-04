import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { FindPiByIdQuery } from './find-pi-by-id.query';
import { PI } from '../../domain/entities/pi';
import { IPIRepository, PI_REPOSITORY } from '../../repositories/pi.repository.interface';

@Injectable()
@QueryHandler(FindPiByIdQuery)
export class FindPiByIdHandler implements IQueryHandler<FindPiByIdQuery, PI | null> {
  constructor(@Inject(PI_REPOSITORY) private readonly repo: IPIRepository) {}
  async execute(query: FindPiByIdQuery): Promise<PI | null> { return this.repo.findById(query.piId); }
}
