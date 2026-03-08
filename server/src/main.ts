import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttpApp } from './shared/http/app-bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureHttpApp(app, {
    corsOrigin: process.env.ORIGIN,
  });
  await app.listen(process.env.PORT ?? 6969);
}
bootstrap();
