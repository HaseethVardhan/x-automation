import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiException } from '../errors/api.exception';
import { API_ERROR_CODES, type ApiErrorCode } from '../errors/error-codes';
import type { ApiErrorResponse } from './api-response';
import type { ApiRequest } from './request-context';

type ErrorEnvelope = ApiErrorResponse['error'];

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<ApiRequest>();
    const requestId = request.requestId ?? 'unknown-request-id';
    const normalized = normalizeException(exception);

    response.status(normalized.status).json({
      success: false,
      requestId,
      error: normalized.error,
    } satisfies ApiErrorResponse);
  }
}

function normalizeException(exception: unknown): {
  status: number;
  error: ErrorEnvelope;
} {
  if (exception instanceof ApiException) {
    const payload = exception.getResponse() as {
      code: ApiErrorCode;
      message: string;
      details?: unknown;
    };

    return {
      status: exception.getStatus(),
      error:
        payload.details === undefined
          ? {
              code: payload.code,
              message: payload.message,
            }
          : {
              code: payload.code,
              message: payload.message,
              details: payload.details,
            },
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message = extractHttpExceptionMessage(exceptionResponse, exception);
    const details = extractHttpExceptionDetails(exceptionResponse);
    const code = mapHttpStatusToErrorCode(status, message);

    return {
      status,
      error:
        details === undefined
          ? {
              code,
              message,
            }
          : {
              code,
              message,
              details,
            },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    error: {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  };
}

function extractHttpExceptionMessage(
  exceptionResponse: string | object,
  exception: HttpException,
): string {
  if (typeof exceptionResponse === 'string') {
    return exceptionResponse;
  }

  const message = Reflect.get(exceptionResponse, 'message');

  if (Array.isArray(message)) {
    return 'Request validation failed';
  }

  if (typeof message === 'string') {
    return message;
  }

  return exception.message;
}

function extractHttpExceptionDetails(
  exceptionResponse: string | object,
): unknown {
  if (typeof exceptionResponse === 'string') {
    return undefined;
  }

  const message = Reflect.get(exceptionResponse, 'message');
  if (Array.isArray(message)) {
    return message;
  }

  return Reflect.get(exceptionResponse, 'details');
}

function mapHttpStatusToErrorCode(
  status: number,
  message: string,
): ApiErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return message === 'Request validation failed'
        ? API_ERROR_CODES.VALIDATION_FAILED
        : API_ERROR_CODES.BAD_REQUEST;
    case HttpStatus.UNAUTHORIZED:
      return message === 'Invalid email or password'
        ? API_ERROR_CODES.AUTH_INVALID_CREDENTIALS
        : API_ERROR_CODES.AUTH_UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return API_ERROR_CODES.AUTH_FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return API_ERROR_CODES.RESOURCE_NOT_FOUND;
    case HttpStatus.CONFLICT:
      return API_ERROR_CODES.RESOURCE_CONFLICT;
    case HttpStatus.TOO_MANY_REQUESTS:
      return API_ERROR_CODES.RATE_LIMITED;
    default:
      return API_ERROR_CODES.INTERNAL_ERROR;
  }
}