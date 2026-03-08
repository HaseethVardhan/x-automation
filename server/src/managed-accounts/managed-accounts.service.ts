import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildPaginationMeta, type PaginationMeta } from '../shared/pagination/page-query.dto';
import { findBlockingActiveResearchRun } from '../shared/research/research-run-policy';
import {
	MANAGED_ACCOUNT_STATUS,
	type ManagedAccountConnectionMode,
	type ManagedAccountMutableStatus,
	type ManagedAccountStatus,
} from './managed-account.constants';
import { CreateManagedAccountDto } from './dto/create-managed-account.dto';
import { ListManagedAccountsQueryDto } from './dto/list-managed-accounts-query.dto';
import { UpdateManagedAccountDto } from './dto/update-managed-account.dto';
import {
	AccountArchiveBlockedByActiveRunException,
	AccountAlreadyArchivedException,
	DuplicateManagedAccountHandleException,
	ManagedAccountNotFoundException,
} from './managed-accounts.errors';

@Injectable()
export class ManagedAccountsService {
	constructor(private readonly prisma: PrismaService) {}

	async archiveAccount(accountId: string): Promise<ManagedAccountResponse> {
		const account = await this.prisma.managedAccount.findUnique({
			where: { id: accountId },
			select: MANAGED_ACCOUNT_ARCHIVE_SELECT,
		});

		if (!account) {
			throw new ManagedAccountNotFoundException(accountId);
		}

		if (account.status === MANAGED_ACCOUNT_STATUS.ARCHIVED) {
			throw new AccountAlreadyArchivedException(accountId);
		}

		const blockingRun = findBlockingActiveResearchRun(account.researchRuns);

		if (blockingRun) {
			throw new AccountArchiveBlockedByActiveRunException(blockingRun);
		}

		return this.prisma.managedAccount.update({
			where: { id: accountId },
			data: {
				status: MANAGED_ACCOUNT_STATUS.ARCHIVED,
				archivedAt: new Date(),
			},
			select: MANAGED_ACCOUNT_RESPONSE_SELECT,
		});
	}

	async updateAccount(
		accountId: string,
		updateManagedAccountDto: UpdateManagedAccountDto,
	): Promise<ManagedAccountResponse> {
		const account = await this.prisma.managedAccount.findUnique({
			where: { id: accountId },
			select: MANAGED_ACCOUNT_RESPONSE_SELECT,
		});

		if (!account) {
			throw new ManagedAccountNotFoundException(accountId);
		}

		if (account.status === MANAGED_ACCOUNT_STATUS.ARCHIVED) {
			throw new AccountAlreadyArchivedException(accountId);
		}

		const data = buildManagedAccountUpdateData(updateManagedAccountDto);

		if (Object.keys(data).length === 0) {
			return account;
		}

		return this.prisma.managedAccount.update({
			where: { id: accountId },
			data,
			select: MANAGED_ACCOUNT_RESPONSE_SELECT,
		});
	}

	async getAccountDetail(accountId: string): Promise<ManagedAccountDetailResponse> {
		const account = await this.prisma.managedAccount.findUnique({
			where: { id: accountId },
			select: MANAGED_ACCOUNT_DETAIL_SELECT,
		});

		if (!account) {
			throw new ManagedAccountNotFoundException(accountId);
		}

		const activeCredentialCount = account.credentials.filter(
			(credential) => credential.status === 'ACTIVE',
		).length;
		const activeCompetitorCount = account.competitors.filter(
			(competitor) => competitor.status === 'ACTIVE',
		).length;

		return {
			id: account.id,
			xHandle: account.xHandle,
			displayName: account.displayName,
			category: account.category,
			status: account.status,
			connectionMode: account.connectionMode,
			goalsSummary: account.goalsSummary,
			notes: account.notes,
			archivedAt: account.archivedAt,
			createdAt: account.createdAt,
			updatedAt: account.updatedAt,
			readinessSummary: {
				credentials: {
					totalCount: account.credentials.length,
					activeCount: activeCredentialCount,
					lastValidatedAt: getLatestDate(
						account.credentials
							.map((credential) => credential.lastValidatedAt)
							.filter((date): date is Date => date instanceof Date),
					),
				},
				preferences: {
					isConfigured: account.preferenceProfile !== null,
					updatedAt: account.preferenceProfile?.updatedAt ?? null,
				},
				competitors: {
					totalCount: account.competitors.length,
					activeCount: activeCompetitorCount,
				},
			},
			latestRunSummary: account.researchRuns[0]
				? {
						id: account.researchRuns[0].id,
						status: account.researchRuns[0].status,
						currentStage: account.researchRuns[0].currentStage,
						progressPercent: account.researchRuns[0].progressPercent,
						warningCount: account.researchRuns[0].warningCount,
						errorCount: account.researchRuns[0].errorCount,
						createdAt: account.researchRuns[0].createdAt,
						completedAt: account.researchRuns[0].completedAt,
					}
				: null,
		};
	}

	async listAccounts(
		query: ListManagedAccountsQueryDto,
	): Promise<ManagedAccountListResult> {
		const where = buildManagedAccountListWhere(query);
		const [items, totalItems] = await Promise.all([
			this.prisma.managedAccount.findMany({
				where,
				skip: (query.page - 1) * query.pageSize,
				take: query.pageSize,
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				select: MANAGED_ACCOUNT_RESPONSE_SELECT,
			}),
			this.prisma.managedAccount.count({ where }),
		]);

		return {
			items,
			pagination: buildPaginationMeta({
				page: query.page,
				pageSize: query.pageSize,
				totalItems,
			}),
		};
	}

