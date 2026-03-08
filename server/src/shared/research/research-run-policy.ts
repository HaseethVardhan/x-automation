import { ConflictException } from '@nestjs/common';

export const RESEARCH_RUN_STATUS = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
  COMPLETED: 'COMPLETED',
  REVIEWED: 'REVIEWED',
  CANCELED: 'CANCELED',
} as const;

export type ResearchRunStatus =
  (typeof RESEARCH_RUN_STATUS)[keyof typeof RESEARCH_RUN_STATUS];

export type RunReference = Readonly<{
  id: string;
  status: ResearchRunStatus;
}>;

export const ACTIVE_RESEARCH_RUN_STATUSES = Object.freeze([
  RESEARCH_RUN_STATUS.QUEUED,
  RESEARCH_RUN_STATUS.RUNNING,
] as const);

export const CANCELABLE_RESEARCH_RUN_STATUSES = Object.freeze([
  RESEARCH_RUN_STATUS.QUEUED,
  RESEARCH_RUN_STATUS.RUNNING,
] as const);

export const RUN_ALREADY_ACTIVE_ERROR_CODE = 'RUN_ALREADY_ACTIVE' as const;

export const RUN_ALREADY_ACTIVE_API_MESSAGE =
  'A queued or running research run already exists for this managed account. Cancel it before starting another run.';

export const RUN_ALREADY_ACTIVE_UI_MESSAGE =
  'A research run is already queued or running for this account. Cancel the active run before starting another.';

export function isActiveResearchRunStatus(status: ResearchRunStatus): boolean {
  return ACTIVE_RESEARCH_RUN_STATUSES.includes(
    status as (typeof ACTIVE_RESEARCH_RUN_STATUSES)[number],
  );
}

export function isCancelableResearchRunStatus(
  status: ResearchRunStatus,
): boolean {
  return CANCELABLE_RESEARCH_RUN_STATUSES.includes(
    status as (typeof CANCELABLE_RESEARCH_RUN_STATUSES)[number],
  );
}

export function findBlockingActiveResearchRun<T extends RunReference>(
  runs: readonly T[],
): T | undefined {
  return runs.find((run) => isActiveResearchRunStatus(run.status));
}

export function assertNoBlockingActiveResearchRun<T extends RunReference>(
  runs: readonly T[],
): void {
  const blockingRun = findBlockingActiveResearchRun(runs);

  if (blockingRun) {
    throw new RunAlreadyActiveException(blockingRun);
  }
}

export class RunAlreadyActiveException extends ConflictException {
  constructor(run: RunReference) {
    super({
      code: RUN_ALREADY_ACTIVE_ERROR_CODE,
      message: RUN_ALREADY_ACTIVE_API_MESSAGE,
      details: {
        blockingRunId: run.id,
        blockingRunStatus: run.status,
      },
    });
  }
}
