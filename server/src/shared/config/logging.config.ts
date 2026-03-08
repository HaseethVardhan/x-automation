import { registerAs } from '@nestjs/config';

function parseRedactPaths(rawPaths: string | undefined): string[] {
  return (rawPaths ?? 'req.headers.authorization,req.headers.cookie')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export const loggingConfig = registerAs('logging', () => ({
  level: process.env.LOG_LEVEL ?? 'info',
  redactPaths: parseRedactPaths(process.env.LOG_REDACT_PATHS),
}));
