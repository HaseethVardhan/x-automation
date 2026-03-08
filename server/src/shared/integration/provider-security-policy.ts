export const APPROVED_EXTERNAL_TREND_PROVIDERS = Object.freeze([
  'google-trends',
  'first-party-curated-rss-news',
  'gdelt-enrichment',
] as const);

export type ApprovedExternalTrendProviderId =
  (typeof APPROVED_EXTERNAL_TREND_PROVIDERS)[number];

export const PROVIDER_ABSTRACTION_BOOTSTRAP_STRATEGY =
  'one-real-plus-stub-providers' as const;

export const CREDENTIAL_ENCRYPTION_MODEL = 'envelope-encryption' as const;

export const CREDENTIAL_DATA_KEY_ALGORITHM = 'AES-256-GCM' as const;

export const CREDENTIAL_WRAPPING_KEY_PROVIDER = 'kms-or-vault' as const;

export const LOCAL_DEVELOPMENT_KEY_FALLBACK_ALLOWED = true;

export const LOCAL_DEVELOPMENT_KEY_FALLBACK_SCOPE = 'local-development-only' as const;

export const CREDENTIAL_MUTATION_ACTOR =
  'authenticated-owner-admin-only' as const;

export const WRAPPED_KEY_ROTATION_PROCEDURE = Object.freeze([
  'Create a new active wrapping-key version in KMS or Vault.',
  'Mark the new key version as the encryption default for newly written credentials.',
  'Re-wrap existing per-record data keys lazily on read or through a controlled backfill job.',
  'Keep prior key versions available for decryption until re-wrap verification completes.',
  'Retire the old wrapping key version only after successful audit and decryption verification.',
] as const);

export const ALLOWED_BROWSER_AUTOMATION_ACTIONS = Object.freeze([
  'passive-session-validation',
  'read-account-posts',
  'read-competitor-posts',
  'read-trend-pages',
] as const);

export type AllowedBrowserAutomationAction =
  (typeof ALLOWED_BROWSER_AUTOMATION_ACTIONS)[number];

export const DISALLOWED_BROWSER_AUTOMATION_ACTIONS = Object.freeze([
  'post-content',
  'schedule-content',
  'like-content',
  'reply-to-posts',
  'follow-accounts',
  'change-account-settings',
  'perform-account-health-workflows',
] as const);

export function isApprovedExternalTrendProviderId(
  value: string,
): value is ApprovedExternalTrendProviderId {
  return APPROVED_EXTERNAL_TREND_PROVIDERS.includes(
    value as ApprovedExternalTrendProviderId,
  );
}

export function isAllowedBrowserAutomationAction(
  value: string,
): value is AllowedBrowserAutomationAction {
  return ALLOWED_BROWSER_AUTOMATION_ACTIONS.includes(
    value as AllowedBrowserAutomationAction,
  );
}