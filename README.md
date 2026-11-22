# NAMMA DINA (ನಮ್ಮ ದಿನ) — OUR DAY

**Make today meaningful. Make tomorrow better.**

Namma Dina is a personal day-management and lifestyle app for planning, routines, wellness, and gentle recovery when a day does not go to plan. It features a midnight Aurora interface, deterministic scheduling engine, native Android support, and bilingual English & ಕನ್ನಡ support.

---

## What’s included

- **Dual-Mode Authentication:**
  - **Web:** HTTP-only, `SameSite=Lax` session cookies with CSRF double-submit protection.
  - **Android Native:** Short-lived JWT access tokens with long-lived refresh tokens stored securely via `@capacitor/preferences`, with automatic 401 interception and token refresh.
- **Daily Command Center:** Localized greeting (English / ಕನ್ನಡ), task and habit progress, schedule blocks, hydration, screen-time summary, and Comeback Score.
- **Task Management & Scheduling:** Prioritized tasks, deadlines, recurring schedules, categories, bidirectional sync between tasks and calendar blocks, and smart gap-filling rescheduling.
- **Habits & Wellbeing:** Daily/weekly/custom habits with 7-day visual rhythm indicators, water tracking, sleep logs, workouts, mood/energy rating, manual digital wellbeing tracking, food spending, private daily reflections, and completed breathing sessions.
- **Aurora motion:** User-selectable Full/Calm/Off motion, reduced-motion support, time-of-day tint, and a lightweight ambient particle canvas that pauses in the background.
- **Optional AI companion:** Server-only Anthropic integration for morning briefings, confirmed quick-add previews, deterministic comeback explanations, and weekly reflections. Every feature is off by default; see [AI companion privacy and configuration](docs/AI.md).
- **Mitra evolving flame companion:** Original smiling flame mascot with animated eye blinks, rosy cheeks, and 4 evolution tiers (Ember, Flame, Radiance, Aurora). Automatically gains +10 XP upon task or schedule block completion, with real-time level progress, empathetic wellness feedback, bilingual navigation, searchable offline help, and optional private chat history. See [Mitra guide and data controls](docs/MITRA.md).
- **Reproductive & Pregnancy Health (Privacy-First):**
  - Dedicated modes for menstrual cycle tracking and pregnancy tracking (`/app/cycle`).
  - Explicit consent gate and zero third-party data transmission.
  - Field-level **AES-256-GCM encryption** for sensitive notes, symptoms, and cycle milestones.
  - One-click **Right to be Forgotten** instant purge (`DELETE /api/reproductive/purge`).
- **Bidirectional Calendar Engine:**
  - Token-authenticated webcal subscription feed (`/api/calendar/feed/:token.ics`) compatible with Google Calendar, Apple Calendar, and Outlook.
  - Event import with conflict detection and one-click `.ics` schedule file export.
- **Native Android Experience:**
  - Hardware back-button routing via `@capacitor/app`.
  - Polished status-bar theming and splash screen via `@capacitor/status-bar` and `@capacitor/splash-screen`.
  - Network status monitoring with real-time offline indicator via `@capacitor/network`.
  - Android permissions configured (`POST_NOTIFICATIONS`, `ACCESS_NETWORK_STATE`, `INTERNET`) with `allowBackup="false"`.
  - Release APK and Google Play App Bundle (AAB) automated build scripts.
- **PWA & Web Readiness:**
  - Responsive Aurora design system with reduced-motion support.
  - Complete PWA icon suite: 192×192, 512×512, maskable icons, apple-touch icon, and favicon.
  - Offline fallback page (`offline.html`) and real-time offline banner.
  - Workbox navigation denylist protecting `/api` endpoints.
  - Search engine optimization with `robots.txt` and `sitemap.xml`.
- **Production Infrastructure:**
  - Reverse proxy awareness (`trust proxy` enabled for Render / Railway / Nginx).
  - Production request logging with timestamps, status, latency, and client IP.
  - Automated database backup scripts (`scripts/backup.sh`, `scripts/backup.ps1`) with 7-day archive rotation.
  - Step-by-step [Deployment Guide](docs/DEPLOYMENT.md) and [Backup & Restore Guide](docs/BACKUP_AND_RESTORE.md).
  - Automated GitHub Actions CI workflow for linting, typechecking, and testing.

---

## Stack and structure

- `client/`: React 19, TypeScript, Vite, Tailwind CSS / Aurora CSS, React Router, TanStack Query, React Hook Form, Zod, Recharts, Lucide React, Capacitor 8 plugins, and Vite PWA.
- `server/`: Node.js, TypeScript, Express 5, Prisma 6, PostgreSQL, bcryptjs, JWT, Helmet, rate limiting, and Vitest.
- `client/android/`: Native Android project configured with Capacitor 8.
- `scripts/`: Build automation (`build-android.mjs`), icon generation, production secret generation, and database backup scripts.
- `docs/`: REST API documentation, deployment guide, and disaster recovery procedures.

---

## Local Development

Prerequisites: Node.js 20.19 or newer, npm, and Docker Desktop.

1. **Install dependencies and create environment:**
   ```powershell
   npm install
   Copy-Item .env.example .env
   ```

2. **Start PostgreSQL, apply migrations, and seed demo account:**
   ```powershell
   docker compose up -d db
   npm run db:deploy
   npm run db:seed
   ```

3. **Start local development servers:**
   ```powershell
   npm run dev
   ```
   Open [http://localhost:5155](http://localhost:5155). The API runs at `http://localhost:4000`.

---

## Android Builds

Ensure Android SDK tools are installed and `ANDROID_HOME` is set:

```powershell
# Build Debug APK (outputs to client/android/app/build/outputs/apk/debug/app-debug.apk)
npm run android:apk

# Build Release APK
npm run android:release

# Build Google Play App Bundle (AAB)
npm run android:bundle
```

For release signing, set the following environment variables or configure them in your CI/CD pipeline:
- `NAMMA_DINA_RELEASE_STORE_FILE`
- `NAMMA_DINA_RELEASE_STORE_PASSWORD`
- `NAMMA_DINA_RELEASE_KEY_ALIAS`
- `NAMMA_DINA_RELEASE_KEY_PASSWORD`

---

## Automated Verification

Run all test suites and quality gates:

```powershell
npm run typecheck   # TypeScript check on client and server
npm run lint        # ESLint check
npm test            # Vitest suite (29 tests across server/client suites: crypto, mitra, api, business, ai)
npm run build       # Production client and server build
```

---

## License

This project is licensed under the [MIT License](LICENSE).
