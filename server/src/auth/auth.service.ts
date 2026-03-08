import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException } from '../shared/errors/api.exception';
import { API_ERROR_CODES } from '../shared/errors/error-codes';
import { LoginDto } from './dto/login.dto';

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new ApiException({
        status: HttpStatus.UNAUTHORIZED,
        code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new ApiException({
        status: HttpStatus.UNAUTHORIZED,
        code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
