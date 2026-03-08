import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ManagedAccountsService } from './managed-accounts.service';

@UseGuards(JwtAuthGuard)
@Controller('managed-accounts')
export class ManagedAccountsController {
  constructor(
    private readonly managedAccountsService: ManagedAccountsService,
  ) {}
}