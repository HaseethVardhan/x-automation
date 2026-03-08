import type { ApiErrorCode } from '../errors/error-codes';
import type { PaginationMeta } from '../pagination/page-query.dto';

export type ApiResponseMeta = {
  pagination?: PaginationMeta;
};

export type ApiResponsePayload<T> = {
  data: T;
  meta?: ApiResponseMeta;
};

export type ApiSuccessResponse<T> = {
  success: true;
  requestId: string;
  data: T;
  meta?: ApiResponseMeta;
};

export type ApiErrorResponse = {
  success: false;
  requestId: string;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export function apiResponse<T>(
  data: T,
  meta?: ApiResponseMeta,
): ApiResponsePayload<T> {
  return meta === undefined ? { data } : { data, meta };
}

export function isApiResponsePayload(
  value: unknown,
): value is ApiResponsePayload<unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return 'data' in candidate;
}