	async createAccount(
		createManagedAccountDto: CreateManagedAccountDto,
		createdByAdminUserId: string,
	): Promise<ManagedAccountResponse> {
		const existingAccount = await this.prisma.managedAccount.findUnique({
			where: {
				xHandle: createManagedAccountDto.xHandle,
			},
			select: {
				id: true,
			},
		});

		if (existingAccount) {
			throw new DuplicateManagedAccountHandleException(
				createManagedAccountDto.xHandle,
			);
		}

		try {
			return await this.prisma.managedAccount.create({
				data: {
					xHandle: createManagedAccountDto.xHandle,
					displayName: createManagedAccountDto.displayName,
					category: createManagedAccountDto.category,
					connectionMode: createManagedAccountDto.connectionMode,
					goalsSummary: createManagedAccountDto.goalsSummary,
					createdByAdminUserId,
				},
				select: MANAGED_ACCOUNT_RESPONSE_SELECT,
			});
		} catch (error) {
			if (isDuplicateXHandleError(error)) {
				throw new DuplicateManagedAccountHandleException(
					createManagedAccountDto.xHandle,
				);
			}

			throw error;
		}
	}
}

const MANAGED_ACCOUNT_RESPONSE_SELECT = {
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
} satisfies Prisma.ManagedAccountSelect;

export type ManagedAccountResponse = {
	id: string;
	xHandle: string;
	displayName: string | null;
	category: string;
	status: ManagedAccountStatus;
	connectionMode: ManagedAccountConnectionMode;
	goalsSummary: string | null;
	notes: string | null;
	archivedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type ManagedAccountListResult = {
	items: ManagedAccountResponse[];
	pagination: PaginationMeta;
};

export type ManagedAccountDetailResponse = ManagedAccountResponse & {
	readinessSummary: {
		credentials: {
			totalCount: number;
			activeCount: number;
			lastValidatedAt: Date | null;
		};
		preferences: {
			isConfigured: boolean;
			updatedAt: Date | null;
		};
		competitors: {
			totalCount: number;
			activeCount: number;
		};
	};
	latestRunSummary: {
		id: string;
		status: string;
		currentStage: string | null;
		progressPercent: number;
		warningCount: number;
		errorCount: number;
		createdAt: Date;
		completedAt: Date | null;
	} | null;
};

const MANAGED_ACCOUNT_DETAIL_SELECT = {
	...MANAGED_ACCOUNT_RESPONSE_SELECT,
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
} satisfies Prisma.ManagedAccountSelect;

const MANAGED_ACCOUNT_ARCHIVE_SELECT = {
	...MANAGED_ACCOUNT_RESPONSE_SELECT,
	researchRuns: {
		where: {
			status: {
				in: ['QUEUED', 'RUNNING'],
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
		take: 1,
		select: {
			id: true,
			status: true,
		},
	},
} satisfies Prisma.ManagedAccountSelect;

function buildManagedAccountListWhere(
	query: ListManagedAccountsQueryDto,
): Prisma.ManagedAccountWhereInput {
	const where: Prisma.ManagedAccountWhereInput = {};

	if (query.status) {
		where.status = query.status;
	}

	if (query.category) {
		where.category = query.category;
	}

	if (query.search) {
		where.OR = [
			{
				xHandle: {
					contains: query.search,
					mode: 'insensitive',
				},
			},
			{
				displayName: {
					contains: query.search,
					mode: 'insensitive',
				},
			},
			{
				category: {
					contains: query.search,
					mode: 'insensitive',
				},
			},
		];
	}

	return where;
}

function getLatestDate(dates: Date[]): Date | null {
	if (dates.length === 0) {
		return null;
	}

	return dates.reduce((latestDate, currentDate) =>
		currentDate.getTime() > latestDate.getTime() ? currentDate : latestDate,
	);
}

function buildManagedAccountUpdateData(
	updateManagedAccountDto: UpdateManagedAccountDto,
): Prisma.ManagedAccountUpdateInput {
	const data: Prisma.ManagedAccountUpdateInput = {};

	if (hasOwn(updateManagedAccountDto, 'displayName')) {
		data.displayName = updateManagedAccountDto.displayName;
	}

	if (updateManagedAccountDto.category !== undefined) {
		data.category = updateManagedAccountDto.category;
	}

	if (hasOwn(updateManagedAccountDto, 'goalsSummary')) {
		data.goalsSummary = updateManagedAccountDto.goalsSummary;
	}

	if (hasOwn(updateManagedAccountDto, 'notes')) {
		data.notes = updateManagedAccountDto.notes;
	}

	if (updateManagedAccountDto.status !== undefined) {
		data.status = updateManagedAccountDto.status as ManagedAccountMutableStatus;
	}

	return data;
}

function hasOwn(value: object, property: string): boolean {
	return Object.prototype.hasOwnProperty.call(value, property);
}

function isDuplicateXHandleError(error: unknown): boolean {
	return (
		error instanceof Prisma.PrismaClientKnownRequestError &&
		error.code === 'P2002' &&
		Array.isArray(error.meta?.target) &&
		error.meta.target.includes('xHandle')
	);
}