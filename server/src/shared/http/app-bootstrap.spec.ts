import {
  Body,
  Controller,
  Get,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { IsEmail, IsString } from 'class-validator';
import { ApiException } from '../errors/api.exception';
import { API_ERROR_CODES } from '../errors/error-codes';
import { buildPaginationMeta, PageQueryDto } from '../pagination/page-query.dto';
import { apiResponse } from './api-response';
import { configureHttpApp } from './app-bootstrap';
import { REQUEST_ID_HEADER } from './request-context';

class ValidationTestDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

@Controller('conventions-test')
class ConventionsTestController {
  @Get('success')
  getSuccess() {
    return { status: 'ok' };
  }

  @Get('paginated')
  getPaginated(@Query() query: PageQueryDto) {
    return apiResponse([{ id: 1 }], {
      pagination: buildPaginationMeta({
        page: query.page,
        pageSize: query.pageSize,
        totalItems: 35,
      }),
    });
  }

  @Get('error')
  getError() {
    throw new ApiException({
      status: 409,
      code: API_ERROR_CODES.RESOURCE_CONFLICT,
      message: 'Conflict detected',
    });
  }

  @Post('validation')
  create(@Body() dto: ValidationTestDto) {
    return dto;
  }
}

@Module({
  controllers: [ConventionsTestController],
})
class ConventionsTestModule {}

describe('shared backend conventions', () => {
  it('wraps successful responses and preserves incoming request ids', async () => {
    const app = await createApp();

    await request(app.getHttpServer())
      .get('/conventions-test/success')
      .set(REQUEST_ID_HEADER, 'req-123')
      .expect(200)
      .expect(REQUEST_ID_HEADER, 'req-123')
      .expect(({ body }) => {
        expect(body).toEqual({
          success: true,
          requestId: 'req-123',
          data: { status: 'ok' },
        });
      });

    await app.close();
  });

  it('surfaces pagination metadata in the shared success envelope', async () => {
    const app = await createApp();

    await request(app.getHttpServer())
      .get('/conventions-test/paginated?page=2&pageSize=5')
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(body.data).toEqual([{ id: 1 }]);
        expect(body.meta.pagination).toEqual({
          page: 2,
          pageSize: 5,
          totalItems: 35,
          totalPages: 7,
        });
        expect(body.requestId).toEqual(expect.any(String));
      });

    await app.close();
  });

  it('maps application exceptions into the shared error envelope', async () => {
    const app = await createApp();

    await request(app.getHttpServer())
      .get('/conventions-test/error')
      .expect(409)
      .expect(({ body }) => {
        expect(body).toEqual({
          success: false,
          requestId: expect.any(String),
          error: {
            code: API_ERROR_CODES.RESOURCE_CONFLICT,
            message: 'Conflict detected',
          },
        });
      });

    await app.close();
  });

  it('applies the shared validation configuration and error taxonomy', async () => {
    const app = await createApp();

    await request(app.getHttpServer())
      .post('/conventions-test/validation')
      .send({ email: 'not-an-email', password: 42, extra: true })
      .expect(400)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED);
        expect(body.error.message).toBe('Request validation failed');
        expect(body.error.details).toEqual(
          expect.arrayContaining([
            {
              field: 'email',
              errors: expect.arrayContaining(['email must be an email']),
            },
            {
              field: 'extra',
              errors: expect.arrayContaining([
                'property extra should not exist',
              ]),
            },
          ]),
        );
      });

    await app.close();
  });
});

async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [ConventionsTestModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureHttpApp(app);
  await app.init();

  return app;
}