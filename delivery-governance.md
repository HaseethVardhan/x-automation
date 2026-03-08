# X Automation Delivery Governance Baseline

This document captures the Epic 0 delivery-governance baseline for v1 implementation.

## 1. Ownership Expectations

Epic ownership is assigned by execution domain rather than by title alone.

1. Backend owns schema design, DTOs, services, queue orchestration, provider contracts, and audit logging.
2. Frontend owns route flows, operator-facing states, form validation UX, and API integration in the client.
3. Infrastructure owns environment provisioning, secrets and key-management wiring, queue infrastructure, and deployment support.
4. QA owns traceability to acceptance criteria, regression coverage, fixture quality, and release verification.
5. Cross-cutting stories require one directly accountable owner plus named reviewers from each impacted domain.

## 2. Story Status Workflow

Stories must move through the following status flow:

1. Draft
Requirements are still being clarified or decomposed.
2. Ready
Dependencies and decisions are resolved and implementation can begin.
3. In Progress
An owner is actively implementing the story.
4. Blocked
Progress cannot continue because of an unresolved dependency, decision, or environment issue.
5. In Review
Code, schema, contracts, or docs are ready for structured review.
6. Verified
Required tests or manual checks have passed.
7. Done
Implementation, verification, and required documentation updates are complete.

## 3. Blocking-Issue Escalation Path

Blocking issues must be escalated in the same order every time.

1. The story owner records the blocker, impact, and suspected dependency immediately.
2. The owner notifies the responsible domain lead the same working day.
3. If the blocker crosses product or architectural boundaries, backend and frontend leads review it before more dependent work starts.
4. If the blocker changes scope, acceptance criteria, or release sequence, it must be escalated to the product owner or engineering decision-maker for a written ruling.
5. Resolved blockers must be reflected in the source document that governed the decision.

## 4. Review Order

Review sequencing is fixed for v1 delivery.

1. Schema first.
2. Contracts second.
3. UI third.
4. Integration fourth.

No downstream implementation should be marked complete when it depends on an upstream artifact that has not yet passed review.

## 5. Documentation Update Rule

Every completed story must update documentation as part of completion, not afterward.

1. If behavior, constraints, or defaults changed, the governing specification document must be updated in the same change set.
2. If a story locks a previously open decision, the decision must be stated explicitly in the relevant planning or engineering document.
3. If a new shared policy, workflow, or convention is introduced, it must be written in a durable document rather than left only in code or chat history.
4. A story may move to Done only after implementation, verification, and documentation are all complete.