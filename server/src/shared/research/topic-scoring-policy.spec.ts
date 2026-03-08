import {
  computeOverallTopicScore,
  shouldExcludeTopicByPolicyRisk,
  TOPIC_POLICY_RISK_EXCLUSION_THRESHOLD,
  TOPIC_SCORING_SCOPE,
  TOPIC_SCORING_STORAGE_STRATEGY,
  TOPIC_SCORING_WEIGHTS,
  TOPIC_SURVIVAL_MINIMUM_SCORE_ENABLED,
  topicScoringWeightsTotal,
} from './topic-scoring-policy';

describe('topic scoring policy', () => {
  it('locks the approved v1 weights', () => {
    expect(TOPIC_SCORING_WEIGHTS).toEqual({
      creatorFit: 0.35,
      trendMomentum: 0.2,
      novelty: 0.25,
      audienceFit: 0.15,
      inversePolicyRisk: 0.05,
    });
    expect(topicScoringWeightsTotal()).toBeCloseTo(1, 10);
  });

  it('keeps scoring config-only and global in v1', () => {
    expect(TOPIC_SCORING_STORAGE_STRATEGY).toBe('config-only');
    expect(TOPIC_SCORING_SCOPE).toBe('global');
    expect(TOPIC_SURVIVAL_MINIMUM_SCORE_ENABLED).toBe(false);
  });

  it('applies the hard policy-risk exclusion threshold', () => {
    expect(TOPIC_POLICY_RISK_EXCLUSION_THRESHOLD).toBe(0.7);
    expect(shouldExcludeTopicByPolicyRisk(0.69)).toBe(false);
    expect(shouldExcludeTopicByPolicyRisk(0.7)).toBe(true);
    expect(shouldExcludeTopicByPolicyRisk(0.9)).toBe(true);
  });

  it('computes the approved weighted overall score', () => {
    expect(
      computeOverallTopicScore({
        creatorFitScore: 0.8,
        trendMomentumScore: 0.7,
        noveltyScore: 0.6,
        audienceFitScore: 0.9,
        policyRiskScore: 0.1,
      }),
    ).toBeCloseTo(0.75, 6);
  });
});