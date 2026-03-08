import { Module } from '@nestjs/common';
import { ManagedAccountsController } from './managed-accounts.controller';
import { ManagedAccountsService } from './managed-accounts.service';

@Module({
  controllers: [ManagedAccountsController],
  providers: [ManagedAccountsService],
})
export class ManagedAccountsModule {}