import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  MANAGED_ACCOUNT_CONNECTION_MODE,
  type ManagedAccountConnectionMode,
} from '../managed-account.constants';

export class CreateManagedAccountDto {
  @Transform(({ value }) => normalizeXHandle(value))
  @IsString()
  @IsNotEmpty()
  xHandle!: string;

  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  displayName?: string;

  @Transform(({ value }) => normalizeRequiredText(value))
  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsEnum(MANAGED_ACCOUNT_CONNECTION_MODE)
  connectionMode!: ManagedAccountConnectionMode;

  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  goalsSummary?: string;
}

function normalizeXHandle(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/^@+/, '').toLowerCase();
}

function normalizeRequiredText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

function normalizeOptionalText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? undefined : trimmedValue;
}