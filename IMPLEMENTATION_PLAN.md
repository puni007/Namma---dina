# NAMMA DINA implementation plan

## Product direction

Build a responsive, mobile-first Aurora dark-mode day-management app with real persistence and a modular Express API. Keep recommendations deterministic and explainable, and keep all records scoped to the authenticated user.

## Milestones

1. [x] Scaffold React/TypeScript/Vite client and TypeScript/Express server; shared scripts, linting, formatting, environment sample, and PostgreSQL Compose service.
2. [x] Define normalized Prisma models, indexes, migrations, and practical seed data.
3. [x] Implement cookie-based authentication, CSRF protection, validation, rate limits, profile/privacy operations, and user isolation.
4. [x] Build reusable Aurora design tokens, responsive application navigation, authentication, onboarding, and dashboard.
5. [x] Connect tasks, categories, schedule, habits, reminders, wellness, screen time, food/spending, reflection, notifications, and account pages to API CRUD.
6. [x] Add deterministic adaptive rescheduling, schedule conflict checks, recovery events, Comeback Score, and computed insights.
7. [x] Add unit/API tests and PWA setup; run install, type checks, lint, tests, production builds, Prisma migration/seed, and fix failures.
8. [x] Document local setup, API, privacy/security behavior, deployment, and known provider-dependent limitations.

## Verification notes

- Host capabilities: Node.js 26.3.1, npm 12.0.2, Docker 29.8.2.
- Repository was empty at start.
- Verification completed in this workspace: TypeScript checks, ESLint, 12 tests, production builds for API and client, Prisma deploy (2 migrations, none pending), Prisma seed, and production dependency audit (0 vulnerabilities).
- The user-provided Borealis HTML was treated as a visual reference. The client uses a reduced-motion-aware CSS aurora treatment with responsive opacity/blur rather than importing or running its WebGL code.
- Browser visual QA was interrupted because the active Edge session detected user input; no browser screenshot or visual smoke result is claimed.
- Remaining provider-dependent work is documented in README: SMTP for production password recovery and VAPID/HTTPS for background Web Push. Screen time remains manually recorded in this browser application.
