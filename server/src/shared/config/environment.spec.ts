import { validateEnvironment } from './environment';

describe('environment validation', () => {
  it('applies defaults for queue, redis, and logging config', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://example',
      JWT_SECRET: 'secret',
    });

    expect(environment.PORT).toBe(6969);
    expect(environment.ORIGIN).toBe('*');
    expect(environment.REDIS_HOST).toBe('127.0.0.1');
    expect(environment.REDIS_PORT).toBe(6379);
    expect(environment.REDIS_DB).toBe(0);
    expect(environment.REDIS_TLS_ENABLED).toBe(false);
    expect(environment.QUEUE_PREFIX).toBe('x-automation');
    expect(environment.LOG_LEVEL).toBe('info');
  });

  it('coerces numeric and boolean infrastructure env values', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://example',
      JWT_SECRET: 'secret',
      PORT: '7001',
      REDIS_PORT: '6380',
      REDIS_DB: '4',
      REDIS_TLS_ENABLED: 'true',
    });

    expect(environment.PORT).toBe(7001);
    expect(environment.REDIS_PORT).toBe(6380);
    expect(environment.REDIS_DB).toBe(4);
    expect(environment.REDIS_TLS_ENABLED).toBe(true);
  });
});
