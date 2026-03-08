import {
  assertNoBlockingActiveResearchRun,
  findBlockingActiveResearchRun,
  isActiveResearchRunStatus,
  isCancelableResearchRunStatus,
  RESEARCH_RUN_STATUS,
  RUN_ALREADY_ACTIVE_API_MESSAGE,
  RUN_ALREADY_ACTIVE_ERROR_CODE,
  RUN_ALREADY_ACTIVE_UI_MESSAGE,
  RunAlreadyActiveException,
} from './research-run-policy';

describe('research run policy', () => {
  it('treats queued and running statuses as active', () => {
    expect(isActiveResearchRunStatus(RESEARCH_RUN_STATUS.QUEUED)).toBe(true);
    expect(isActiveResearchRunStatus(RESEARCH_RUN_STATUS.RUNNING)).toBe(true);
    expect(isActiveResearchRunStatus(RESEARCH_RUN_STATUS.CANCELED)).toBe(false);
    expect(isActiveResearchRunStatus(RESEARCH_RUN_STATUS.COMPLETED)).toBe(
      false,
    );
  });

  it('allows cancel then rerun by making only queued and running cancelable', () => {
    expect(isCancelableResearchRunStatus(RESEARCH_RUN_STATUS.QUEUED)).toBe(
      true,
    );
    expect(isCancelableResearchRunStatus(RESEARCH_RUN_STATUS.RUNNING)).toBe(
      true,
    );
    expect(isCancelableResearchRunStatus(RESEARCH_RUN_STATUS.CANCELED)).toBe(
      false,
    );
    expect(isCancelableResearchRunStatus(RESEARCH_RUN_STATUS.REVIEWED)).toBe(
      false,
    );
  });

  it('finds the first active run that blocks a new run', () => {
    const blockingRun = findBlockingActiveResearchRun([
      { id: 'run-completed', status: RESEARCH_RUN_STATUS.COMPLETED },
      { id: 'run-queued', status: RESEARCH_RUN_STATUS.QUEUED },
      { id: 'run-running', status: RESEARCH_RUN_STATUS.RUNNING },
    ]);

    expect(blockingRun).toEqual({
      id: 'run-queued',
      status: RESEARCH_RUN_STATUS.QUEUED,
    });
  });

  it('allows a new run when all previous runs are terminal or canceled', () => {
    expect(() =>
      assertNoBlockingActiveResearchRun([
        { id: 'run-canceled', status: RESEARCH_RUN_STATUS.CANCELED },
        { id: 'run-failed', status: RESEARCH_RUN_STATUS.FAILED },
        { id: 'run-completed', status: RESEARCH_RUN_STATUS.COMPLETED },
      ]),
    ).not.toThrow();
  });

  it('rejects superseding an active run with a conflict error', () => {
    expect(() =>
      assertNoBlockingActiveResearchRun([
        { id: 'run-running', status: RESEARCH_RUN_STATUS.RUNNING },
      ]),
    ).toThrow(RunAlreadyActiveException);

    try {
      assertNoBlockingActiveResearchRun([
        { id: 'run-running', status: RESEARCH_RUN_STATUS.RUNNING },
      ]);
    } catch (error) {
      expect(error).toBeInstanceOf(RunAlreadyActiveException);
      expect((error as RunAlreadyActiveException).getResponse()).toEqual({
        code: RUN_ALREADY_ACTIVE_ERROR_CODE,
        message: RUN_ALREADY_ACTIVE_API_MESSAGE,
        details: {
          blockingRunId: 'run-running',
          blockingRunStatus: RESEARCH_RUN_STATUS.RUNNING,
        },
      });
    }
  });

  it('publishes a fixed UI message for blocked run creation', () => {
    expect(RUN_ALREADY_ACTIVE_UI_MESSAGE).toBe(
      'A research run is already queued or running for this account. Cancel the active run before starting another.',
    );
  });
});
