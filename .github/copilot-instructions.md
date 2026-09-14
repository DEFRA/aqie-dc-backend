# AQIE DC Copilot Instructions (Architecture-First)

These instructions define how to extend this platform safely and consistently.
Follow them for all feature work, refactors, bug fixes, and tests.

## 1) System Context

This repository is the backend service in a two-service architecture:

- Frontend service: Hapi + Nunjucks presentation tier on port 3000
- Backend service: Hapi API + MongoDB persistence + SQS/LocalStack integration on port 3001

Backend is the system of record for domain behavior:

- Owns data validation, business logic, persistence, and API contracts
- Exposes stable endpoints consumed by frontend
- Coordinates async ingestion flows (SQS/callback/import paths)

## 2) Current Backend Architecture

Key structure:

- src/index.js: process startup and unhandled rejection handling
- src/server.js: Hapi server composition and plugin registration
- src/plugins/router.js: central route registration
- src/routes/: route definitions, request validation, transport-level concerns
- src/controllers/: business logic and DB orchestration
- src/common/helpers/: shared infra helpers (mongodb, logging, tracing, fail action)
- src/common/schemas/: Joi schemas used by routes/controllers
- src/sqs/: queue polling, message mapping, and dispatch helpers
- src/migrations/: collection setup and import tooling

Layering rule:

- Route -> Controller -> DB/Helper
- Routes should not contain persistence-heavy business logic
- Controllers should not know HTTP transport details unless unavoidable

## 3) API and Contract Rules

- Maintain backward-compatible response shapes where possible
- Use explicit status code constants and Boom for error semantics
- Keep route ordering safe (search/static routes before id-parameter routes)
- Validate request payloads/params with Joi and shared schemas

When adding an endpoint:

1. Define route object in src/routes
2. Reuse/extend schema in src/common/schemas
3. Implement controller operation in src/controllers
4. Add tests for route and controller
5. Update API docs tags/description where relevant

## 4) MongoDB and Data Modeling Rules

- Use existing collection naming and linkage conventions
- Preserve application-to-item relationships (for example applicationId links)
- Prefer id fields and indexes consistent with current conventions
- Keep writes atomic where required; use sessions/transactions when supported
- Support fallback behavior where local standalone Mongo does not support transactions

For schema/index changes:

- Add or update migration/setup logic under src/migrations or startup setup helpers
- Keep changes idempotent and safe for repeated startup

## 5) Async Ingestion and SQS Rules

- Treat SQS/plugin flows as optional-local and resilient
- Do not crash API server on recoverable queue polling failures
- Log ingest failures with message context, without leaking sensitive payload fields
- Keep queue names/endpoints configurable through config schema

## 6) Configuration and Environment Rules

- All runtime configuration must be declared in src/config.js (convict)
- New env vars require: doc, format, default, env key
- Provide local defaults for developer productivity
- Keep security-sensitive values in environment variables, not source

## 7) Security, Observability, and Reliability

- Keep request tracing and request logging plugins enabled
- Avoid logging secrets, tokens, full credentials, or unredacted sensitive payloads
- Return user-safe errors while preserving useful server logs
- Keep health endpoint behavior lightweight and deterministic

## 8) Testing Strategy (Required)

Use Vitest with existing project split:

- Unit tests: src/\*_/_.test.js
- Integration tests: src/\*_/_.integration.test.js

Minimum for feature changes:

- Controller tests for success + failure branches
- Route tests for validation and HTTP semantics
- Integration tests when persistence or plugin interactions change

Avoid flaky tests:

- Control time-dependent values
- Isolate DB state per test
- Mock external network dependencies where appropriate

## 9) Code Style and Change Scope

- Make minimal, targeted changes; avoid broad refactors unless requested
- Reuse existing helper utilities before introducing new abstractions
- Keep comments concise and architectural, not obvious line-by-line narration
- Keep naming aligned with existing domain vocabulary

## 10) Change Safety Checklist (Must Pass Before Completion)

For each feature/bug-fix, ensure all are true:

- Route/controller layering preserved
- Config schema updated for new runtime options
- Schema validation updated where input/output changed
- Tests added/updated and passing
- No sensitive data introduced in logs
- Startup/build behavior remains stable in local environment

## 11) If Ambiguous, Prefer This Default

- Put domain/business rules in controllers
- Keep routes focused on HTTP and validation concerns
- Keep integrations resilient and non-blocking where feasible
- Preserve existing API behavior unless requirement explicitly changes it
