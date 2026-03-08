import { Module } from '@nestjs/common';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request, { type Response as SupertestResponse } from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { API_ERROR_CODES } from '../shared/errors/error-codes';
import { configureHttpApp } from '../shared/http/app-bootstrap';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../shared/http/api-response';
import {
  MANAGED_ACCOUNT_CONNECTION_MODE,
  MANAGED_ACCOUNT_STATUS,
} from './managed-account.constants';
import { ManagedAccountsController } from './managed-accounts.controller';
import {
  DUPLICATE_HANDLE_API_MESSAGE,
  DuplicateManagedAccountHandleException,
} from './managed-accounts.errors';
import { ManagedAccountsService } from './managed-accounts.service';

const managedAccountsService = {
  createAccount: jest.fn(),
};

class AuthenticatedGuardStub implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: {
        userId: string;
        email: string;
      };
    }>();

    request.user = {
      userId: 'admin-123',
      email: 'owner@example.com',
    };

    return true;
  }
}

@Module({
  controllers: [ManagedAccountsController],
  providers: [
    {
      provide: ManagedAccountsService,
      useValue: managedAccountsService,
    },
  ],
})
class ManagedAccountsControllerTestModule {}

describe('ManagedAccountsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a managed account with a normalized handle and authenticated admin id', async () => {
    const app = await createApp();
    const createdAt = new Date('2026-03-08T10:00:00.000Z');
    const updatedAt = new Date('2026-03-08T10:00:00.000Z');

    managedAccountsService.createAccount.mockResolvedValue({
      id: 'account-123',
      xHandle: 'creator_handle',
      displayName: 'Creator Name',
      category: 'startup',
      status: MANAGED_ACCOUNT_STATUS.ACTIVE,
      connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.HYBRID,
      goalsSummary: 'Grow reach with founder-led product content',
      notes: null,
      archivedAt: null,
      createdAt,
      updatedAt,
    });

    await request(getHttpServer(app))
      .post('/managed-accounts')
      .send({
        xHandle: '  @Creator_Handle  ',
        displayName: '  Creator Name  ',
        category: '  startup  ',
        connectionMode: 'HYBRID',
        goalsSummary: '  Grow reach with founder-led product content  ',
      })
      .expect(201)
      .expect((response: SupertestResponse) => {
        const body = getSuccessBody(response);

        expect(managedAccountsService.createAccount).toHaveBeenCalledWith(
          {
            xHandle: 'creator_handle',
            displayName: 'Creator Name',
            category: 'startup',
            connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.HYBRID,
            goalsSummary: 'Grow reach with founder-led product content',
          },
          'admin-123',
        );

        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({
          id: 'account-123',
          xHandle: 'creator_handle',
          displayName: 'Creator Name',
          category: 'startup',
          status: MANAGED_ACCOUNT_STATUS.ACTIVE,
          connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.HYBRID,
          goalsSummary: 'Grow reach with founder-led product content',
          notes: null,
          archivedAt: null,
        });
      });

    await app.close();
  });

  it('applies DTO validation for required fields and connection mode', async () => {
    const app = await createApp();

    await request(getHttpServer(app))
      .post('/managed-accounts')
      .send({
        xHandle: '   @   ',
        category: '   ',
        connectionMode: 'INVALID_MODE',
      })
      .expect(400)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);
        const details = getValidationDetails(body);

        expect(body.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED);
        expect(details).toEqual(
          expect.arrayContaining([
            {
              field: 'xHandle',
              errors: expect.arrayContaining(['xHandle should not be empty']),
            },
            {
              field: 'category',
              errors: expect.arrayContaining(['category should not be empty']),
            },
            {
              field: 'connectionMode',
              errors: expect.arrayContaining([
                'connectionMode must be one of the following values: API_ONLY, BROWSER_ONLY, HYBRID',
              ]),
            },
          ]),
        );
      });

    expect(managedAccountsService.createAccount).not.toHaveBeenCalled();

    await app.close();
  });

  it('surfaces duplicate-handle conflicts through the shared error envelope', async () => {
    const app = await createApp();

    managedAccountsService.createAccount.mockRejectedValue(
      new DuplicateManagedAccountHandleException('creator_handle'),
    );

    await request(getHttpServer(app))
      .post('/managed-accounts')
      .send({
        xHandle: 'creator_handle',
        category: 'startup',
        connectionMode: 'API_ONLY',
      })
      .expect(409)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);

        expect(body.success).toBe(false);
        expect(body.error).toEqual({
          code: API_ERROR_CODES.DUPLICATE_HANDLE,
          message: DUPLICATE_HANDLE_API_MESSAGE,
          details: {
            xHandle: 'creator_handle',
          },
        });
      });

    await app.close();
  });
});

async function createApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [ManagedAccountsControllerTestModule],
  })
    .overrideGuard(JwtAuthGuard)
    .useClass(AuthenticatedGuardStub)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication>();
  configureHttpApp(app);
  await app.init();

  return app;
}

function getHttpServer(app: INestApplication) {
  return app.getHttpServer() as Parameters<typeof request>[0];
}

function getSuccessBody(
  response: SupertestResponse,
): ApiSuccessResponse<Record<string, unknown>> {
  return JSON.parse(response.text) as ApiSuccessResponse<Record<string, unknown>>;
}

function getErrorBody(response: SupertestResponse): ApiErrorResponse {
  return JSON.parse(response.text) as ApiErrorResponse;
}

function getValidationDetails(
  body: ApiErrorResponse,
): Array<{ field: string; errors: string[] }> {
  expect(Array.isArray(body.error.details)).toBe(true);

  return body.error.details as Array<{ field: string; errors: string[] }>;
}