import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ApiException } from '../shared/errors/api.exception';
import { API_ERROR_CODES } from '../shared/errors/error-codes';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  const prisma = {
    adminUser: {
      findUnique: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as JwtService;

  const bcryptCompare = jest.mocked(bcrypt.compare);

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as never, jwtService);
  });

  it('returns the access token with minimal user identity fields', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin-123',
      email: 'owner@example.com',
      passwordHash: 'stored-hash',
    });
    bcryptCompare.mockResolvedValue(true as never);
    (jwtService.signAsync as jest.Mock).mockResolvedValue('jwt-token');

    await expect(
      service.login({ email: 'owner@example.com', password: 'secret' }),
    ).resolves.toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'admin-123',
        email: 'owner@example.com',
      },
    });

    expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'owner@example.com' },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'admin-123',
      email: 'owner@example.com',
    });
  });

  it('throws AUTH_INVALID_CREDENTIALS when the user does not exist', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'secret' }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      message: 'Invalid email or password',
    } satisfies Partial<ApiException>);
  });

  it('throws AUTH_INVALID_CREDENTIALS when the password is invalid', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin-123',
      email: 'owner@example.com',
      passwordHash: 'stored-hash',
    });
    bcryptCompare.mockResolvedValue(false as never);

    await expect(
      service.login({ email: 'owner@example.com', password: 'bad-password' }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      message: 'Invalid email or password',
    } satisfies Partial<ApiException>);
  });
});