# X Automation Implementation Task Breakdown

## 1. Purpose

This document breaks the PRD in plan.md and the engineering design in engineering-spec.md into implementation-ready epics, stories, and granular tasks.

This breakdown is intentionally written to avoid silent assumptions. The previously open product and technical decisions from the source documents are now locked into this document and should be implemented exactly as stated unless a later versioned decision changes them.

Primary source documents:
1. plan.md
2. engineering-spec.md

Current implementation anchors in the codebase:
1. server/prisma/schema.prisma
2. server/src/app.module.ts
3. server/src/auth/auth.module.ts
4. server/src/auth/auth.controller.ts
5. server/src/auth/auth.service.ts
6. server/src/auth/strategies/jwt.strategy.ts
7. client/src/App.tsx
8. client/src/pages/HomePage.tsx
9. client/src/pages/LoginPage.tsx
10. client/src/services/auth.ts

## 2. Execution Rules

1. No story that depends on an unresolved decision may be marked complete until the related decision story is closed.
2. No task may assume external providers, retention rules, scoring weights, or lookback windows that are not explicitly approved.
3. Every backend story must identify DTOs, service methods, persistence behavior, and tests.
4. Every frontend story must identify route impact, API contract dependency, loading state, error state, and test impact.
5. Every integration story must define failure behavior, retry policy, and audit/logging coverage.

## 3. Locked Implementation Decisions

The following decisions are approved for v1 and should be treated as baseline requirements:
1. Creator-history policy: analyze a rolling 180-day window, target the most recent 120 posts, require a minimum viable corpus of 40 posts, and backfill up to 365 days until the target corpus is reached or a hard cap of 250 posts is reached.
2. noveltyLookbackDays default: 120 days with an allowed configuration range of 30 to 365 days.
3. Only one active research run is allowed per managed account, and both queued and running states count as active.
4. Competitor suggestions are generated only during research runs and later reviewed in the competitor workspace. No on-demand refresh endpoint is included in v1.
5. Topic scoring uses the approved v1 formula: 0.35 creator fit, 0.20 trend momentum, 0.25 novelty, 0.15 audience fit, and 0.05 inverse policy risk, with hard exclusion for policyRiskScore >= 0.70.
6. First-release external providers are Google Trends, a first-party curated RSS and news aggregation pipeline, and GDELT enrichment.
7. Credential protection uses envelope encryption with a per-record AES-256-GCM data-encryption key wrapped by a KMS or Vault-managed key-encryption key. Environment-master-key fallback is allowed only for local development.
8. Browser automation is strictly read-only and limited to passive session validation required for read access.

## 4. Epic Overview

1. Epic 0: Decision Gates and Delivery Governance
2. Epic 1: Foundation and Shared Platform Hardening
3. Epic 2: Prisma Domain Model and Data Migration
4. Epic 3: Minimal Authentication Compatibility
5. Epic 4: Managed Accounts Backend
6. Epic 5: Credentials and Secure Connection Handling
7. Epic 6: Preferences Backend
8. Epic 7: Competitors and Suggestions Backend
9. Epic 8: Research Run Orchestration and Queue Infrastructure
10. Epic 9: Source Ingestion Adapters
11. Epic 10: Creator and Competitor Analysis
12. Epic 11: Topic Scoring and Candidate Selection
13. Epic 12: Draft Generation and Validation
14. Epic 13: Review Workflow and Audit Trail
15. Epic 14: Frontend Shell and Shared Client Infrastructure
16. Epic 15: Frontend Managed Account Setup Flows
17. Epic 16: Frontend Run Monitoring and Draft Review Flows
18. Epic 17: Security, Observability, and Operations
19. Epic 18: Testing, QA, and Fixtures
20. Epic 19: Rollout, Migration, and Release Readiness

## 5. Detailed Breakdown

## Epic 0: Decision Gates and Delivery Governance

### Goal
Resolve every documented uncertainty before dependent engineering work locks behavior.

### Source references
1. plan.md
2. engineering-spec.md

### Story 0.1: Apply approved creator-history policy

Tasks:
1. Extract all places where lookback assumptions appear in plan.md and engineering-spec.md.
2. Encode the approved 180-day, 120-post, 40-post-minimum, 365-day-backfill, 250-post-cap policy into implementation constants.
3. Define whether creator-history policy is global-only or overrideable per account in a later version.
4. Encode noveltyLookbackDays default as 120 with a bounded range of 30 to 365.
5. Update any dependent DTO validation rules.
6. Update engineering-spec.md if implementation details need clarification.
7. Update plan.md if acceptance criteria or metrics need clarification.

### Story 0.2: Apply approved active-run concurrency rules

Tasks:
1. Enforce the one-active-run rule in backend service logic.
2. Treat QUEUED and RUNNING as active statuses.
3. Allow cancel then rerun behavior.
4. Disallow superseding an active run.
5. Define API behavior for RUN_ALREADY_ACTIVE.
6. Define UI messaging for blocked run creation.
7. Update the run endpoint contract in engineering-spec.md if needed.

### Story 0.3: Apply approved competitor-suggestion model

Tasks:
1. Restrict competitor-suggestion generation to research runs only.
2. Remove any plan for a dedicated manual “refresh suggestions” endpoint in v1.
3. Define whether accepted suggestions become active immediately after acceptance.
4. Define whether rejected suggestions may reappear after expiration or future runs.
5. Define retention and expiration rules for pending suggestions.
6. Update the competitor API contract in engineering-spec.md if needed.

### Story 0.4: Apply approved topic-scoring policy

Tasks:
1. List all current scoring dimensions from engineering-spec.md.
2. Encode approved weights for creator fit, trend momentum, novelty, audience fit, and inverse policy risk.
3. Define whether weights are stored in config, database, or both.
4. Define whether weights are global or category-specific in v1.
5. Encode the policy-risk hard exclusion threshold of 0.70.
6. Define the minimum score threshold for topic survival if an additional threshold is required.
7. Update engineering-spec.md scoring guidance section if needed.

