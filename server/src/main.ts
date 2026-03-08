import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureHttpApp } from './shared/http/app-bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);

  configureHttpApp(app, {
    corsOrigin: configService.get<string>('ORIGIN') ?? '*',
  });

  await app.listen(configService.get<number>('PORT') ?? 6969);
}

void bootstrap();
