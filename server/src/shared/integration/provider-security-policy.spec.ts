import {
  ALLOWED_BROWSER_AUTOMATION_ACTIONS,
  APPROVED_EXTERNAL_TREND_PROVIDERS,
  CREDENTIAL_DATA_KEY_ALGORITHM,
  CREDENTIAL_ENCRYPTION_MODEL,
  CREDENTIAL_MUTATION_ACTOR,
  CREDENTIAL_WRAPPING_KEY_PROVIDER,
  DISALLOWED_BROWSER_AUTOMATION_ACTIONS,
  isAllowedBrowserAutomationAction,
  isApprovedExternalTrendProviderId,
  LOCAL_DEVELOPMENT_KEY_FALLBACK_ALLOWED,
  LOCAL_DEVELOPMENT_KEY_FALLBACK_SCOPE,
  PROVIDER_ABSTRACTION_BOOTSTRAP_STRATEGY,
  WRAPPED_KEY_ROTATION_PROCEDURE,
} from './provider-security-policy';

describe('provider and credential security policy', () => {
  it('locks the approved first-release provider bundle', () => {
    expect(APPROVED_EXTERNAL_TREND_PROVIDERS).toEqual([
      'google-trends',
      'first-party-curated-rss-news',
      'gdelt-enrichment',
    ]);
    expect(isApprovedExternalTrendProviderId('google-trends')).toBe(true);
    expect(isApprovedExternalTrendProviderId('other-provider')).toBe(false);
  });

  it('uses a provider abstraction with one real provider and stubs initially', () => {
    expect(PROVIDER_ABSTRACTION_BOOTSTRAP_STRATEGY).toBe(
      'one-real-plus-stub-providers',
    );
  });

  it('locks the credential protection model and local fallback rule', () => {
    expect(CREDENTIAL_ENCRYPTION_MODEL).toBe('envelope-encryption');
    expect(CREDENTIAL_DATA_KEY_ALGORITHM).toBe('AES-256-GCM');
    expect(CREDENTIAL_WRAPPING_KEY_PROVIDER).toBe('kms-or-vault');
    expect(LOCAL_DEVELOPMENT_KEY_FALLBACK_ALLOWED).toBe(true);
    expect(LOCAL_DEVELOPMENT_KEY_FALLBACK_SCOPE).toBe(
      'local-development-only',
    );
    expect(CREDENTIAL_MUTATION_ACTOR).toBe(
      'authenticated-owner-admin-only',
    );
  });

  it('defines a wrapped-key rotation procedure', () => {
    expect(WRAPPED_KEY_ROTATION_PROCEDURE).toHaveLength(5);
    expect(WRAPPED_KEY_ROTATION_PROCEDURE[0]).toContain('new active wrapping-key version');
    expect(WRAPPED_KEY_ROTATION_PROCEDURE[4]).toContain('Retire the old wrapping key version');
  });

  it('restricts browser automation to passive read-only actions', () => {
    expect(ALLOWED_BROWSER_AUTOMATION_ACTIONS).toEqual([
      'passive-session-validation',
      'read-account-posts',
      'read-competitor-posts',
      'read-trend-pages',
    ]);
    expect(DISALLOWED_BROWSER_AUTOMATION_ACTIONS).toContain('post-content');
    expect(DISALLOWED_BROWSER_AUTOMATION_ACTIONS).toContain(
      'perform-account-health-workflows',
    );
    expect(isAllowedBrowserAutomationAction('read-account-posts')).toBe(true);
    expect(isAllowedBrowserAutomationAction('post-content')).toBe(false);
  });
});