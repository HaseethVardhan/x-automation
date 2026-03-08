import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../shared/errors/api.exception';
import { API_ERROR_CODES } from '../shared/errors/error-codes';

export const DUPLICATE_HANDLE_API_MESSAGE =
  'A managed account with this X handle already exists.';

export class DuplicateManagedAccountHandleException extends ApiException {
  constructor(xHandle: string) {
    super({
      status: HttpStatus.CONFLICT,
      code: API_ERROR_CODES.DUPLICATE_HANDLE,
      message: DUPLICATE_HANDLE_API_MESSAGE,
      details: {
        xHandle,
      },
    });
  }
}