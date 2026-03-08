import { z } from 'zod';

const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

const nodeEnvSchema = z.enum(['development', 'test', 'production']);

const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  return value;
}, z.boolean());

const integerFromEnv = (defaultValue: number, minimumValue: number) =>
  z.coerce.number().int().min(minimumValue).default(defaultValue);

const environmentSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  PORT: integerFromEnv(6969, 1),
  ORIGIN: z.string().trim().min(1).default('*'),
  DATABASE_URL: z.string().trim().min(1),
  JWT_SECRET: z.string().trim().min(1),
  X_API_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  REDIS_HOST: z.string().trim().min(1).default('127.0.0.1'),
  REDIS_PORT: integerFromEnv(6379, 1),
  REDIS_DB: integerFromEnv(0, 0),
  REDIS_USERNAME: z.string().trim().min(1).optional(),
  REDIS_PASSWORD: z.string().trim().min(1).optional(),
  REDIS_TLS_ENABLED: booleanLikeSchema.default(false),
  QUEUE_PREFIX: z.string().trim().min(1).default('x-automation'),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  LOG_REDACT_PATHS: z
    .string()
    .trim()
    .default(
      'req.headers.authorization,req.headers.cookie,res.headers["set-cookie"]',
    ),
});

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  environmentVariables: Record<string, unknown>,
): EnvironmentVariables {
  return environmentSchema.parse(environmentVariables);
}
