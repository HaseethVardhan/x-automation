import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';
import { ApiResponseInterceptor } from './api-response.interceptor';
import { requestIdMiddleware } from './request-id.middleware';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../validation/validation-options';

type ConfigureHttpAppOptions = {
  corsOrigin?: string;
};

export function configureHttpApp(
  app: INestApplication,
  options: ConfigureHttpAppOptions = {},
): void {
  app.use(requestIdMiddleware);
  app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableCors({
    origin: options.corsOrigin,
    credentials: true,
  });
}
