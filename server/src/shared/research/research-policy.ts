export const CREATOR_HISTORY_POLICY_SCOPE = 'global' as const;

export type CreatorHistoryPolicyScope = typeof CREATOR_HISTORY_POLICY_SCOPE;

export type CreatorHistoryPolicy = Readonly<{
  scope: CreatorHistoryPolicyScope;
  rollingWindowDays: number;
  targetPostCount: number;
  minimumViablePostCount: number;
  backfillWindowDays: number;
  absolutePostCap: number;
}>;

export type BoundedIntegerPolicy = Readonly<{
  defaultValue: number;
  minimumValue: number;
  maximumValue: number;
}>;

export const CREATOR_HISTORY_POLICY: CreatorHistoryPolicy = Object.freeze({
  scope: CREATOR_HISTORY_POLICY_SCOPE,
  rollingWindowDays: 180,
  targetPostCount: 120,
  minimumViablePostCount: 40,
  backfillWindowDays: 365,
  absolutePostCap: 250,
});

export const NOVELTY_LOOKBACK_DAYS_POLICY: BoundedIntegerPolicy = Object.freeze(
  {
    defaultValue: 120,
    minimumValue: 30,
    maximumValue: 365,
  },
);

export function isNoveltyLookbackDaysInRange(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= NOVELTY_LOOKBACK_DAYS_POLICY.minimumValue &&
    value <= NOVELTY_LOOKBACK_DAYS_POLICY.maximumValue
  );
}

export function assertValidNoveltyLookbackDays(value: unknown): number {
  if (!isNoveltyLookbackDaysInRange(value)) {
    throw new RangeError(
      `noveltyLookbackDays must be an integer between ${NOVELTY_LOOKBACK_DAYS_POLICY.minimumValue} and ${NOVELTY_LOOKBACK_DAYS_POLICY.maximumValue}`,
    );
  }

  return value;
}
