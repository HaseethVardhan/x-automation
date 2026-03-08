import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
	type ManagedAccountConnectionMode,
	type ManagedAccountStatus,
} from './managed-account.constants';
import { CreateManagedAccountDto } from './dto/create-managed-account.dto';
import { DuplicateManagedAccountHandleException } from './managed-accounts.errors';

@Injectable()
export class ManagedAccountsService {
	constructor(private readonly prisma: PrismaService) {}

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

function isDuplicateXHandleError(error: unknown): boolean {
	return (
		error instanceof Prisma.PrismaClientKnownRequestError &&
		error.code === 'P2002' &&
		Array.isArray(error.meta?.target) &&
		error.meta.target.includes('xHandle')
	);
}