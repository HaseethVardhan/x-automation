import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { ApiRequest } from '../shared/http/request-context';
import { CreateManagedAccountDto } from './dto/create-managed-account.dto';
import { ManagedAccountsService } from './managed-accounts.service';

type AuthenticatedApiRequest = ApiRequest & {
  user: {
    userId: string;
    email: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('managed-accounts')
export class ManagedAccountsController {
  constructor(
    private readonly managedAccountsService: ManagedAccountsService,
  ) {}

  @Post()
  create(
    @Body() createManagedAccountDto: CreateManagedAccountDto,
    @Req() request: AuthenticatedApiRequest,
  ) {
    return this.managedAccountsService.createAccount(
      createManagedAccountDto,
      request.user.userId,
    );
  }
}