export const TOPIC_SCORING_SCOPE = 'global' as const;

export const TOPIC_SCORING_STORAGE_STRATEGY = 'config-only' as const;

export type TopicScoringWeights = Readonly<{
  creatorFit: number;
  trendMomentum: number;
  novelty: number;
  audienceFit: number;
  inversePolicyRisk: number;
}>;

export type TopicScoreInput = Readonly<{
  creatorFitScore: number;
  trendMomentumScore: number;
  noveltyScore: number;
  audienceFitScore: number;
  policyRiskScore: number;
}>;

export const TOPIC_SCORING_WEIGHTS: TopicScoringWeights = Object.freeze({
  creatorFit: 0.35,
  trendMomentum: 0.2,
  novelty: 0.25,
  audienceFit: 0.15,
  inversePolicyRisk: 0.05,
});

export const TOPIC_POLICY_RISK_EXCLUSION_THRESHOLD = 0.7;

export const TOPIC_SURVIVAL_MINIMUM_SCORE_ENABLED = false;

export function topicScoringWeightsTotal(): number {
  return Object.values(TOPIC_SCORING_WEIGHTS).reduce(
    (total, value) => total + value,
    0,
  );
}

export function shouldExcludeTopicByPolicyRisk(policyRiskScore: number): boolean {
  return policyRiskScore >= TOPIC_POLICY_RISK_EXCLUSION_THRESHOLD;
}

export function computeOverallTopicScore(input: TopicScoreInput): number {
  return Number(
    (
      input.creatorFitScore * TOPIC_SCORING_WEIGHTS.creatorFit +
      input.trendMomentumScore * TOPIC_SCORING_WEIGHTS.trendMomentum +
      input.noveltyScore * TOPIC_SCORING_WEIGHTS.novelty +
      input.audienceFitScore * TOPIC_SCORING_WEIGHTS.audienceFit +
      (1 - input.policyRiskScore) * TOPIC_SCORING_WEIGHTS.inversePolicyRisk
    ).toFixed(6),
  );
}