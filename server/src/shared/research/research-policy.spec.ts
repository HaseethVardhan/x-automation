import {
  assertValidNoveltyLookbackDays,
  CREATOR_HISTORY_POLICY,
  CREATOR_HISTORY_POLICY_SCOPE,
  NOVELTY_LOOKBACK_DAYS_POLICY,
  isNoveltyLookbackDaysInRange,
} from './research-policy';

describe('research policy', () => {
  it('locks the v1 creator history collection policy', () => {
    expect(CREATOR_HISTORY_POLICY).toEqual({
      scope: CREATOR_HISTORY_POLICY_SCOPE,
      rollingWindowDays: 180,
      targetPostCount: 120,
      minimumViablePostCount: 40,
      backfillWindowDays: 365,
      absolutePostCap: 250,
    });
  });

  it('locks the novelty lookback default and bounds', () => {
    expect(NOVELTY_LOOKBACK_DAYS_POLICY).toEqual({
      defaultValue: 120,
      minimumValue: 30,
      maximumValue: 365,
    });
  });

  it('accepts novelty lookback values within the approved range', () => {
    expect(isNoveltyLookbackDaysInRange(30)).toBe(true);
    expect(isNoveltyLookbackDaysInRange(120)).toBe(true);
    expect(isNoveltyLookbackDaysInRange(365)).toBe(true);
    expect(assertValidNoveltyLookbackDays(120)).toBe(120);
  });

  it('rejects novelty lookback values outside the approved range', () => {
    expect(isNoveltyLookbackDaysInRange(29)).toBe(false);
    expect(isNoveltyLookbackDaysInRange(366)).toBe(false);
    expect(isNoveltyLookbackDaysInRange(120.5)).toBe(false);
    expect(isNoveltyLookbackDaysInRange('120')).toBe(false);

    expect(() => assertValidNoveltyLookbackDays(29)).toThrow(RangeError);
    expect(() => assertValidNoveltyLookbackDays(366)).toThrow(RangeError);
    expect(() => assertValidNoveltyLookbackDays(120.5)).toThrow(RangeError);
  });
});