### Story 0.5: Apply approved provider and credential-security model

Tasks:
1. Implement the approved external provider bundle: Google Trends, first-party curated RSS and news aggregation, and GDELT enrichment.
2. Decide whether a provider abstraction will ship with one real provider and one stub provider initially.
3. Encode envelope encryption as the production credential-security model.
4. Define key rotation procedure for wrapped per-record keys.
5. Confirm who is allowed to create and revoke credentials.
6. Restrict browser automation to passive read-only validation and fetch behavior.
7. Update engineering-spec.md where the approved choices differ from placeholders.

### Story 0.6: Create delivery governance baseline

Tasks:
1. Define epic ownership expectations across backend, frontend, infrastructure, and QA.
2. Define a story status workflow.
3. Define a blocking-issue escalation path.
4. Define the review order: schema first, contracts second, UI third, integration fourth.
5. Define the documentation update rule for each completed story.

## Epic 1: Foundation and Shared Platform Hardening

### Goal
Prepare the existing NestJS and React scaffold for feature growth without yet adding full domain functionality.

### Source references
1. engineering-spec.md section 2
2. server/src/app.module.ts
3. client/src/App.tsx
4. client/src/services/auth.ts

### Story 1.1: Establish backend shared conventions

Tasks:
1. Review current server module registration in server/src/app.module.ts.
2. Define a module folder convention for all new feature modules.
3. Define a shared API response envelope format.
4. Define a shared error code taxonomy.
5. Add a shared error-response utility or interceptor design.
6. Add a shared pagination DTO design.
7. Add a shared request-id propagation strategy.
8. Add a shared validation-pipe configuration plan.

### Story 1.2: Establish frontend shared conventions

Tasks:
1. Review current route flow in client/src/App.tsx.
2. Review current login and token handling in client/src/services/auth.ts.
3. Define a shared API client pattern for authenticated requests.
4. Define a route-layout convention for authenticated pages.
5. Define a common loading-state pattern.
6. Define a common error-state pattern.
7. Define a common empty-state pattern.
8. Define a shared polling strategy for run progress pages.

### Story 1.3: Add shared backend dependencies

Tasks:
1. Add class-validator and class-transformer if missing.
2. Add BullMQ and required Nest integrations.
3. Add Redis configuration support.
4. Add structured logging dependency if one is chosen.
5. Add any shared schema-validation helper dependency required for model output validation.
6. Verify dependency versions do not conflict with current NestJS packages.

### Story 1.4: Add shared frontend dependencies

Tasks:
1. Decide whether current React stack needs additional client-state or data-fetching libraries.
2. If yes, add the approved dependency.
3. If no, define the project-standard API-fetching pattern with existing tooling.
4. Validate the build still works after dependency changes.

## Epic 2: Prisma Domain Model and Data Migration

### Goal
Replace the placeholder schema in server/prisma/schema.prisma with the approved relational model from engineering-spec.md.

### Source references
1. engineering-spec.md section 3
2. server/prisma/schema.prisma

### Story 2.1: Keep AdminUser minimal

Tasks:
1. Review the existing AdminUser model in server/prisma/schema.prisma.
2. Keep the model limited to basic login needs only.
3. Add updatedAt only if needed for consistency with the rest of the schema.
4. Confirm existing migration compatibility.
5. Update seed logic if seeds exist.
6. Generate and review migration SQL if the model changes.

### Story 2.2: Add managed-account domain tables

Tasks:
1. Add ManagedAccountStatus enum.
2. Add AccountConnectionMode enum.
3. Add ManagedAccount model.
4. Add relation from ManagedAccount to AdminUser.
5. Add indexes required by engineering-spec.md.
6. Generate migration.
7. Review SQL for index correctness.

### Story 2.3: Add credential tables

Tasks:
1. Add CredentialType enum.
2. Add CredentialStatus enum.
3. Add ManagedAccountCredential model.
4. Add relations to ManagedAccount and AdminUser.
5. Add indexes for account, type, and status.
6. Generate migration.
7. Review SQL for retention-related columns.

### Story 2.4: Add account preference tables

Tasks:
1. Add AccountPreference model.
2. Add one-to-one relation to ManagedAccount.
3. Add JSON fields for tone, banned themes, banned claims, formats.
4. Add noveltyLookbackDays default.
5. Add maxDraftVariants default.
6. Generate migration.
7. Review SQL.

### Story 2.5: Add competitor tables

Tasks:
1. Add CompetitorSource enum.
2. Add CompetitorStatus enum.
3. Add SuggestionStatus enum.
4. Add Competitor model.
5. Add CompetitorSuggestion model.
6. Add acceptedFromSuggestion relation.
7. Add generatedByRun relation placeholder if needed for ordering.
8. Add composite unique constraints.
9. Generate migration.
10. Review SQL for composite uniqueness.

### Story 2.6: Add run lifecycle tables

Tasks:
1. Add RunStatus enum.
2. Add RunPriority enum.
3. Add RunStage enum.
4. Add StageStatus enum.
5. Add ResearchRun model.
6. Add ResearchRunStage model.
7. Add required indexes.
8. Add inputSnapshot and summary JSON fields.
9. Generate migration.
10. Review SQL for enum usage and index creation.

### Story 2.7: Add artifact and snapshot tables

Tasks:
1. Add SourceType enum.
2. Add SourceSnapshot model.
3. Add CreatorProfileArtifact model.
4. Add CompetitorInsightArtifact model.
5. Add TopicCandidateStatus enum.
6. Add TopicCandidate model.
7. Add DraftVariantStatus enum.
8. Add DraftVariant model.
9. Add ReviewDecisionType enum.
10. Add ReviewDecision model.
11. Add AuditEventType enum.
12. Add AuditEvent model.
13. Add all relations and unique constraints.
14. Generate migration.
15. Review SQL for relation correctness.

### Story 2.8: Generate Prisma client and validate model integrity

