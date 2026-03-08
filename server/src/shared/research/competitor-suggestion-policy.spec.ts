import {
  canSuggestionStatusReappearInFutureRun,
  COMPETITOR_SUGGESTION_ACCEPTS_IMMEDIATELY,
  COMPETITOR_SUGGESTION_EXPIRED_REAPPEAR_COOLDOWN_DAYS,
  COMPETITOR_SUGGESTION_EXPIRED_REAPPEARS_IN_FUTURE_RUNS,
  COMPETITOR_SUGGESTION_MANUAL_REFRESH_SUPPORTED,
  COMPETITOR_SUGGESTION_PENDING_EXPIRATION_DAYS,
  COMPETITOR_SUGGESTION_REJECTED_REAPPEARS_IN_V1,
  COMPETITOR_SUGGESTION_SOURCE,
  COMPETITOR_SUGGESTION_STATUS,
  isSuggestionExpired,
  suggestionExpiresAt,
} from './competitor-suggestion-policy';

describe('competitor suggestion policy', () => {
  it('locks suggestion generation to research runs and disables manual refresh', () => {
    expect(COMPETITOR_SUGGESTION_SOURCE).toBe('research-run-only');
    expect(COMPETITOR_SUGGESTION_MANUAL_REFRESH_SUPPORTED).toBe(false);
  });

  it('makes accepted suggestions active immediately', () => {
    expect(COMPETITOR_SUGGESTION_ACCEPTS_IMMEDIATELY).toBe(true);
  });

  it('expires pending suggestions after the fixed retention window', () => {
    const createdAt = new Date('2026-03-08T00:00:00.000Z');

    expect(COMPETITOR_SUGGESTION_PENDING_EXPIRATION_DAYS).toBe(30);
    expect(suggestionExpiresAt(createdAt).toISOString()).toBe(
      '2026-04-07T00:00:00.000Z',
    );
    expect(
      isSuggestionExpired(createdAt, new Date('2026-04-06T23:59:59.000Z')),
    ).toBe(false);
    expect(
      isSuggestionExpired(createdAt, new Date('2026-04-07T00:00:00.000Z')),
    ).toBe(true);
  });

  it('prevents rejected suggestions from resurfacing automatically in v1', () => {
    expect(COMPETITOR_SUGGESTION_REJECTED_REAPPEARS_IN_V1).toBe(false);
    expect(
      canSuggestionStatusReappearInFutureRun(
        COMPETITOR_SUGGESTION_STATUS.REJECTED,
      ),
    ).toBe(false);
  });

  it('allows expired suggestions to reappear only in later runs after cooldown', () => {
    expect(COMPETITOR_SUGGESTION_EXPIRED_REAPPEARS_IN_FUTURE_RUNS).toBe(true);
    expect(COMPETITOR_SUGGESTION_EXPIRED_REAPPEAR_COOLDOWN_DAYS).toBe(30);
    expect(
      canSuggestionStatusReappearInFutureRun(COMPETITOR_SUGGESTION_STATUS.EXPIRED),
    ).toBe(true);
    expect(
      canSuggestionStatusReappearInFutureRun(COMPETITOR_SUGGESTION_STATUS.ACCEPTED),
    ).toBe(false);
  });
});