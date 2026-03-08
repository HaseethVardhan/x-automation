import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  MANAGED_ACCOUNT_MUTABLE_STATUS,
  type ManagedAccountMutableStatus,
} from '../managed-account.constants';

export class UpdateManagedAccountDto {
  @Transform(({ value }) => normalizeNullableOptionalText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  displayName?: string | null;

  @Transform(({ value }) => normalizeOptionalRequiredText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @Transform(({ value }) => normalizeNullableOptionalText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  goalsSummary?: string | null;

  @Transform(({ value }) => normalizeNullableOptionalText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string | null;

  @IsOptional()
  @IsEnum(MANAGED_ACCOUNT_MUTABLE_STATUS)
  status?: ManagedAccountMutableStatus;
}

function normalizeNullableOptionalText(value: unknown): unknown {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}

function normalizeOptionalRequiredText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}