import {
  CallHandler,
  ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessResponse } from './api-response';
import { isApiResponsePayload } from './api-response';
import type { ApiRequest } from './request-context';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor<
  unknown,
  ApiSuccessResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiSuccessResponse<unknown>> {
    const request = context.switchToHttp().getRequest<ApiRequest>();
    const requestId = request.requestId ?? 'unknown-request-id';

    return next.handle().pipe(
      map((value) => {
        if (isApiResponsePayload(value)) {
          return value.meta === undefined
            ? {
                success: true as const,
                requestId,
                data: value.data,
              }
            : {
                success: true as const,
                requestId,
                data: value.data,
                meta: value.meta,
              };
        }

        return {
          success: true as const,
          requestId,
          data: value,
        };
      }),
    );
  }
}
