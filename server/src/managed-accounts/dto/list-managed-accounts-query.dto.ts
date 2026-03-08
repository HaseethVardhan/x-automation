import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../shared/pagination/page-query.dto';
import {
  MANAGED_ACCOUNT_STATUS,
  type ManagedAccountStatus,
} from '../managed-account.constants';

export class ListManagedAccountsQueryDto extends PageQueryDto {
  @Transform(({ value }) => normalizeOptionalFilter(value))
  @IsOptional()
  @IsEnum(MANAGED_ACCOUNT_STATUS)
  status?: ManagedAccountStatus;

  @Transform(({ value }) => normalizeOptionalFilter(value))
  @IsOptional()
  @IsString()
  category?: string;

  @Transform(({ value }) => normalizeOptionalFilter(value))
  @IsOptional()
  @IsString()
  search?: string;
}

function normalizeOptionalFilter(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? undefined : trimmedValue;
}