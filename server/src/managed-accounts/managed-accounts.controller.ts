import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { apiResponse } from '../shared/http/api-response';
import type { ApiRequest } from '../shared/http/request-context';
import {
  CreateManagedAccountDto,
  ListManagedAccountsQueryDto,
  ManagedAccountParamsDto,
  UpdateManagedAccountDto,
} from './dto';
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

  @Get()
  async list(@Query() query: ListManagedAccountsQueryDto) {
    const result = await this.managedAccountsService.listAccounts(query);

    return apiResponse(result.items, {
      pagination: result.pagination,
    });
  }

  @Get(':accountId')
  getDetail(@Param() params: ManagedAccountParamsDto) {
    return this.managedAccountsService.getAccountDetail(params.accountId);
  }

  @Patch(':accountId')
  update(
    @Param() params: ManagedAccountParamsDto,
    @Body() updateManagedAccountDto: UpdateManagedAccountDto,
  ) {
    return this.managedAccountsService.updateAccount(
      params.accountId,
      updateManagedAccountDto,
    );
  }

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