Tasks:
1. Run Prisma format.
2. Run Prisma validate.
3. Generate Prisma client.
4. Check generated client types for missing relations.
5. Fix schema issues if Prisma validation fails.

### Story 2.9: Seed and migration strategy baseline

Tasks:
1. Decide whether to add development seeds now.
2. If yes, define minimal seed data for the owner account and one managed account.
3. Add seed task or script if missing.
4. Document migration order for development and CI.
5. Add rollback considerations to internal notes.

## Epic 3: Minimal Authentication Compatibility

### Goal
Keep the existing login flow usable for a single owner account without adding RBAC, role management, or auth-hardening work.

### Source references
1. plan.md authentication requirements
2. engineering-spec.md auth section
3. server/src/auth/auth.controller.ts
4. server/src/auth/auth.service.ts
5. server/src/auth/auth.module.ts
6. server/src/auth/strategies/jwt.strategy.ts
7. client/src/pages/LoginPage.tsx
8. client/src/services/auth.ts

### Story 3.1: Keep login contract minimal

Tasks:
1. Review current login response shape in server/src/auth/auth.service.ts.
2. Keep the response limited to the token and minimal user identity fields.
3. Update login controller return shape only if needed for client consistency.
4. Add tests for the final login response.
5. Update client login parsing in client/src/services/auth.ts.

### Story 3.2: Preserve simple protected-route behavior

Tasks:
1. Replace direct axios login-only usage with a shared authenticated client design.
2. Add bearer token injection behavior.
3. Add logout-on-401 behavior design.
4. Update protected-route behavior in client/src/App.tsx if needed.
5. Add tests for token lifecycle behavior if frontend test tooling exists.

## Epic 4: Managed Accounts Backend

### Goal
Implement CRUD and readiness tracking for managed X accounts.

### Source references
1. plan.md managed account setup requirement
2. engineering-spec.md managed account endpoints
3. server/src/app.module.ts

### Story 4.1: Create managed-accounts module skeleton

Tasks:
1. Add module folder structure for managed accounts.
2. Add controller skeleton.
3. Add service skeleton.
4. Add DTO folder.
5. Register module in server/src/app.module.ts.

### Story 4.2: Implement create managed account endpoint

Tasks:
1. Create create-account DTO.
2. Add validation for xHandle normalization.
3. Add validation for category.
4. Add validation for connection mode.
5. Implement service method to enforce handle uniqueness.
6. Persist createdByAdminUserId from request user.
7. Return consistent response envelope.
8. Add controller test coverage.
9. Add service test coverage.

### Story 4.3: Implement list managed accounts endpoint

Tasks:
1. Create list-query DTO with page and pageSize.
2. Add optional filters for status, category, and search.
3. Implement Prisma query with filtering.
4. Implement pagination metadata.
5. Add tests for each filter.
6. Add tests for empty-state response.

### Story 4.4: Implement get managed account detail endpoint

Tasks:
1. Add account detail query in service.
2. Include readiness summary inputs: credentials, preferences, competitors.
3. Decide whether to include latest run summary in the detail response.
4. Add not-found handling.
5. Add tests.

### Story 4.5: Implement update managed account endpoint

Tasks:
1. Create update-account DTO.
2. Support optional updates for displayName, category, goalsSummary, notes, status.
3. Prevent updates to archived accounts if required by policy.
4. Add updatedAt behavior verification.
5. Add tests for patch semantics.

### Story 4.6: Implement archive endpoint

Tasks:
1. Add service method to soft archive account.
2. Set status to ARCHIVED.
3. Set archivedAt.
4. Prevent duplicate archive behavior.
5. Decide whether active runs must be blocked or canceled before archive.
6. Add tests.

## Epic 5: Credentials and Secure Connection Handling

### Goal
Implement secure storage, validation, and revocation of API credentials and browser session artifacts.

### Source references
1. plan.md credential handling requirement
2. engineering-spec.md credential model and endpoints

### Story 5.1: Create credentials module skeleton

Tasks:
1. Add module folder structure for credentials.
2. Add controller skeleton.
3. Add service skeleton.
4. Register the module in the root module.

### Story 5.2: Implement encryption abstraction

Tasks:
1. Define encryption service interface.
2. Implement encrypt method contract.
3. Implement decrypt method contract.
4. Add keyVersion support.
5. Add configuration loading for active key version.
6. Add unit tests for encrypt/decrypt round-trip.
7. Add negative-path test for invalid payloads.

### Story 5.3: Implement credential create endpoint

Tasks:
1. Create credential-create DTO.
2. Add validation for credentialType.
3. Add payload-size limit validation.
4. Encrypt payload before persistence.
5. Persist createdByAdminUserId.
6. Ensure encrypted payload is never returned in response.
7. Emit audit event.
8. Add tests for redaction and persistence.

### Story 5.4: Implement credential list endpoint

Tasks:
1. Query credential summaries for a managed account.
2. Exclude encrypted payload from the response shape.
3. Include status, type, createdAt, lastValidatedAt, expiresAt.
4. Add tests.

### Story 5.5: Implement credential validation endpoint

Tasks:
1. Define provider-neutral credential validation service contract.
2. Route validation based on credentialType.
3. Update lastValidatedAt and status.
4. Record validation failure reasons in a sanitized way.
5. Emit audit event.
6. Add tests for active, invalid, and expired outcomes.

### Story 5.6: Implement credential revocation endpoint

Tasks:
1. Add revoke service method.
2. Set status to REVOKED.
3. Set revokedAt.
4. Prevent duplicate revocation.
5. Emit audit event.
6. Add tests.

### Story 5.7: Implement account readiness evaluation

Tasks:
1. Define rules for whether an account is ready to run.
2. Include credential availability in readiness calculation.
3. Expose readiness in account-detail responses.
4. Add tests for all readiness permutations.

## Epic 6: Preferences Backend

### Goal
Persist and validate account-level content preferences that influence analysis and generation.

### Source references
1. plan.md preferences requirement
2. engineering-spec.md preference model and endpoints

### Story 6.1: Create preferences module skeleton

