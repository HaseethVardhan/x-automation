import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { loggingConfig } from '../config/logging.config';
import { REQUEST_ID_HEADER } from '../http/request-context';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [loggingConfig.KEY],
      useFactory: (configuration: ConfigType<typeof loggingConfig>) => ({
        pinoHttp: {
          level: configuration.level,
          messageKey: 'message',
          timestamp: pino.stdTimeFunctions.isoTime,
          redact: configuration.redactPaths,
          genReqId: (request, response) => {
            const headerRequestId = request.headers[REQUEST_ID_HEADER];
            const requestId =
              typeof headerRequestId === 'string' &&
              headerRequestId.trim().length > 0
                ? headerRequestId
                : randomUUID();

            response.setHeader(REQUEST_ID_HEADER, requestId);
            return requestId;
          },
        },
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class SharedLoggingModule {}
