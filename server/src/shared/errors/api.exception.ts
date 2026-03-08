import { HttpException } from '@nestjs/common';
import type { ApiErrorCode } from './error-codes';

type ApiExceptionOptions = {
  status: number;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

type ApiExceptionPayload = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export class ApiException extends HttpException {
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(options: ApiExceptionOptions) {
    super(ApiException.createPayload(options), options.status);
    this.code = options.code;
    this.details = options.details;
  }

  private static createPayload(
    options: ApiExceptionOptions,
  ): ApiExceptionPayload {
    return options.details === undefined
      ? {
          code: options.code,
          message: options.message,
        }
      : {
          code: options.code,
          message: options.message,
          details: options.details,
        };
  }
}
