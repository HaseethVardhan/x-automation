import { type ValidationError, type ValidationPipeOptions } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../errors/api.exception';
import { API_ERROR_CODES } from '../errors/error-codes';

type ValidationIssue = {
  field: string;
  errors: string[];
};

export const GLOBAL_VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  exceptionFactory: (validationErrors) =>
    new ApiException({
      status: HttpStatus.BAD_REQUEST,
      code: API_ERROR_CODES.VALIDATION_FAILED,
      message: 'Request validation failed',
      details: flattenValidationErrors(validationErrors),
    }),
};

function flattenValidationErrors(
  validationErrors: ValidationError[],
  parentPath = '',
): ValidationIssue[] {
  return validationErrors.flatMap((validationError) => {
    const field = parentPath
      ? `${parentPath}.${validationError.property}`
      : validationError.property;
    const currentErrors = validationError.constraints
      ? [
          {
            field,
            errors: Object.values(validationError.constraints),
          },
        ]
      : [];
    const childErrors = validationError.children?.length
      ? flattenValidationErrors(validationError.children, field)
      : [];

    return [...currentErrors, ...childErrors];
  });
}