import { Prisma } from '@prisma/client';
import { API_ERROR_CODES } from '../shared/errors/error-codes';
import {
  MANAGED_ACCOUNT_CONNECTION_MODE,
  MANAGED_ACCOUNT_STATUS,
} from './managed-account.constants';
import {
  DUPLICATE_HANDLE_API_MESSAGE,
  DuplicateManagedAccountHandleException,
} from './managed-accounts.errors';
import { ManagedAccountsService } from './managed-accounts.service';

describe('ManagedAccountsService', () => {
  const prisma = {
    managedAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  let service: ManagedAccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ManagedAccountsService(prisma as never);
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
});