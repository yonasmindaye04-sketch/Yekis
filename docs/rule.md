# Development Rules

These rules define how the codebase should evolve.

## 1. Keep the architecture layered

- Route handlers should stay thin and delegate to services.
- Business logic should live in service modules under apps/backend/src/modules/*.
- Prisma access should be centralized through the shared Prisma client.

## 2. Validate all inputs

- Use schema validation for request bodies.
- Reject invalid or incomplete payloads early with clear error responses.
- Prefer explicit error codes over generic failures.

## 3. Treat financial workflows as high-risk

- Escrow, KYC, and disputes must be audited and reviewed carefully.
- Do not skip basic logging, state checks, or duplicate-protection logic.
- Keep transaction state transitions explicit and deterministic.

## 4. Keep secrets out of the repository

- Never commit secrets or credentials.
- Read configuration from environment variables.
- Default to non-production-safe values only for local development.

## 5. Preserve data integrity

- Use Prisma migrations instead of manual SQL changes when possible.
- Preserve relationships and indexes when changing the schema.
- Avoid destructive changes without a review and backup plan.

## 6. Write and maintain tests

- Add or update tests when changing behavior.
- Cover critical paths such as auth, escrow release, and dispute flow.
- Prefer real behavior tests over brittle mock-only verification.

## 7. Keep documentation updated

- Update the relevant Markdown files in the same change whenever code, configuration, schema, routes, UI, architecture, or workflows change.
- Add every completed change to `CHANGELOG.md` under `Unreleased`.
- Keep `API.md`, `DATABASE.md`, `ARCHITECTURE.md`, `WALKTHROUGH.md`, `SETUP.md`, `PROJECT_CONTEXT.md`, and `COMPLETENESS_CHECKLIST.md` aligned with their areas of ownership.
- Documentation must distinguish locally verified behavior from mocks, stubs, planned work, and production-ready integrations.
- The persistent agent instruction is stored in `.agents/AGENTS.md`.
