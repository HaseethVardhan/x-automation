import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export class PageQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = DEFAULT_PAGE;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize = DEFAULT_PAGE_SIZE;
}

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type PaginationMetaOptions = {
  page: number;
  pageSize: number;
  totalItems: number;
};

export function buildPaginationMeta(
  options: PaginationMetaOptions,
): PaginationMeta {
  return {
    page: options.page,
    pageSize: options.pageSize,
    totalItems: options.totalItems,
    totalPages: Math.max(1, Math.ceil(options.totalItems / options.pageSize)),
  };
}
