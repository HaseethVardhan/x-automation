import { Body, Controller, Get, Module, Post, Query } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request, { type Response as SupertestResponse } from 'supertest';
import { IsEmail, IsString } from 'class-validator';
import { ApiException } from '../errors/api.exception';
import { API_ERROR_CODES } from '../errors/error-codes';
import {
  buildPaginationMeta,
  PageQueryDto,
} from '../pagination/page-query.dto';
import {
  apiResponse,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from './api-response';
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
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .get('/conventions-test/success')
      .set(REQUEST_ID_HEADER, 'req-123')
      .expect(200)
      .expect(REQUEST_ID_HEADER, 'req-123')
      .expect((response: SupertestResponse) => {
        const body = getSuccessBody<{ status: string }>(response);

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
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .get('/conventions-test/paginated?page=2&pageSize=5')
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = getSuccessBody<Array<{ id: number }>>(response);

        expect(body.success).toBe(true);
        expect(body.data).toEqual([{ id: 1 }]);
        expect(body.meta?.pagination).toEqual({
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
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .get('/conventions-test/error')
      .expect(409)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);

        expect(body.success).toBe(false);
        expect(typeof body.requestId).toBe('string');
        expect(body.error.code).toBe(API_ERROR_CODES.RESOURCE_CONFLICT);
        expect(body.error.message).toBe('Conflict detected');
      });

    await app.close();
  });

  it('applies the shared validation configuration and error taxonomy', async () => {
    const app = await createApp();
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/conventions-test/validation')
      .send({ email: 'not-an-email', password: 42, extra: true })
      .expect(400)
      .expect((response: SupertestResponse) => {
        const body = getErrorBody(response);
        const details = getValidationDetails(body);
        const emailIssue = details.find((detail) => detail.field === 'email');
        const extraIssue = details.find((detail) => detail.field === 'extra');

        expect(body.success).toBe(false);
        expect(body.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED);
        expect(body.error.message).toBe('Request validation failed');
        expect(emailIssue).toBeDefined();
        expect(emailIssue?.errors).toContain('email must be an email');
        expect(extraIssue).toBeDefined();
        expect(extraIssue?.errors).toContain('property extra should not exist');
      });

    await app.close();
  });
});

async function createApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [ConventionsTestModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication>();
  configureHttpApp(app);
  await app.init();

  return app;
}

function getHttpServer(app: INestApplication) {
  return app.getHttpServer() as Parameters<typeof request>[0];
}

function getSuccessBody<T>(response: SupertestResponse): ApiSuccessResponse<T> {
  const body = parseResponseBody(response.text);

  return body as ApiSuccessResponse<T>;
}

function getErrorBody(response: SupertestResponse): ApiErrorResponse {
  const body = parseResponseBody(response.text);

  return body as ApiErrorResponse;
}

function getValidationDetails(
  body: ApiErrorResponse,
): Array<{ field: string; errors: string[] }> {
  expect(Array.isArray(body.error.details)).toBe(true);

  return body.error.details as Array<{
    field: string;
    errors: string[];
  }>;
}

function parseResponseBody(responseText: string): unknown {
  return JSON.parse(responseText) as unknown;
}
