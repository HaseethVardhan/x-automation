import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.ORIGIN,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 6969);
}
bootstrap();
