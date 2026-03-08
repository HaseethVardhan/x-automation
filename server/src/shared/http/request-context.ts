import type { Request } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

export type ApiRequest = Request & {
  requestId?: string;
};