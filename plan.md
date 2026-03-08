## Plan: X Automation Formal PRD

This document formalizes X-automation as an internal admin product that helps approved managed X accounts produce evidence-backed, style-aligned draft posts optimized for reach and relevance. The product does not guarantee virality and does not automate spammy amplification, engagement manipulation, or deceptive behavior. Version 1 focuses on async research, competitor and trend analysis, Gemini Flash draft generation, novelty/style checks, and human review.

**Product Summary**
X-automation enables an internal operator to input or select a managed X account, define content preferences, review manual and system-suggested competitors, run a deep research workflow, and receive one or more recommended draft posts tailored to the account’s historical style and current opportunity landscape. The system combines creator-history analysis, competitor analysis, X-native trend signals, external research signals, and Gemini Flash to generate reviewable drafts with supporting evidence.

**Problem Statement**
Internal teams managing X accounts currently rely on manual research to understand what a creator has posted, what competitors are doing, what topics are trending, and how to adapt new content to the creator’s style without repeating prior posts. This process is slow, inconsistent, hard to audit, and difficult to scale across multiple managed accounts. The current codebase only provides authentication and a placeholder home page, so the product workflow, domain model, and research pipeline must be designed from first principles.

**Goals**
1. Reduce time required to go from account selection to high-quality draft recommendation.
2. Improve consistency of research across creator history, competitor activity, and trend discovery.
3. Generate drafts that feel aligned to the creator’s style and domain rather than generic AI output.
4. Minimize repeat or overly similar drafts relative to the creator’s historical posts.
5. Provide evidence and rationale so internal operators can trust, review, and edit recommendations.
6. Operate within X policy boundaries and avoid manipulative or spammy automation patterns.

**Non-Goals**
1. Guarantee that any post will go viral.
2. Auto-publish or schedule content in v1.
3. Automate likes, follows, replies, reposts, or any engagement actions.
4. Support self-serve external creators or multi-tenant user onboarding in v1.
5. Build a generalized social media publishing suite across multiple platforms in v1.

**Target Users**
1. Internal content operators who manage approved X accounts.
2. Internal strategists who review topic opportunities and edit recommended drafts.
3. Internal admins who configure account access, competitors, and product settings.

**User Personas**
1. Content Operator
Needs a fast workflow to research a managed account, launch a run, inspect evidence, and get editable draft recommendations.
2. Content Strategist
Needs visibility into why a topic was selected, whether it fits the creator’s style, and how novel it is relative to prior posts.
3. Admin
Needs secure account setup, credential handling, auditability, and predictable run history.

**Key Assumptions**
1. The product is internal only in v1.
2. Approved managed accounts may use a combination of official X API access and encrypted stored browser session artifacts where API coverage is insufficient.
3. Trend discovery may use both X-native and external sources.
4. Human review is required before any draft is considered final.
5. Gemini Flash is the primary AI model for analysis and generation.

**Locked V1 Decisions**
1. Creator-history policy will use a hybrid window: analyze a rolling 180-day window, target the most recent 120 posts, require a minimum viable corpus of 40 posts, and backfill up to 365 days until the target corpus is reached or a hard cap of 250 posts is hit. This collection policy is global-only in v1 and is not a per-account setting.
2. Only one active research run is allowed per managed account in v1. Queued and running states both count as active. Operators may cancel and rerun, but superseding an active run is not allowed.
3. Competitor suggestions are generated only during research runs and are later reviewed in the competitor workspace. No dedicated on-demand suggestion refresh endpoint is included in v1.
4. The initial topic-scoring policy will use weighted optimization with creatorFitScore at 0.35, noveltyScore at 0.25, trendMomentumScore at 0.20, audienceFitScore at 0.15, and inverse policyRiskScore at 0.05. Topics with policyRiskScore at or above 0.70 are excluded before ranking.
5. The first external signal bundle will use Google Trends, a first-party curated RSS and news aggregation pipeline owned by the product, and GDELT as enrichment and fallback coverage.
6. Credential security will use envelope encryption with per-record AES-256-GCM data keys wrapped by a KMS or Vault-managed key-encryption key. A single environment-managed master key is allowed only for local development.
7. Browser automation is strictly read-only in v1. It may perform passive session validation required for read access, but it may not perform any state-changing actions or broader account-health workflows.

**Core User Stories**
1. As an internal operator, I want to select or create a managed X account so I can run research for the correct creator profile.
2. As an internal operator, I want to define the creator’s category, goals, exclusions, and style preferences so generated drafts are relevant and safe.
3. As an internal operator, I want to add competitors manually so I can ensure the system analyzes the right peer set.
4. As an internal operator, I want the system to suggest likely competitors so I can accelerate setup and discover adjacent accounts.
5. As an internal operator, I want to trigger a deep async research run so the system can analyze creator history, competitors, and trends without blocking the UI.
6. As an internal operator, I want to monitor run progress by stage so I know what the system is doing and whether any stage failed.
7. As a strategist, I want to inspect the evidence behind recommended topics and drafts so I can trust or challenge the output.
8. As a strategist, I want the system to avoid repeating prior creator posts or stale phrasing so the output feels fresh.
9. As a strategist, I want the generated draft to reflect the creator’s style so it does not feel generic or obviously AI-written.
10. As a strategist, I want to review and edit the final draft before using it so quality control remains human-led.
11. As an admin, I want secure credential and session handling so managed account access is controlled and auditable.
12. As an admin, I want historical run records and artifacts so I can audit what happened, what was generated, and what was approved.

