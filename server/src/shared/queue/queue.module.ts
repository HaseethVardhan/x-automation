import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { queueConfig } from '../config/queue.config';
import { buildRedisConnection, redisConfig } from '../config/redis.config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [queueConfig.KEY, redisConfig.KEY],
      useFactory: (
        queueConfiguration: ConfigType<typeof queueConfig>,
        redisConfiguration: ConfigType<typeof redisConfig>,
      ) => ({
        prefix: queueConfiguration.prefix,
        connection: buildRedisConnection(redisConfiguration),
        defaultJobOptions: queueConfiguration.defaultJobOptions,
      }),
    }),
  ],
  exports: [BullModule],
})
export class SharedQueueModule {}
