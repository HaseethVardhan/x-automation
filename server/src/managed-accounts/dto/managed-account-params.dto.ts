import { IsUUID } from 'class-validator';

export class ManagedAccountParamsDto {
  @IsUUID()
  accountId!: string;
}