import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_CLIENT, createDrizzleClient } from './db';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createDrizzleClient(config.get<string>('DATABASE_URL')!),
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DrizzleModule {}