**User Journey**
1. Operator logs in through the existing admin authentication flow.
2. Operator opens the managed account workspace and either selects an existing account or creates a new one.
3. Operator configures or reviews account preferences including category, goals, exclusions, tone constraints, and competitor list.
4. Operator accepts system-suggested competitors or adds competitors manually.
5. Operator clicks Run.
6. The system creates an async research run and moves through creator analysis, competitor analysis, trend aggregation, topic scoring, generation, and validation stages.
7. The operator monitors stage progress and sees any warnings or partial failures.
8. The system returns one or more draft variants with rationale, evidence, novelty checks, and style-fit summaries.
9. The strategist edits or approves a draft.
10. The product stores the run, artifacts, review decision, and final draft outcome for later reference.

**Functional Requirements**
1. Authentication and Access
The product must reuse the current JWT-protected internal admin access pattern and protect all new feature routes and APIs.
2. Managed Account Setup
The product must let internal operators create and manage approved X accounts including handle, category, goals, exclusions, and connection metadata.
3. Credential Handling
The product must support official API credentials where available and encrypted session artifacts for approved browser-driven read access, with auditing and revocation metadata.
4. Competitor Management
The product must support manual competitor entry and system-suggested competitors with accept and reject actions.
5. Preferences
The product must store content category, writing guidance, banned themes, banned claims, posting objectives, and style constraints for each managed account.
6. Async Research Runs
The product must create persisted research runs with statuses, per-stage progress, timestamps, and artifact retention.
7. Creator History Analysis
The product must analyze a creator’s recent post history, themes, structure, hook patterns, style markers, and apparent engagement signals.
8. Competitor Analysis
The product must analyze selected competitors’ themes, formats, hooks, and patterns that appear to perform well.
9. Trend Aggregation
The product must collect X-native and external trend or news signals and normalize them into topic candidates.
10. Topic Scoring
The product must rank candidate topics based on creator fit, novelty, timeliness, relevance, and risk constraints.
11. Draft Generation
The product must use Gemini Flash to generate structured draft variants backed by the run’s evidence bundle.
12. Novelty and Style Validation
The product must compare generated drafts against creator history and prior drafts to reduce duplication and style drift.
13. Review Workflow
The product must let operators inspect evidence, edit drafts, and mark outcomes such as approved, rejected, or needs re-run.
14. Run History
The product must retain historical runs, artifacts, and decisions for auditing and comparison.
15. Explainability
The product must show why a draft was suggested, including relevant creator, competitor, and trend signals.

**Out of Scope for V1**
1. Auto-publishing to X.
2. Scheduling posts.
3. Automated engagement actions.
4. Multi-account amplification or coordination tooling.
5. Real-time collaborative editing.
6. Broader social channel support beyond X.

**Quality Requirements**
1. Output quality
Drafts should read as creator-aligned, topical, and non-generic.
2. Trustworthiness
Operators must be able to inspect the basis for each recommendation.
3. Safety and compliance
The system must avoid spam-like patterns, duplicate-content generation, and policy-risk suggestions.
4. Reliability
Async runs must survive partial failures and preserve useful artifacts.
5. Security
Sensitive credentials and browser session artifacts must be encrypted and auditable.

**Acceptance Criteria**
1. Managed account setup
Given an authenticated admin, when they create a managed account with a valid X handle and required metadata, then the account is saved and available for later runs.
2. Competitor management
Given a managed account, when an operator adds competitors manually or accepts a suggested competitor, then the competitor set is persisted and visible in the workspace.
3. Research run creation
Given a configured managed account, when an operator clicks Run, then the system creates a new persisted async run with an initial queued or running status.
4. Stage progress visibility
Given an active run, when the operator views the run detail screen, then they can see stage-by-stage progress, status, and any failure or warning states.
5. Creator analysis
Given a run with accessible creator data, when the creator-analysis stage completes, then the system stores a creator style and topic summary artifact.
6. Competitor analysis
Given a run with at least one competitor, when competitor-analysis completes, then the system stores structured competitor findings for use in topic scoring.
7. Trend aggregation
Given a run with configured sources, when trend collection completes, then the system stores normalized topic candidates from X-native and external sources.
8. Draft generation
Given a run with sufficient evidence, when generation completes, then the system stores at least one draft variant and supporting rationale.
9. Novelty checks
Given generated drafts, when post-generation validation runs, then drafts that exceed duplication thresholds are flagged or rejected before review.
10. Style-fit checks
Given generated drafts, when style validation completes, then the draft record includes a style-fit summary or score.
11. Review workflow
Given one or more generated draft variants, when an operator edits or approves a draft, then the final review decision and edited content are persisted.
12. Run history
Given previous runs for a managed account, when an operator opens run history, then they can inspect prior runs, statuses, artifacts, and review outcomes.
13. Explainability
Given a generated draft, when an operator opens draft details, then they can see which creator, competitor, and trend signals influenced the recommendation.
14. Security and auditability
Given credential or session usage, when account access occurs, then the system records auditable events tied to the managed account and internal operator.

