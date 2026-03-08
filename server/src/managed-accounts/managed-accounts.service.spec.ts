import 'reflect-metadata';
import { Prisma } from '@prisma/client';
import { API_ERROR_CODES } from '../shared/errors/error-codes';
import {
  MANAGED_ACCOUNT_CONNECTION_MODE,
  MANAGED_ACCOUNT_STATUS,
} from './managed-account.constants';
import { ListManagedAccountsQueryDto } from './dto/list-managed-accounts-query.dto';
import {
  DUPLICATE_HANDLE_API_MESSAGE,
  MANAGED_ACCOUNT_NOT_FOUND_API_MESSAGE,
  DuplicateManagedAccountHandleException,
  ManagedAccountNotFoundException,
} from './managed-accounts.errors';
import { ManagedAccountsService } from './managed-accounts.service';

describe('ManagedAccountsService', () => {
  const prisma = {
    managedAccount: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  let service: ManagedAccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ManagedAccountsService(prisma as never);
  });

  it('returns managed account detail with readiness summary inputs and latest run summary', async () => {
    const credentialValidatedAt = new Date('2026-03-07T11:00:00.000Z');
    const preferenceUpdatedAt = new Date('2026-03-07T12:00:00.000Z');
    const runCreatedAt = new Date('2026-03-08T10:00:00.000Z');
    const runCompletedAt = new Date('2026-03-08T11:00:00.000Z');
    const createdAt = new Date('2026-03-01T10:00:00.000Z');
    const updatedAt = new Date('2026-03-08T10:00:00.000Z');

    prisma.managedAccount.findUnique.mockResolvedValue({
      id: 'account-123',
      xHandle: 'creator_handle',
      displayName: 'Creator Name',
      category: 'startup',
      status: MANAGED_ACCOUNT_STATUS.ACTIVE,
      connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.HYBRID,
      goalsSummary: 'Grow reach with founder-led product content',
      notes: 'Internal note',
      archivedAt: null,
      createdAt,
      updatedAt,
      credentials: [
        {
          id: 'cred-1',
          status: 'ACTIVE',
          lastValidatedAt: credentialValidatedAt,
        },
        {
          id: 'cred-2',
          status: 'REVOKED',
          lastValidatedAt: null,
        },
      ],
      preferenceProfile: {
        id: 'pref-1',
        updatedAt: preferenceUpdatedAt,
      },
      competitors: [
        {
          id: 'comp-1',
          status: 'ACTIVE',
        },
        {
          id: 'comp-2',
          status: 'ARCHIVED',
        },
      ],
      researchRuns: [
        {
          id: 'run-1',
          status: 'COMPLETED',
          currentStage: 'FINALIZE_RUN',
          progressPercent: 100,
          warningCount: 1,
          errorCount: 0,
          createdAt: runCreatedAt,
          completedAt: runCompletedAt,
        },
      ],
    });

    await expect(service.getAccountDetail('account-123')).resolves.toEqual({
      id: 'account-123',
      xHandle: 'creator_handle',
      displayName: 'Creator Name',
      category: 'startup',
      status: MANAGED_ACCOUNT_STATUS.ACTIVE,
      connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.HYBRID,
      goalsSummary: 'Grow reach with founder-led product content',
      notes: 'Internal note',
      archivedAt: null,
      createdAt,
      updatedAt,
      readinessSummary: {
        credentials: {
          totalCount: 2,
          activeCount: 1,
          lastValidatedAt: credentialValidatedAt,
        },
        preferences: {
          isConfigured: true,
          updatedAt: preferenceUpdatedAt,
        },
        competitors: {
          totalCount: 2,
          activeCount: 1,
        },
      },
      latestRunSummary: {
        id: 'run-1',
        status: 'COMPLETED',
        currentStage: 'FINALIZE_RUN',
        progressPercent: 100,
        warningCount: 1,
        errorCount: 0,
        createdAt: runCreatedAt,
        completedAt: runCompletedAt,
      },
    });

    expect(prisma.managedAccount.findUnique).toHaveBeenCalledWith({
      where: { id: 'account-123' },
      select: {
        id: true,
        xHandle: true,
        displayName: true,
        category: true,
        status: true,
        connectionMode: true,
        goalsSummary: true,
        notes: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        credentials: {
          select: {
            id: true,
            status: true,
            lastValidatedAt: true,
          },
        },
        preferenceProfile: {
          select: {
            id: true,
            updatedAt: true,
          },
        },
        competitors: {
          select: {
            id: true,
            status: true,
          },
        },
        researchRuns: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            status: true,
            currentStage: true,
            progressPercent: true,
            warningCount: true,
            errorCount: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });
  });

  it('returns null latest run summary and unset readiness inputs when related data is missing', async () => {
    const createdAt = new Date('2026-03-01T10:00:00.000Z');
    const updatedAt = new Date('2026-03-08T10:00:00.000Z');

    prisma.managedAccount.findUnique.mockResolvedValue({
      id: 'account-123',
      xHandle: 'creator_handle',
      displayName: null,
      category: 'startup',
      status: MANAGED_ACCOUNT_STATUS.ACTIVE,
      connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.API_ONLY,
      goalsSummary: null,
      notes: null,
      archivedAt: null,
      createdAt,
      updatedAt,
      credentials: [],
      preferenceProfile: null,
      competitors: [],
      researchRuns: [],
    });

    await expect(service.getAccountDetail('account-123')).resolves.toMatchObject({
      readinessSummary: {
        credentials: {
          totalCount: 0,
          activeCount: 0,
          lastValidatedAt: null,
        },
        preferences: {
          isConfigured: false,
          updatedAt: null,
        },
        competitors: {
          totalCount: 0,
          activeCount: 0,
        },
      },
      latestRunSummary: null,
    });
  });

  it('throws a managed-account-not-found exception for unknown accounts', async () => {
    prisma.managedAccount.findUnique.mockResolvedValue(null);

    const missingAccountRequest = service.getAccountDetail('account-missing');

    await expect(missingAccountRequest).rejects.toThrow(
      ManagedAccountNotFoundException,
    );
    await expect(missingAccountRequest).rejects.toMatchObject({
      code: API_ERROR_CODES.MANAGED_ACCOUNT_NOT_FOUND,
      message: MANAGED_ACCOUNT_NOT_FOUND_API_MESSAGE,
    });
  });

  it('lists managed accounts with pagination metadata and no filters by default', async () => {
    const createdAt = new Date('2026-03-08T10:00:00.000Z');
    const updatedAt = new Date('2026-03-08T10:00:00.000Z');

    prisma.managedAccount.findMany.mockResolvedValue([
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
    ]);
    prisma.managedAccount.count.mockResolvedValue(1);

    await expect(
      service.listAccounts(new ListManagedAccountsQueryDto()),
    ).resolves.toEqual({
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
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });

    expect(prisma.managedAccount.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        xHandle: true,
        displayName: true,
        category: true,
        status: true,
        connectionMode: true,
        goalsSummary: true,
        notes: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(prisma.managedAccount.count).toHaveBeenCalledWith({ where: {} });
  });

  it('applies the status filter to the managed account list query', async () => {
    prisma.managedAccount.findMany.mockResolvedValue([]);
    prisma.managedAccount.count.mockResolvedValue(0);

    const query = new ListManagedAccountsQueryDto();
    query.status = MANAGED_ACCOUNT_STATUS.PAUSED;

    await service.listAccounts(query);

    expect(prisma.managedAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: MANAGED_ACCOUNT_STATUS.PAUSED,
        },
      }),
    );
    expect(prisma.managedAccount.count).toHaveBeenCalledWith({
      where: {
        status: MANAGED_ACCOUNT_STATUS.PAUSED,
      },
    });
  });

  it('applies the category filter to the managed account list query', async () => {
    prisma.managedAccount.findMany.mockResolvedValue([]);
    prisma.managedAccount.count.mockResolvedValue(0);

    const query = new ListManagedAccountsQueryDto();
    query.category = 'startup';

    await service.listAccounts(query);

    expect(prisma.managedAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          category: 'startup',
        },
      }),
    );
    expect(prisma.managedAccount.count).toHaveBeenCalledWith({
      where: {
        category: 'startup',
      },
    });
  });

  it('applies the search filter across xHandle, displayName, and category', async () => {
    prisma.managedAccount.findMany.mockResolvedValue([]);
    prisma.managedAccount.count.mockResolvedValue(0);

    const query = new ListManagedAccountsQueryDto();
    query.search = 'founder';

    await service.listAccounts(query);

    expect(prisma.managedAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            {
              xHandle: {
                contains: 'founder',
                mode: 'insensitive',
              },
            },
            {
              displayName: {
                contains: 'founder',
                mode: 'insensitive',
              },
            },
            {
              category: {
                contains: 'founder',
                mode: 'insensitive',
              },
            },
          ],
        },
      }),
    );
    expect(prisma.managedAccount.count).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            xHandle: {
              contains: 'founder',
              mode: 'insensitive',
            },
          },
          {
            displayName: {
              contains: 'founder',
              mode: 'insensitive',
            },
          },
          {
            category: {
              contains: 'founder',
              mode: 'insensitive',
            },
          },
        ],
      },
    });
  });

  it('creates a managed account and persists the authenticated admin user id', async () => {
    const createdAt = new Date('2026-03-08T10:00:00.000Z');
    const updatedAt = new Date('2026-03-08T10:00:00.000Z');

    prisma.managedAccount.findUnique.mockResolvedValue(null);
    prisma.managedAccount.create.mockResolvedValue({
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

    await expect(
      service.createAccount(
        {
          xHandle: 'creator_handle',
          displayName: 'Creator Name',
          category: 'startup',
          connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.HYBRID,
          goalsSummary: 'Grow reach with founder-led product content',
        },
        'admin-123',
      ),
    ).resolves.toEqual({
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

    expect(prisma.managedAccount.findUnique).toHaveBeenCalledWith({
      where: {
        xHandle: 'creator_handle',
      },
      select: {
        id: true,
      },
    });
    expect(prisma.managedAccount.create).toHaveBeenCalledWith({
      data: {
        xHandle: 'creator_handle',
        displayName: 'Creator Name',
        category: 'startup',
        connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.HYBRID,
        goalsSummary: 'Grow reach with founder-led product content',
        createdByAdminUserId: 'admin-123',
      },
      select: {
        id: true,
        xHandle: true,
        displayName: true,
        category: true,
        status: true,
        connectionMode: true,
        goalsSummary: true,
        notes: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('rejects duplicate handles found before create', async () => {
    prisma.managedAccount.findUnique.mockResolvedValue({ id: 'account-123' });

    const duplicateRequest = service.createAccount(
      {
        xHandle: 'creator_handle',
        category: 'startup',
        connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.API_ONLY,
      },
      'admin-123',
    );

    await expect(duplicateRequest).rejects.toThrow(
      DuplicateManagedAccountHandleException,
    );
    await expect(duplicateRequest).rejects.toMatchObject({
      code: API_ERROR_CODES.DUPLICATE_HANDLE,
      getStatus: expect.any(Function),
    });

    expect(prisma.managedAccount.create).not.toHaveBeenCalled();
  });

  it('maps a unique constraint race on xHandle into the duplicate-handle exception', async () => {
    prisma.managedAccount.findUnique.mockResolvedValue(null);
    prisma.managedAccount.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.16.2',
        meta: {
          target: ['xHandle'],
        },
      }),
    );

    await expect(
      service.createAccount(
        {
          xHandle: 'creator_handle',
          category: 'startup',
          connectionMode: MANAGED_ACCOUNT_CONNECTION_MODE.BROWSER_ONLY,
        },
        'admin-123',
      ),
    ).rejects.toMatchObject({
      code: API_ERROR_CODES.DUPLICATE_HANDLE,
      message: DUPLICATE_HANDLE_API_MESSAGE,
    });
  });

  it('returns an empty managed account list with stable pagination metadata', async () => {
    prisma.managedAccount.findMany.mockResolvedValue([]);
    prisma.managedAccount.count.mockResolvedValue(0);

    const query = new ListManagedAccountsQueryDto();
    query.page = 2;
    query.pageSize = 5;

    await expect(service.listAccounts(query)).resolves.toEqual({
      items: [],
      pagination: {
        page: 2,
        pageSize: 5,
        totalItems: 0,
        totalPages: 1,
      },
    });
  });
});