Tasks:
1. Add module folder structure.
2. Add controller skeleton.
3. Add service skeleton.
4. Register module.

### Story 6.2: Implement get preferences endpoint

Tasks:
1. Query AccountPreference by managedAccountId.
2. Return null or default envelope behavior if absent.
3. Add tests for found and not-found preference cases.

### Story 6.3: Implement upsert preferences endpoint

Tasks:
1. Create preferences DTO.
2. Add validation for maxDraftVariants min/max.
3. Add validation for noveltyLookbackDays min/max.
4. Add validation for JSON list shapes where needed.
5. Implement create-or-replace logic.
6. Update updatedAt.
7. Emit audit event if preference changes are auditable.
8. Add tests for create path.
9. Add tests for update path.

### Story 6.4: Implement preference normalization helpers

Tasks:
1. Normalize bannedThemes arrays.
2. Normalize bannedClaims arrays.
3. Normalize preferredFormats arrays.
4. Remove duplicates.
5. Trim empty entries.
6. Add tests.

## Epic 7: Competitors and Suggestions Backend

### Goal
Implement manual competitor management and system-generated suggestions.

### Source references
1. plan.md competitor requirement
2. engineering-spec.md competitor endpoints and suggestion model

### Story 7.1: Create competitors module skeleton

Tasks:
1. Add module folder structure.
2. Add controller skeleton.
3. Add service skeleton.
4. Register module.

### Story 7.2: Implement list competitors endpoint

Tasks:
1. Query competitors by managedAccountId.
2. Support status filtering if needed.
3. Sort results consistently.
4. Add tests.

### Story 7.3: Implement create manual competitor endpoint

Tasks:
1. Create manual competitor DTO.
2. Normalize xHandle input.
3. Prevent duplicates per managed account.
4. Persist MANUAL source.
5. Persist createdByAdminUserId.
6. Emit audit event.
7. Add tests.

### Story 7.4: Implement update competitor endpoint

Tasks:
1. Create update competitor DTO.
2. Allow metadata updates.
3. Allow status changes according to business rules.
4. Add tests for status transitions.

### Story 7.5: Implement list competitor suggestions endpoint

Tasks:
1. Query suggestion rows by managedAccountId.
2. Support pending and historical filters if required.
3. Add pagination if needed.
4. Add tests.

### Story 7.6: Implement accept suggestion endpoint

Tasks:
1. Validate suggestion exists.
2. Validate suggestion is PENDING.
3. Create active competitor row from suggestion.
4. Mark suggestion ACCEPTED.
5. Set decidedAt.
6. Prevent duplicate competitor creation.
7. Emit audit event.
8. Add tests.

### Story 7.7: Implement reject suggestion endpoint

Tasks:
1. Validate suggestion exists.
2. Validate suggestion is PENDING.
3. Mark suggestion REJECTED.
4. Set decidedAt.
5. Emit audit event.
6. Add tests.

### Story 7.8: Implement suggestion expiration policy

Tasks:
1. Define suggestion-expiration rule from decision story.
2. Implement scheduled or on-read expiration logic.
3. Mark expired suggestions EXPIRED.
4. Add tests.

## Epic 8: Research Run Orchestration and Queue Infrastructure

### Goal
Implement persisted run lifecycle, stage tracking, queue execution, and cancellation behavior.

### Source references
1. plan.md async research requirement and user journey
2. engineering-spec.md queue and stage orchestration section

### Story 8.1: Add queue infrastructure configuration

Tasks:
1. Add Redis configuration keys.
2. Add queue module registration.
3. Add BullMQ connection factory.
4. Add queue naming constants.
5. Add environment validation for Redis configuration.
6. Add smoke test for queue bootstrap.

### Story 8.2: Create research-runs module skeleton

Tasks:
1. Add module folder structure.
2. Add controller skeleton.
3. Add service skeleton.
4. Add processor/worker skeleton.
5. Register module.

### Story 8.3: Implement create run endpoint

Tasks:
1. Create run-create DTO.
2. Validate priority.
3. Validate account readiness before run creation.
4. Enforce active-run concurrency rule once approved.
5. Snapshot account inputs into inputSnapshot.
6. Create ResearchRun row with QUEUED status.
7. Create initial PREPARE stage row.
8. Enqueue orchestration job.
9. Emit audit event.
10. Add tests.

### Story 8.4: Implement list runs endpoint

Tasks:
1. Create run-list query DTO.
2. Add status filter.
3. Add pagination.
4. Include minimal summary fields for list view.
5. Add tests.

### Story 8.5: Implement run detail endpoint

Tasks:
1. Query run summary.
2. Include currentStage and progressPercent.
3. Include warningCount and errorCount.
4. Include summary artifact references if available.
5. Add tests.

### Story 8.6: Implement run stages endpoint

Tasks:
1. Query ResearchRunStage rows by run id.
2. Order by stage and attemptNumber.
3. Return sanitized error fields only.
4. Add tests.

### Story 8.7: Implement run artifact index endpoint

Tasks:
1. Define artifact listing response format.
2. Query available artifacts for a run.
3. Return artifact type, id, createdAt, and retrieval endpoint info.
4. Add tests.

### Story 8.8: Implement run cancellation endpoint

Tasks:
1. Define cancelable statuses.
2. Update run status to CANCELED.
3. Mark active stage appropriately.
4. Cancel or ignore queued BullMQ jobs safely.
5. Emit audit event.
6. Add tests.

### Story 8.9: Implement orchestration worker skeleton

Tasks:
1. Define job payload shape.
2. Implement run-level processor entrypoint.
3. Load run and current stage context.
4. Execute stage dispatcher.
5. Update run and stage status transitions.
6. Add retry-safe idempotency guards.
7. Add tests for repeated job execution.

### Story 8.10: Implement stage-transition service

Tasks:
1. Define allowed transitions for ResearchRun.
2. Define allowed transitions for ResearchRunStage.
3. Implement helper methods for startStage, completeStage, failStage, partialStage, skipStage.
4. Update run progress after each stage transition.
5. Add tests for illegal transitions.

