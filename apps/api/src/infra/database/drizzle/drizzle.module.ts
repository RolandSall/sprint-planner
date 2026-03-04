import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_CLIENT, DATABASE_POOL, createPool, createDrizzleClient } from './db';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createPool(config.get<string>('DATABASE_URL')!),
    },
    {
      provide: DRIZZLE_CLIENT,
      inject: [DATABASE_POOL],
      useFactory: (pool) => createDrizzleClient(pool),
    },
  ],
  exports: [DRIZZLE_CLIENT, DATABASE_POOL],
})
export class DrizzleModule {}
