import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ManagedAccountsModule } from './managed-accounts/managed-accounts.module';
import { PrismaModule } from './prisma/prisma.module';
import { appConfig } from './shared/config/app.config';
import { validateEnvironment } from './shared/config/environment';
import { loggingConfig } from './shared/config/logging.config';
import { queueConfig } from './shared/config/queue.config';
import { redisConfig } from './shared/config/redis.config';
import { SharedLoggingModule } from './shared/logging/logging.module';
import { SharedQueueModule } from './shared/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, loggingConfig, queueConfig, redisConfig],
      validate: validateEnvironment,
    }),
    SharedLoggingModule,
    SharedQueueModule,
    PrismaModule,
    AuthModule,
    ManagedAccountsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
