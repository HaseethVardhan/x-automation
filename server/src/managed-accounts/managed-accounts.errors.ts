import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../shared/errors/api.exception';
import { API_ERROR_CODES } from '../shared/errors/error-codes';

export const DUPLICATE_HANDLE_API_MESSAGE =
  'A managed account with this X handle already exists.';

export const MANAGED_ACCOUNT_NOT_FOUND_API_MESSAGE =
  'Managed account not found.';

export const ACCOUNT_ALREADY_ARCHIVED_API_MESSAGE =
  'Managed account is already archived.';

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

export class ManagedAccountNotFoundException extends ApiException {
  constructor(accountId: string) {
    super({
      status: HttpStatus.NOT_FOUND,
      code: API_ERROR_CODES.MANAGED_ACCOUNT_NOT_FOUND,
      message: MANAGED_ACCOUNT_NOT_FOUND_API_MESSAGE,
      details: {
        accountId,
      },
    });
  }
}

export class AccountAlreadyArchivedException extends ApiException {
  constructor(accountId: string) {
    super({
      status: HttpStatus.CONFLICT,
      code: API_ERROR_CODES.ACCOUNT_ALREADY_ARCHIVED,
      message: ACCOUNT_ALREADY_ARCHIVED_API_MESSAGE,
      details: {
        accountId,
      },
    });
  }
}