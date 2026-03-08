import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';
import type { ApiRequest } from './request-context';
import { REQUEST_ID_HEADER } from './request-context';

function normalizeRequestId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

export function getRequestId(request: ApiRequest): string {
  const headerValue = request.header(REQUEST_ID_HEADER);
  return normalizeRequestId(headerValue) ?? randomUUID();
}

export function requestIdMiddleware(
  request: ApiRequest,
  response: Response,
  next: NextFunction,
): void {
  const requestId = getRequestId(request);
  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}