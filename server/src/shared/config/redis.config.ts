import { registerAs } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  db: Number(process.env.REDIS_DB ?? 0),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  tlsEnabled: process.env.REDIS_TLS_ENABLED === 'true',
}));

type RedisConfiguration = ReturnType<typeof redisConfig>;

export function buildRedisConnection(
  configuration: RedisConfiguration,
): ConnectionOptions {
  return configuration.tlsEnabled
    ? {
        host: configuration.host,
        port: configuration.port,
        db: configuration.db,
        username: configuration.username,
        password: configuration.password,
        tls: {},
      }
    : {
        host: configuration.host,
        port: configuration.port,
        db: configuration.db,
        username: configuration.username,
        password: configuration.password,
      };
}
