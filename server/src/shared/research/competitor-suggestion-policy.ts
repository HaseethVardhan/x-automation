export const COMPETITOR_SUGGESTION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

export type CompetitorSuggestionStatus =
  (typeof COMPETITOR_SUGGESTION_STATUS)[keyof typeof COMPETITOR_SUGGESTION_STATUS];

export const COMPETITOR_SUGGESTION_SOURCE = 'research-run-only' as const;

export const COMPETITOR_SUGGESTION_PENDING_EXPIRATION_DAYS = 30;

export const COMPETITOR_SUGGESTION_ACCEPTS_IMMEDIATELY = true;

export const COMPETITOR_SUGGESTION_MANUAL_REFRESH_SUPPORTED = false;

export const COMPETITOR_SUGGESTION_REJECTED_REAPPEARS_IN_V1 = false;

export const COMPETITOR_SUGGESTION_EXPIRED_REAPPEARS_IN_FUTURE_RUNS = true;

export const COMPETITOR_SUGGESTION_EXPIRED_REAPPEAR_COOLDOWN_DAYS = 30;

export function suggestionExpiresAt(createdAt: Date): Date {
  const expiresAt = new Date(createdAt);
  expiresAt.setUTCDate(
    expiresAt.getUTCDate() + COMPETITOR_SUGGESTION_PENDING_EXPIRATION_DAYS,
  );
  return expiresAt;
}

export function isSuggestionExpired(
  createdAt: Date,
  now: Date = new Date(),
): boolean {
  return suggestionExpiresAt(createdAt).getTime() <= now.getTime();
}

export function canSuggestionStatusReappearInFutureRun(
  status: CompetitorSuggestionStatus,
): boolean {
  return status === COMPETITOR_SUGGESTION_STATUS.EXPIRED;
}