## Epic 9: Source Ingestion Adapters

### Goal
Build provider abstractions and normalized data ingestion for creator, competitor, and trend sources.

### Source references
1. engineering-spec.md integration contracts
2. plan.md trend aggregation and creator-analysis requirements

### Story 9.1: Create source-ingestion module skeleton

Tasks:
1. Add module folder structure.
2. Add provider interface definitions.
3. Add normalization utilities folder.
4. Register module.

### Story 9.2: Implement X source adapter contract

Tasks:
1. Define FetchAccountPostsInput shape.
2. Define FetchCompetitorPostsInput shape.
3. Define FetchTrendSignalsInput shape.
4. Define NormalizedPostSnapshot shape.
5. Define NormalizedTrendSnapshot shape.
6. Define CredentialValidationResult shape.
7. Add unit tests for the interface contract shapes.

### Story 9.3: Implement placeholder or first concrete X API adapter

Tasks:
1. Confirm the X API endpoints approved for v1.
2. Implement provider configuration loading.
3. Implement fetchAccountPosts.
4. Implement fetchCompetitorPosts.
5. Implement fetchTrendSignals if supported.
6. Implement validateCredential.
7. Normalize raw responses into internal snapshot format.
8. Add tests with provider mocks.

### Story 9.4: Implement browser-read adapter

Tasks:
1. Confirm allowed browser-read actions from decision story.
2. Implement session artifact decryption handoff.
3. Implement account post fetch.
4. Implement competitor post fetch.
5. Implement trend fetch if permitted.
6. Implement credential/session validation if approved.
7. Sanitize logs.
8. Add tests with mocked adapter behavior.

### Story 9.5: Implement hybrid adapter routing

Tasks:
1. Define provider selection precedence.
2. Define fallback rules from API to browser adapter.
3. Define terminal failure conditions.
4. Implement routing service.
5. Add tests for API-success path.
6. Add tests for API-fail then browser-success path.
7. Add tests for total-failure path.

### Story 9.6: Implement external trend adapter contract

Tasks:
1. Define ExternalTrendFetchInput shape.
2. Define NormalizedExternalTrendSnapshot shape.
3. Implement approved provider adapter(s).
4. Normalize source label, summary, recency, confidence, and URL.
5. Add tests for normalization.

### Story 9.7: Persist source snapshots consistently

Tasks:
1. Create snapshot persistence helper.
2. Write rawPayload and normalizedPayload.
3. Set sourceType and sourceKey correctly.
4. Set retentionUntil when required.
5. Add tests for each snapshot type.

## Epic 10: Creator and Competitor Analysis

### Goal
Transform ingested corpora into creator-style and competitor-insight artifacts.

### Source references
1. plan.md creator-analysis and competitor-analysis requirements
2. engineering-spec.md analysis artifact definitions

### Story 10.1: Implement creator corpus preparation

Tasks:
1. Define minimum viable creator corpus threshold.
2. Implement post text extraction.
3. Implement engagement metric extraction when available.
4. Implement timeframe window labeling.
5. Implement corpus sanitization.
6. Add tests.

### Story 10.2: Implement creator profile analysis contract

Tasks:
1. Define AnalyzeCreatorProfileInput shape.
2. Define AnalyzeCreatorProfileResult schema.
3. Include styleProfile, topicProfile, engagementProfile, exclusionsProfile sections.
4. Add schema validation for model output.
5. Add tests with valid and invalid fixtures.

### Story 10.3: Implement creator-analysis stage

Tasks:
1. Load creator snapshots for the run.
2. Validate corpus sufficiency.
3. Call generation adapter analyzeCreatorProfile.
4. Validate output schema.
5. Persist CreatorProfileArtifact.
6. Persist stage output refs.
7. Add tests.

### Story 10.4: Implement competitor corpus preparation

Tasks:
1. Load competitor snapshots.
2. Group by competitor handle.
3. Filter unusable or empty corpora.
4. Compute competitorCount.
5. Add tests.

### Story 10.5: Implement competitor-analysis contract

Tasks:
1. Define AnalyzeCompetitorCorpusInput shape.
2. Define AnalyzeCompetitorCorpusResult schema.
3. Include postingPatternSummary, topicPatternSummary, hookPatternSummary, gapOpportunities.
4. Add schema validation.
5. Add tests.

### Story 10.6: Implement competitor-analysis stage

Tasks:
1. Load competitor corpora.
2. Determine whether a soft-fail condition applies.
3. Call generation adapter analyzeCompetitorCorpus.
4. Validate output.
5. Persist CompetitorInsightArtifact.
6. Persist stage output refs.
7. Add tests.

### Story 10.7: Implement competitor suggestion generation stage

Tasks:
1. Define suggestion-generation input shape.
2. Define suggestion result schema.
3. Build input from creator profile and existing competitors.
4. Generate suggestions using approved provider path.
5. Deduplicate against existing competitors and pending suggestions.
6. Persist CompetitorSuggestion rows.
7. Persist stage output refs.
8. Add tests.

## Epic 11: Topic Scoring and Candidate Selection

### Goal
Convert evidence into ranked topic candidates with explainable scoring.

### Source references
1. plan.md topic-scoring and explainability requirements
2. engineering-spec.md topic-candidate model and scoring guidance

### Story 11.1: Implement trend normalization for scoring

Tasks:
1. Load X trend snapshots.
2. Load external trend snapshots.
3. Normalize into a common candidate input list.
4. Deduplicate equivalent topics.
5. Add tests.

### Story 11.2: Implement topic-scoring config model

Tasks:
1. Add config keys for scoring weights.
2. Add config validation.
3. Add fallback defaults only after decision approval.
4. Add tests.

### Story 11.3: Implement topic candidate construction

Tasks:
1. Merge creator, competitor, and trend evidence.
2. Generate canonical topicKey values.
3. Compute creatorFitScore.
4. Compute trendMomentumScore.
5. Compute noveltyScore.
6. Compute audienceFitScore.
7. Compute policyRiskScore.
8. Compute overallScore.
9. Build rationale payload.
10. Add tests for each score dimension.

