import { z } from 'zod';
import {
  formatSchemaIssues,
  parseWithSchema,
  SchemaValidationError,
} from './schema-validation';

describe('schema validation helpers', () => {
  it('parses valid values with zod schemas', () => {
    const value = parseWithSchema(
      z.object({ topic: z.string(), score: z.number() }),
      { topic: 'automation', score: 0.8 },
    );

    expect(value).toEqual({ topic: 'automation', score: 0.8 });
  });

  it('surfaces normalized issues when schema parsing fails', () => {
    expect(() =>
      parseWithSchema(
        z.object({
          topic: z.string(),
          score: z.number().min(0.5),
        }),
        { topic: 42, score: 0.1 },
      ),
    ).toThrow(SchemaValidationError);

    try {
      parseWithSchema(
        z.object({
          topic: z.string(),
          score: z.number().min(0.5),
        }),
        { topic: 42, score: 0.1 },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).issues).toEqual([
        {
          path: 'topic',
          message: 'Invalid input: expected string, received number',
        },
        {
          path: 'score',
          message: 'Too small: expected number to be >=0.5',
        },
      ]);
    }
  });

  it('formats root-level zod issues consistently', () => {
    const result = z.string().safeParse(15);

    expect(result.success).toBe(false);
    expect(formatSchemaIssues(result.error)).toEqual([
      {
        path: 'root',
        message: 'Invalid input: expected string, received number',
      },
    ]);
  });
});
