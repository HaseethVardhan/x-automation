export const MANAGED_ACCOUNT_CONNECTION_MODE = {
  API_ONLY: 'API_ONLY',
  BROWSER_ONLY: 'BROWSER_ONLY',
  HYBRID: 'HYBRID',
} as const;

export type ManagedAccountConnectionMode =
  (typeof MANAGED_ACCOUNT_CONNECTION_MODE)[keyof typeof MANAGED_ACCOUNT_CONNECTION_MODE];

export const MANAGED_ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DISCONNECTED: 'DISCONNECTED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ManagedAccountStatus =
  (typeof MANAGED_ACCOUNT_STATUS)[keyof typeof MANAGED_ACCOUNT_STATUS];