### Story 11.4: Implement topic selection thresholds

Tasks:
1. Apply minimum-score filter.
2. Apply hard exclusion by policy risk if approved.
3. Apply dedupe by topicKey.
4. Mark surviving topics ACTIVE.
5. Mark dropped topics DROPPED if retained.
6. Add tests.

### Story 11.5: Implement SCORE_TOPICS stage

Tasks:
1. Load required artifacts and snapshots.
2. Guard against missing creator profile.
3. Perform candidate construction.
4. Persist TopicCandidate rows.
5. Persist stage output refs.
6. Hard-fail when no viable topics remain.
7. Add tests.

### Story 11.6: Implement topic-candidates endpoint

Tasks:
1. Query topic candidates by run id.
2. Order by overallScore descending.
3. Return rationale summaries.
4. Add tests.

## Epic 12: Draft Generation and Validation

### Goal
Generate draft variants with Gemini Flash and validate them for novelty, style fit, duplication, and policy risk.

### Source references
1. plan.md draft generation and novelty/style validation requirements
2. engineering-spec.md generation and validation sections

### Story 12.1: Implement generation adapter contracts

Tasks:
1. Define GenerateDraftsInput shape.
2. Define GenerateDraftsResult schema.
3. Define prompt version metadata format.
4. Define evidenceSummary output requirements.
5. Add tests with valid and invalid fixtures.

### Story 12.2: Implement Gemini prompt builder

Tasks:
1. Build prompt input from CreatorProfileArtifact.
2. Add competitor insights when available.
3. Add top topic candidate rationale.
4. Add preferences and banned themes.
5. Add style and non-duplication instructions.
6. Add structured output requirements.
7. Add prompt version identifier.
8. Add tests.

### Story 12.3: Implement GENERATE_DRAFTS stage

Tasks:
1. Load top-ranked topic candidates.
2. Determine variant count from preferences.
3. Invoke generation adapter.
4. Validate response schema.
5. Persist DraftVariant rows in GENERATED status.
6. Persist prompt version and model name.
7. Persist evidenceSummary.
8. Handle partial generation success.
9. Add tests.

### Story 12.4: Implement lexical duplication checks

Tasks:
1. Define recent-history comparison corpus.
2. Implement token or phrase overlap calculation.
3. Implement threshold comparison.
4. Add tests.

### Story 12.5: Implement semantic similarity checks

Tasks:
1. Choose approved similarity mechanism.
2. Implement draft-to-history comparison.
3. Implement draft-to-prior-draft comparison.
4. Define threshold behavior.
5. Add tests.

### Story 12.6: Implement style-fit scoring

Tasks:
1. Define style features used from styleProfile.
2. Implement style-fit evaluation.
3. Define output score range.
4. Define validationSummary shape for style findings.
5. Add tests.

### Story 12.7: Implement banned-theme and policy-risk checks

Tasks:
1. Check bannedThemes matches.
2. Check bannedClaims matches.
3. Check spam-risk heuristics.
4. Check trend relevance mismatch if rules are defined.
5. Add tests.

### Story 12.8: Implement VALIDATE_DRAFTS stage

Tasks:
1. Load generated drafts.
2. Load creator history corpus.
3. Load account preferences.
4. Execute lexical checks.
5. Execute semantic checks.
6. Execute style-fit checks.
7. Execute banned-theme and policy checks.
8. Update DraftVariant scores and validationSummary.
9. Set FLAGGED status where appropriate.
10. Hard-fail if no surviving reviewable draft remains.
11. Add tests.

### Story 12.9: Implement drafts list and detail endpoints

Tasks:
1. Implement get drafts by run endpoint.
2. Return summary scores and statuses.
3. Implement get draft detail endpoint.
4. Return evidenceSummary and validationSummary.
5. Add tests.

## Epic 13: Review Workflow and Audit Trail

### Goal
Allow human review of generated drafts and persist all sensitive product actions in the audit log.

### Source references
1. plan.md review workflow and auditability requirements
2. engineering-spec.md review and audit sections

### Story 13.1: Create review module skeleton

Tasks:
1. Add module folder structure.
2. Add controller skeleton.
3. Add service skeleton.
4. Register module.

### Story 13.2: Implement draft review endpoint

Tasks:
1. Create review DTO.
2. Validate decision enum.
3. Validate editedContent rules by decision.
4. Prevent duplicate terminal review if v1 requires it.
5. Compute editDistance when editedContent is present.
6. Persist ReviewDecision.
7. Update DraftVariant status.
8. Update ResearchRun status to REVIEWED if appropriate.
9. Emit audit event.
10. Add tests.

### Story 13.3: Implement audit module skeleton

Tasks:
1. Add module folder structure.
2. Add service skeleton.
3. Add query endpoint if included in v1.
4. Register module.

### Story 13.4: Implement audit-event writer abstraction

Tasks:
1. Define audit event creation helper.
2. Define metadata sanitization rules.
3. Add helper calls to auth, credentials, competitors, runs, and review modules.
4. Add tests for sanitization.

### Story 13.5: Implement audit-events query endpoint

Tasks:
1. Create audit query DTO.
2. Support filtering by actor, managedAccount, run, and eventType.
3. Support pagination.
4. Add tests.

## Epic 14: Frontend Shell and Shared Client Infrastructure

### Goal
Turn the current login-plus-home scaffold into a protected application shell with shared API access and routing.

### Source references
1. client/src/App.tsx
2. client/src/pages/HomePage.tsx
3. client/src/pages/LoginPage.tsx
4. client/src/services/auth.ts
5. plan.md user journey
6. engineering-spec.md frontend route map

### Story 14.1: Implement shared authenticated API client

Tasks:
1. Extract base API URL handling from client/src/services/auth.ts.
2. Create a shared API client module.
3. Add bearer token injection.
4. Add 401 handling behavior.
5. Add shared JSON error parsing.
6. Add tests if client test tooling exists.