**Success Metrics**
1. Median time from run start to first reviewable draft.
Target: under 10 minutes for standard runs with normal source availability.
2. Operator approval rate.
Target: at least 40 percent of runs produce a draft approved without requiring a full re-run.
3. Edit distance from suggested draft to approved draft.
Target: median edit distance below the threshold defined by the content team, indicating usable first-pass quality.
4. Novelty pass rate.
Target: at least 90 percent of surfaced drafts pass duplication thresholds against recent creator history.
5. Evidence coverage rate.
Target: at least 95 percent of reviewable drafts include creator, competitor, and trend evidence summaries.
6. Run completion rate.
Target: at least 85 percent of runs complete with at least one reviewable draft despite partial source failures.
7. Suggestion utility rate.
Target: at least 30 percent of system-suggested competitors are accepted by operators during setup.
8. Operator trust score.
Target: post-run internal survey average of at least 4 out of 5 on usefulness and confidence.

**Guardrails and Policy Constraints**
1. The system must not promise guaranteed virality.
2. The system must not automate engagement or coordinated amplification.
3. The system must not recommend irrelevant trend hijacking or excessive hashtag stuffing.
4. The system must not generate deceptive or substantially duplicative content as a growth strategy.

**Dependencies**
1. X data access through official APIs where available.
2. Approved read-oriented browser automation for internal managed accounts when API coverage is insufficient.
3. Gemini Flash access and prompt governance.
4. External trend providers consisting of Google Trends, a first-party curated RSS and news aggregation pipeline, and GDELT enrichment.
5. Secure secret storage and encryption support with envelope encryption and a KMS or Vault-managed key-encryption key.
6. Queue infrastructure for long-running jobs.

**Risks**
1. X data-source coverage may vary by access model, rate limits, or platform changes.
2. Browser-driven reads may be brittle and require maintenance.
3. Trend relevance may be noisy if external-source quality is inconsistent.
4. Style adaptation may overfit and become too similar to prior posts if novelty controls are weak.
5. Generated drafts may appear generic if evidence bundling and prompt design are weak.
6. Security risk is elevated if stored browser session artifacts are not handled with strict controls.

**Release Recommendation**
1. Phase 1
Ship managed accounts, preferences, manual competitors, async run skeleton, and run monitor.
2. Phase 2
Ship creator analysis, competitor analysis, normalized trend ingestion, and evidence views.
3. Phase 3
Ship Gemini Flash generation, novelty checks, style-fit summaries, and review workflow.
4. Phase 4
Tune scoring heuristics, suggested competitors, and quality metrics dashboards.

**Relevant files**
- c:\webdev01\X-automation\client\src\App.tsx — protected route entry point to evolve into the admin application shell
- c:\webdev01\X-automation\client\src\pages\HomePage.tsx — current placeholder page to replace with dashboard or route outlet
- c:\webdev01\X-automation\client\src\pages\LoginPage.tsx — current admin sign-in UI to preserve
- c:\webdev01\X-automation\client\src\services\auth.ts — token and API access pattern to extend into authenticated services
- c:\webdev01\X-automation\server\src\app.module.ts — root module for new product modules
- c:\webdev01\X-automation\server\src\auth\auth.controller.ts — current login endpoint to preserve
- c:\webdev01\X-automation\server\src\auth\auth.service.ts — current admin auth lookup and token issuance logic
- c:\webdev01\X-automation\server\src\auth\strategies\jwt.strategy.ts — current JWT request context pattern
- c:\webdev01\X-automation\server\prisma\schema.prisma — schema that will need a full redesign for the product domain

**Next Document: Engineering Spec**
The next planning artifact should convert this PRD into an implementation-heavy engineering spec with the following sections:
1. Domain schema tables with fields, types, enums, relationships, indexes, and retention rules.
2. API endpoint contracts with methods, auth requirements, request DTOs, response shapes, and error cases.
3. Queue-stage definitions including inputs, outputs, retry behavior, persisted artifacts, and failure semantics.
4. Integration adapter contracts for X API, browser-driven reads, external trends, and Gemini Flash.
5. Frontend route map, page responsibilities, and data-fetching boundaries.
6. Observability, audit logging, and security controls for credential/session handling.

**Implementation Defaults To Carry Forward**
1. The creator-analysis window and corpus policy should be implemented exactly as locked above unless a later versioned product decision changes it.
2. noveltyLookbackDays should default to 120 days and remain configurable within a bounded range in implementation as the account-level novelty control.
3. Queue and UI behaviors should enforce the one-active-run rule consistently across create, cancel, and rerun flows.
4. External-trend adapters should ship against the approved first-release provider bundle before any additional providers are added.
5. Credential handling should treat production and non-production key management differently, with the environment-master-key fallback limited to local development only.