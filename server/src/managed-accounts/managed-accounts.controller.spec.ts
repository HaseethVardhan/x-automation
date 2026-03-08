import 'reflect-metadata';
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
  ACCOUNT_ARCHIVE_BLOCKED_BY_ACTIVE_RUN_API_MESSAGE,
  ACCOUNT_ALREADY_ARCHIVED_API_MESSAGE,
  DUPLICATE_HANDLE_API_MESSAGE,
  MANAGED_ACCOUNT_NOT_FOUND_API_MESSAGE,
  AccountArchiveBlockedByActiveRunException,
  AccountAlreadyArchivedException,
  DuplicateManagedAccountHandleException,
  ManagedAccountNotFoundException,
} from './managed-accounts.errors';
import { ManagedAccountsService } from './managed-accounts.service';

const managedAccountsService = {
  archiveAccount: jest.fn(),
  getAccountDetail: jest.fn(),
  listAccounts: jest.fn(),
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
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

  it('lists managed accounts inside the shared success envelope with pagination metadata', async () => {
    const createdAt = new Date('2026-03-08T10:00:00.000Z');
    const updatedAt = new Date('2026-03-08T10:00:00.000Z');
    const app = await createApp();

    managedAccountsService.listAccounts.mockResolvedValue({
      items: [
        {
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
        },
      ],
      pagination: {
        page: 2,
        pageSize: 5,
        totalItems: 11,
        totalPages: 3,
      },
    });

    await request(getHttpServer(app))
      .get('/managed-accounts?page=2&pageSize=5&status=ACTIVE&category=startup&search=creator')
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = getSuccessBody(response);

        expect(managedAccountsService.listAccounts).toHaveBeenCalledWith({
          page: 2,
          pageSize: 5,
          status: MANAGED_ACCOUNT_STATUS.ACTIVE,
          category: 'startup',
          search: 'creator',
        });
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.meta?.pagination).toEqual({
          page: 2,
          pageSize: 5,
          totalItems: 11,
          totalPages: 3,
        });
      });

    await app.close();
  });

  it('returns managed account detail with readiness summary inputs and latest run summary', async () => {
    const createdAt = new Date('2026-03-01T10:00:00.000Z');
    const updatedAt = new Date('2026-03-08T10:00:00.000Z');
    const runCreatedAt = new Date('2026-03-08T09:00:00.000Z');
    const runCompletedAt = new Date('2026-03-08T10:00:00.000Z');
    const app = await createApp();

    managedAccountsService.getAccountDetail.mockResolvedValue({
      id: '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
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
      readinessSummary: {
        credentials: {
          totalCount: 2,
          activeCount: 1,
          lastValidatedAt: updatedAt,
        },
        preferences: {
          isConfigured: true,
          updatedAt,
        },
        competitors: {
          totalCount: 3,
          activeCount: 2,
        },
      },
      latestRunSummary: {
        id: 'run-1',
        status: 'COMPLETED',
        currentStage: 'FINALIZE_RUN',
        progressPercent: 100,
        warningCount: 0,
        errorCount: 0,
        createdAt: runCreatedAt,
        completedAt: runCompletedAt,
      },
    });

    await request(getHttpServer(app))
      .get('/managed-accounts/9c4989a1-23eb-4c15-93a8-cf0b038c521a')
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = getSuccessBody(response);

        expect(managedAccountsService.getAccountDetail).toHaveBeenCalledWith(
          '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
        );
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({
          id: '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
          xHandle: 'creator_handle',
          readinessSummary: {
            credentials: {
              totalCount: 2,
              activeCount: 1,
            },
            preferences: {
              isConfigured: true,
            },
            competitors: {
              totalCount: 3,
              activeCount: 2,
            },
          },
          latestRunSummary: {
            id: 'run-1',
            status: 'COMPLETED',
            currentStage: 'FINALIZE_RUN',
            progressPercent: 100,
          },
        });
      });

    await app.close();
  });

  it('updates a managed account with patch semantics and normalized nullable fields', async () => {
    const createdAt = new Date('2026-03-01T10:00:00.000Z');
    const updatedAt = new Date('2026-03-08T12:00:00.000Z');
    const app = await createApp();

    managedAccountsService.updateAccount.mockResolvedValue({
      id: '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
      xHandle: 'creator_handle',
      displayName: null,
      category: 'ai-tools',
      status: MANAGED_ACCOUNT_STATUS.PAUSED,
      connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.HYBRID,
      goalsSummary: 'New goal',
      notes: null,
      archivedAt: null,
      createdAt,
      updatedAt,
    });

    await request(getHttpServer(app))
      .patch('/managed-accounts/9c4989a1-23eb-4c15-93a8-cf0b038c521a')
      .send({
        displayName: '   ',
        category: '  ai-tools  ',
        goalsSummary: '  New goal  ',
        notes: '',
        status: 'PAUSED',
      })
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = getSuccessBody(response);

        expect(managedAccountsService.updateAccount).toHaveBeenCalledWith(
          '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
          {
            displayName: null,
            category: 'ai-tools',
            goalsSummary: 'New goal',
            notes: null,
            status: MANAGED_ACCOUNT_STATUS.PAUSED,
          },
        );
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({
          id: '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
          displayName: null,
          category: 'ai-tools',
          status: MANAGED_ACCOUNT_STATUS.PAUSED,
          goalsSummary: 'New goal',
          notes: null,
        });
      });

    await app.close();
  });

  it('archives a managed account through the shared success envelope', async () => {
    const createdAt = new Date('2026-03-01T10:00:00.000Z');
    const archivedAt = new Date('2026-03-08T12:00:00.000Z');
    const app = await createApp();

    managedAccountsService.archiveAccount.mockResolvedValue({
      id: '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
      xHandle: 'creator_handle',
      displayName: 'Creator Name',
      category: 'startup',
      status: MANAGED_ACCOUNT_STATUS.ARCHIVED,
      connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.HYBRID,
      goalsSummary: 'Goal',
      notes: 'Note',
      archivedAt,
      createdAt,
      updatedAt: archivedAt,
    });

    await request(getHttpServer(app))
      .post('/managed-accounts/9c4989a1-23eb-4c15-93a8-cf0b038c521a/archive')
      .expect(201)
      .expect((response: SupertestResponse) => {
        const body = getSuccessBody(response);

        expect(managedAccountsService.archiveAccount).toHaveBeenCalledWith(
          '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
        );
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({
          id: '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
          status: MANAGED_ACCOUNT_STATUS.ARCHIVED,
          archivedAt: archivedAt.toISOString(),
        });
      });

    await app.close();
  });

  it('validates accountId params for the archive endpoint', async () => {
    const app = await createApp();

    await request(getHttpServer(app))
      .post('/managed-accounts/not-a-uuid/archive')
      .expect(400)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);
        const details = getValidationDetails(body);

        expect(body.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED);
        expect(details).toEqual(
          expect.arrayContaining([
            {
              field: 'accountId',
              errors: expect.arrayContaining(['accountId must be a UUID']),
            },
          ]),
        );
      });

    expect(managedAccountsService.archiveAccount).not.toHaveBeenCalled();

    await app.close();
  });

  it('surfaces duplicate archive conflicts through the shared error envelope', async () => {
    const app = await createApp();

    managedAccountsService.archiveAccount.mockRejectedValue(
      new AccountAlreadyArchivedException(
        '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
      ),
    );

    await request(getHttpServer(app))
      .post('/managed-accounts/9c4989a1-23eb-4c15-93a8-cf0b038c521a/archive')
      .expect(409)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);

        expect(body.success).toBe(false);
        expect(body.error).toEqual({
          code: API_ERROR_CODES.ACCOUNT_ALREADY_ARCHIVED,
          message: ACCOUNT_ALREADY_ARCHIVED_API_MESSAGE,
          details: {
            accountId: '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
          },
        });
      });

    await app.close();
  });

  it('surfaces active-run archive conflicts through the shared error envelope', async () => {
    const app = await createApp();

    managedAccountsService.archiveAccount.mockRejectedValue(
      new AccountArchiveBlockedByActiveRunException({
        id: 'run-queued',
        status: 'QUEUED',
      }),
    );

    await request(getHttpServer(app))
      .post('/managed-accounts/9c4989a1-23eb-4c15-93a8-cf0b038c521a/archive')
      .expect(409)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);

        expect(body.success).toBe(false);
        expect(body.error).toEqual({
          code: API_ERROR_CODES.ACCOUNT_ARCHIVE_BLOCKED_BY_ACTIVE_RUN,
          message: ACCOUNT_ARCHIVE_BLOCKED_BY_ACTIVE_RUN_API_MESSAGE,
          details: {
            blockingRunId: 'run-queued',
            blockingRunStatus: 'QUEUED',
          },
        });
      });

    await app.close();
  });

  it('validates managed account patch fields and disallows ARCHIVED status through patch', async () => {
    const app = await createApp();

    await request(getHttpServer(app))
      .patch('/managed-accounts/9c4989a1-23eb-4c15-93a8-cf0b038c521a')
      .send({
        category: '   ',
        status: 'ARCHIVED',
      })
      .expect(400)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);
        const details = getValidationDetails(body);

        expect(body.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED);
        expect(details).toEqual(
          expect.arrayContaining([
            {
              field: 'category',
              errors: expect.arrayContaining(['category should not be empty']),
            },
            {
              field: 'status',
              errors: expect.arrayContaining([
                'status must be one of the following values: ACTIVE, PAUSED, DISCONNECTED',
              ]),
            },
          ]),
        );
      });

    expect(managedAccountsService.updateAccount).not.toHaveBeenCalled();

    await app.close();
  });

  it('surfaces archived-account conflicts through the shared error envelope', async () => {
    const app = await createApp();

    managedAccountsService.updateAccount.mockRejectedValue(
      new AccountAlreadyArchivedException(
        '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
      ),
    );

    await request(getHttpServer(app))
      .patch('/managed-accounts/9c4989a1-23eb-4c15-93a8-cf0b038c521a')
      .send({
        status: 'PAUSED',
      })
      .expect(409)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);

        expect(body.success).toBe(false);
        expect(body.error).toEqual({
          code: API_ERROR_CODES.ACCOUNT_ALREADY_ARCHIVED,
          message: ACCOUNT_ALREADY_ARCHIVED_API_MESSAGE,
          details: {
            accountId: '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
          },
        });
      });

    await app.close();
  });

  it('validates accountId params for the managed account detail endpoint', async () => {
    const app = await createApp();

    await request(getHttpServer(app))
      .get('/managed-accounts/not-a-uuid')
      .expect(400)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);
        const details = getValidationDetails(body);

        expect(body.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED);
        expect(details).toEqual(
          expect.arrayContaining([
            {
              field: 'accountId',
              errors: expect.arrayContaining(['accountId must be a UUID']),
            },
          ]),
        );
      });

    expect(managedAccountsService.getAccountDetail).not.toHaveBeenCalled();

    await app.close();
  });

  it('surfaces managed-account-not-found errors through the shared error envelope', async () => {
    const app = await createApp();

    managedAccountsService.getAccountDetail.mockRejectedValue(
      new ManagedAccountNotFoundException(
        '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
      ),
    );

    await request(getHttpServer(app))
      .get('/managed-accounts/9c4989a1-23eb-4c15-93a8-cf0b038c521a')
      .expect(404)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);

        expect(body.success).toBe(false);
        expect(body.error).toEqual({
          code: API_ERROR_CODES.MANAGED_ACCOUNT_NOT_FOUND,
          message: MANAGED_ACCOUNT_NOT_FOUND_API_MESSAGE,
          details: {
            accountId: '9c4989a1-23eb-4c15-93a8-cf0b038c521a',
          },
        });
      });

    await app.close();
  });

  it('returns an empty managed account list with shared pagination metadata', async () => {
    const app = await createApp();

    managedAccountsService.listAccounts.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 1,
      },
    });

    await request(getHttpServer(app))
      .get('/managed-accounts')
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = getSuccessBody(response);

        expect(body.success).toBe(true);
        expect(body.data).toEqual([]);
        expect(body.meta?.pagination).toEqual({
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 1,
        });
      });

    await app.close();
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