### Story 14.2: Refactor auth service to use shared client

Tasks:
1. Update login flow to use shared client.
2. Keep client-side auth state limited to the token and minimal user identity.
3. Add helper for reading auth token.
4. Add helper for clearing full auth session state.
5. Verify login page behavior remains correct.

### Story 14.3: Replace single protected page with app shell routing

Tasks:
1. Review current route behavior in client/src/App.tsx.
2. Add a protected layout route.
3. Add route entries for dashboard, accounts, competitors, runs, and drafts.
4. Keep login redirect behavior intact.
5. Add 404 fallback inside protected shell if desired.
6. Add route tests if tooling exists.

### Story 14.4: Build initial dashboard shell

Tasks:
1. Replace placeholder content in client/src/pages/HomePage.tsx with dashboard shell or redirect.
2. Add navigation structure.
3. Add logout control.
4. Add placeholder sections for recent runs and account issues.
5. Add loading and empty states.

## Epic 15: Frontend Managed Account Setup Flows

### Goal
Implement managed account, preference, credential, and competitor configuration UIs.

### Source references
1. plan.md managed account and preference user journey
2. engineering-spec.md route map and page responsibilities

### Story 15.1: Build managed accounts list page

Tasks:
1. Create accounts list page component.
2. Call list managed accounts endpoint.
3. Render status, category, and connection summary.
4. Add loading state.
5. Add empty state.
6. Add error state.
7. Add link to account detail.

### Story 15.2: Build managed account create flow

Tasks:
1. Build create-account form.
2. Add xHandle input normalization UX.
3. Add category input.
4. Add connection mode selector.
5. Add goals summary input.
6. Submit to create endpoint.
7. Show success and failure states.
8. Redirect to account detail on success.

### Story 15.3: Build managed account detail page

Tasks:
1. Fetch account detail endpoint.
2. Render metadata.
3. Render readiness summary.
4. Render credential summary.
5. Render quick links to preferences, competitors, and runs.
6. Render archive action if approved.
7. Add loading and error states.

### Story 15.4: Build preferences editor page

Tasks:
1. Fetch preferences.
2. Populate form from current values.
3. Add objective field.
4. Add tone guidance editor.
5. Add banned themes editor.
6. Add banned claims editor.
7. Add preferred formats editor.
8. Add noveltyLookbackDays input.
9. Add maxDraftVariants input.
10. Save preferences via API.
11. Show validation errors.

### Story 15.5: Build credentials management UI

Tasks:
1. Fetch credential summaries.
2. Render type, status, validation time, and expiry.
3. Add credential create form.
4. Add validation action.
5. Add revoke action.
6. Render secure UX copy clarifying that raw secrets are not retrievable.
7. Add loading and error states.

### Story 15.6: Build competitor workspace page

Tasks:
1. Fetch active competitors.
2. Fetch competitor suggestions.
3. Build manual competitor form.
4. Render suggestion cards with rationale and confidence.
5. Add accept action.
6. Add reject action.
7. Add refresh-suggestions action only if approved.
8. Show loading and error states.

## Epic 16: Frontend Run Monitoring and Draft Review Flows

### Goal
Implement the end-to-end operator workflow from launching a run to reviewing a draft.

### Source references
1. plan.md run and review journey
2. engineering-spec.md run and draft route map

### Story 16.1: Build run history page

Tasks:
1. Fetch account runs.
2. Render status, stage, progress, and createdAt.
3. Add filters for run status.
4. Add link to run detail.
5. Add empty state.
6. Add error state.

### Story 16.2: Build run trigger action

Tasks:
1. Add Run button to the appropriate account-level UI.
2. Validate readiness before allowing submit when possible.
3. Submit create-run request.
4. Show immediate pending state.
5. Navigate to run detail on success.
6. Surface ACCOUNT_NOT_READY and RUN_ALREADY_ACTIVE clearly.

### Story 16.3: Build run detail page

Tasks:
1. Fetch run detail.
2. Fetch run stages.
3. Poll at approved interval.
4. Render current stage and overall progress.
5. Render warning and error state summaries.
6. Render artifact availability links.
7. Render cancel action if allowed.
8. Stop polling when run reaches terminal state.

### Story 16.4: Build topic-candidate evidence view

Tasks:
1. Fetch topic candidates.
2. Render score summary per topic.
3. Render rationale summary per topic.
4. Show empty state when candidates do not exist.

### Story 16.5: Build draft list within run detail

Tasks:
1. Fetch run drafts.
2. Render draft status and key scores.
3. Add link to draft review detail.
4. Show empty state until generation completes.

### Story 16.6: Build draft review page

Tasks:
1. Fetch draft detail.
2. Render generated content.
3. Render evidenceSummary.
4. Render validationSummary.
5. Add editable content area.
6. Add approve, reject, and rerun decision controls if approved by the API design.
7. Submit review decision.
8. Surface success state.
9. Surface validation and API errors.

## Epic 17: Security, Observability, and Operations

### Goal
Implement the non-functional controls described in the PRD and engineering spec.

### Source references
1. plan.md quality requirements, risks, and guardrails
2. engineering-spec.md security and observability sections

### Story 17.1: Add structured logging baseline

Tasks:
1. Choose logging library if not already chosen.
2. Add requestId generation or propagation.
3. Add structured request logs.
4. Add structured stage-execution logs.
5. Add provider name and latency fields.
6. Add sanitization rules for secret-bearing data.

### Story 17.2: Add metrics instrumentation baseline

Tasks:
1. Choose metrics emitter approach.
2. Add run-count metric.
3. Add stage-latency metric.
4. Add provider failure-rate metric.
5. Add generation success-rate metric.
6. Add validation rejection-rate metric.
7. Add draft approval-rate metric.

### Story 17.3: Add alerting design outputs

Tasks:
1. Define queue backlog alert threshold.
2. Define provider failure alert threshold.
3. Define generation parse-failure alert threshold.
4. Define credential-validation failure alert threshold.
5. Document alert destinations and owners.

