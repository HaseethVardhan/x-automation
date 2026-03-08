import { type ZodError, type ZodIssue, type ZodType } from 'zod';

export class SchemaValidationError extends Error {
  readonly issues: SchemaValidationIssue[];

  constructor(message: string, issues: SchemaValidationIssue[]) {
    super(message);
    this.name = 'SchemaValidationError';
    this.issues = issues;
  }
}

export type SchemaValidationIssue = {
  path: string;
  message: string;
};

export function parseWithSchema<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  throw new SchemaValidationError(
    'Schema validation failed',
    formatSchemaIssues(result.error),
  );
}

export function formatSchemaIssues(
  error: Pick<ZodError, 'issues'>,
): SchemaValidationIssue[] {
  return error.issues.map((issue) => ({
    path: formatIssuePath(issue),
    message: issue.message,
  }));
}

function formatIssuePath(issue: ZodIssue): string {
  return issue.path.length > 0 ? issue.path.join('.') : 'root';
}
