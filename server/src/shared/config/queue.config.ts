import { registerAs } from '@nestjs/config';

export const queueConfig = registerAs('queue', () => ({
  prefix: process.env.QUEUE_PREFIX ?? 'x-automation',
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 500,
    backoff: {
      type: 'exponential' as const,
      delay: 1_000,
    },
  },
}));