### Story 17.4: Enforce safe logging and payload sanitization

Tasks:
1. Identify all secret-bearing DTOs.
2. Identify all provider responses that may contain sensitive data.
3. Implement redaction utilities.
4. Apply redaction in credential, provider, and audit flows.
5. Add tests.

### Story 17.5: Implement retention handling for snapshots

Tasks:
1. Define retentionUntil calculation rules once approved.
2. Apply retentionUntil on sensitive snapshots.
3. Decide whether cleanup is scheduled or manual in v1.
4. If scheduled, add cleanup job design.
5. Add tests for retention metadata population.

## Epic 18: Testing, QA, and Fixtures

### Goal
Provide deterministic validation across backend, frontend, orchestration, and integrations.

### Source references
1. engineering-spec.md testing strategy
2. plan.md acceptance criteria and success metrics

### Story 18.1: Build shared backend test fixtures

Tasks:
1. Create AdminUser fixture.
2. Create ManagedAccount fixture.
3. Create AccountPreference fixture.
4. Create Competitor fixture.
5. Create ResearchRun fixture.
6. Create creator post corpus fixture.
7. Create competitor corpus fixture.
8. Create trend snapshot fixture.
9. Create draft-generation result fixture.

### Story 18.2: Add unit tests for scoring and validation logic

Tasks:
1. Test creatorFitScore calculation.
2. Test noveltyScore calculation.
3. Test policy-risk filtering behavior.
4. Test lexical overlap thresholds.
5. Test semantic similarity thresholds.
6. Test style-fit scoring.

### Story 18.3: Add integration tests for CRUD and workflow APIs

Tasks:
1. Test managed account create/list/update/archive.
2. Test preferences get/upsert.
3. Test competitor create/list/update.
4. Test suggestion accept/reject.
5. Test credential create/list/validate/revoke.
6. Test run create/list/detail/cancel.
7. Test draft review submit.

### Story 18.4: Add orchestration tests

Tasks:
1. Test happy-path full run progression.
2. Test creator data hard failure.
3. Test competitor soft-failure continuation.
4. Test trend partial failure.
5. Test generation partial success.
6. Test validation zero-survivor hard fail.
7. Test finalization failure recovery behavior.

### Story 18.5: Add frontend workflow tests

Tasks:
1. Test login redirect to protected shell.
2. Test accounts list rendering.
3. Test account create flow.
4. Test preferences save flow.
5. Test competitor suggestion accept flow.
6. Test run creation flow.
7. Test run polling stops on terminal state.
8. Test draft review submission flow.

### Story 18.6: Map tests back to PRD acceptance criteria

Tasks:
1. Create a traceability checklist from each acceptance criterion in plan.md.
2. Link each criterion to at least one test suite or manual check.
3. Identify uncovered acceptance criteria.
4. Add missing tests or manual verification steps.

## Epic 19: Rollout, Migration, and Release Readiness

### Goal
Sequence the implementation safely from schema through UI and validation into a releaseable internal product increment.

### Source references
1. plan.md release recommendation and success metrics
2. engineering-spec.md migration plan and delivery readiness checklist

### Story 19.1: Prepare migration runbook

Tasks:
1. Document migration execution order.
2. Document environment prerequisites.
3. Document seed expectations.
4. Document rollback considerations.
5. Document Prisma client regeneration step.

### Story 19.2: Prepare environment configuration checklist

Tasks:
1. List required database env vars.
2. List Redis env vars.
3. List JWT env vars.
4. List Gemini env vars.
5. List X provider env vars.
6. List external trend provider env vars.
7. List encryption key env vars.

### Story 19.3: Prepare release readiness checklist execution

Tasks:
1. Confirm schema approval.
2. Confirm run-stage contract approval.
3. Confirm initial provider set approval.
4. Confirm credential encryption approach approval.
5. Confirm scoring weights and novelty thresholds approval.
6. Confirm review workflow approval.
7. Record sign-off status for each item.

### Story 19.4: Prepare phased delivery milestones

Tasks:
1. Map Phase 1 from plan.md to the relevant epics and stories.
2. Map Phase 2 from plan.md to the relevant epics and stories.
3. Map Phase 3 from plan.md to the relevant epics and stories.
4. Map Phase 4 from plan.md to the relevant epics and stories.
5. Identify which stories can run in parallel.
6. Identify which stories are strict blockers.

## 6. Suggested Build Order

Recommended sequence:
1. Complete Epic 0 before locking behavior.
2. Complete Epics 1 and 2 before feature implementation.
3. Complete Epics 3 through 8 before starting frontend workflow pages that depend on them.
4. Complete Epics 9 through 13 before claiming end-to-end backend readiness.
5. Complete Epics 14 through 16 for operator-facing delivery.
6. Complete Epics 17 through 19 before release sign-off.

## 7. Blockers and Dependency Notes

1. Epic 2 depends on decisions from Epic 0 about retention, lookback defaults, and security model.
2. Epic 5 depends on approved encryption-key management.
3. Epic 7 depends on competitor suggestion invocation rules.
4. Epic 8 depends on active-run concurrency rules.
5. Epic 9 depends on approved provider set and browser automation scope.
6. Epic 11 depends on approved scoring weights.
7. Epic 12 depends on approved novelty thresholds and style-fit expectations.
8. Epic 15 and Epic 16 depend on the corresponding backend contracts being stable.

## 8. Locked V1 Choices

The following choices are approved and should be used as the baseline for implementation:
1. Use the approved hybrid creator-history policy and the 120-day novelty default from section 3.
2. Enforce one active run per managed account, with queued and running treated as active.
3. Generate competitor suggestions only during runs.
4. Use Google Trends, first-party curated RSS and news aggregation, and GDELT as the initial external provider set.
5. Use envelope encryption with wrapped per-record keys for stored credentials, with local-development-only environment-key fallback.
6. Keep browser automation strictly read-only.
