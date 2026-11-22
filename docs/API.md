# REST API

Base path: `/api`. Unless listed as public, endpoints require the `nd_session` HTTP-only cookie. Obtain a CSRF token at `GET /auth/csrf`; send its value in `X-CSRF-Token` for every unsafe request. The Vite client handles both automatically.

Successful responses use `{ "data": value }`; resource collections may include `meta`. Errors use `{ "error": { "code", "message", "details? } }`. Zod validation errors return 400 with field paths. A request can access records only when their `userId` matches the signed-in user.

## Identity and account

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Database connectivity check |
| GET | `/auth/csrf` | Issue a CSRF cookie/token |
| POST | `/auth/register` | Create an account and session |
| POST | `/auth/login` | Start a session |
| POST | `/auth/logout` | Revoke sessions and clear the cookie |
| GET | `/auth/me` | Current profile and settings |
| POST | `/auth/forgot-password` | Request a time-limited reset |
| POST | `/auth/reset-password` | Consume the one-time reset token |
| GET/PATCH | `/users/profile` | Read or edit name, timezone, onboarding state |
| GET/PATCH | `/users/settings` | Read or edit goals and notification preferences |
| GET | `/users/export` | Download JSON of the owner’s records |
| DELETE | `/users/account` | Delete the account after password confirmation |

## Optional AI companion

AI routes require a signed-in user, server-side Anthropic configuration, a deployment feature flag, and the user’s opt-in for the companion and feature. See [AI companion data handling](AI.md) for exact fields, quotas, and retention.

| Method | Path | Purpose |
|---|---|---|
| GET | `/ai/status` | Check server availability, feature opt-ins, and whether usage data exists |
| POST | `/ai/morning-briefing` | Prepare a cached, bilingual summary for the local day; body `{ "language": "en" | "kn" }` |
| POST | `/ai/quick-add` | Return a validated task/habit preview; body `{ "text": "...", "language": "en" | "kn" }`; does not create records |
| POST | `/ai/comeback-plan` | Explain 1–3 owner-verified deterministic suggestions; body `{ "ids": ["..."], "language": "en" | "kn" }` |
| POST | `/ai/weekly-reflection` | Summarize the last seven days; body `{ "language": "en" | "kn" }` |
| DELETE | `/ai/data` | Delete token-count rows and briefing cache and turn off AI opt-ins |

## Mitra personal assistant & evolving companion

Mitra provides bilingual navigation, guide replies, and an evolving smiling flame spirit companion. Optional open-ended chat requires `AI_MITRA_ENABLED`, a server-side provider key/model, and explicit user consent. Saved actions are validated, shown as previews, and written only after confirmation. History is owner-scoped, capped at 50 messages, retained for up to 30 days, and included in account export.

| Method | Path | Purpose |
|---|---|---|
| GET/PATCH | `/assistant/settings` | Read or change launcher, language, nudge, quiet-hour, voice, tour, and AI preferences/consent |
| GET | `/assistant/history` | Read the latest 50 unexpired Mitra messages |
| DELETE | `/assistant/history` | Clear Mitra conversation messages |
| GET | `/assistant/nudges` | Create and return eligible in-app nudges (at most two per local day) |
| POST | `/assistant/nudges/:id/dismiss` | Dismiss an active nudge for the signed-in owner |
| POST | `/assistant/message` | Send prompt, confirm/cancel action, or undo previous action |
| DELETE | `/assistant/data` | Delete Mitra history/preferences and token usage |
| GET | `/mitra/state` | Current Mitra XP, level, evolution stage (`ember`, `flame`, `radiance`, `aurora`), and recommendations |
| POST | `/mitra/interact` | Interact with Mitra (`pet`, `talk`, `encourage`) to trigger mood poses and reflections |

## Daily planning & calendar synchronization

| Method | Path | Purpose |
|---|---|---|
| GET | `/overview?date=YYYY-MM-DD` | Timezone-aware day summary |
| GET/POST/PATCH/DELETE | `/tasks` | Task CRUD, with `/:id/history` for events |
| GET/POST/PATCH/DELETE | `/categories` | User-owned task categories |
| GET/POST/PATCH/DELETE | `/habits` | Habit definitions |
| GET/POST/PATCH/DELETE | `/habit-logs` | Per-habit/day logs; range with `from` and `to` |
| GET/POST/PATCH/DELETE | `/schedule` | Schedule blocks; list with `fromDay`/`toDay` or `from`/`to` |
| GET/POST/PATCH/DELETE | `/reminders` | One-time or recurring reminder records |
| POST | `/reschedule/suggestions` | Plan available slots for a date |
| POST | `/reschedule/:id/action` | Accept or reject a suggestion |
| GET | `/calendar/feed/:token.ics` | **Public** webcal subscription feed for Google/Apple/Outlook calendars |
| GET | `/calendar/sync` | Read calendar sync token, webcal URL, and sync status |
| POST | `/calendar/sync` | Trigger an on-demand export/sync refresh |
| POST | `/calendar/import` | Import external `.ics` events with automatic conflict detection |
| GET | `/calendar/export.ics` | Download an `.ics` calendar file for offline schedule backup |

## Tracking, wellbeing, and reproductive health

| Method | Path | Purpose |
|---|---|---|
| GET/POST/PATCH/DELETE | `/water` | Water intake logs |
| GET/POST/PATCH/DELETE | `/sleep` | Sleep timing and duration |
| GET/POST/PATCH/DELETE | `/workouts` | Activity and duration logs |
| GET/POST | `/breathing-sessions` | Completed breathing pauses and configurable rhythms |
| GET/POST/PATCH/DELETE | `/wellness` | Mood and energy check-ins |
| GET/POST/PATCH/DELETE | `/screen-time` | Manual category/app usage logs |
| GET/POST/PATCH/DELETE | `/food` | Meals and food spending |
| GET/POST/PATCH/DELETE | `/reflections` | Private day reflections |
| GET/POST/PATCH/DELETE | `/notifications` | In-app notification records |
| GET | `/insights` | Calculated trends, budget and Comeback Score |
| GET | `/reproductive/profile` | Read reproductive tracking profile and active mode |
| POST | `/reproductive/profile` | Update cycle lengths, LMP, pregnancy due date, and explicit consent |
| GET | `/reproductive/cycles` | Retrieve cycle entries (notes & symptoms decrypted on-the-fly) |
| POST | `/reproductive/cycles` | Log daily symptoms, kick counts, and encrypted notes (AES-256-GCM) |
| DELETE | `/reproductive/purge` | **Right-to-be-Forgotten**: immediate hard-delete of all cycle & pregnancy data |
| GET | `/push/key` | Optional VAPID public key |
| GET | `/push/status` | Current account’s push-subscription count |
| POST/DELETE | `/push/subscriptions` | Register or remove this account’s browser subscription |

CRUD endpoints accept `page` and `limit` (capped at 100), and supported text resources accept `q`. Tasks additionally accept `status`; reminders accept `state`; date-stamped logs accept `date` or `from`/`to`. All user-provided bodies are validated with Zod.

## Example

```http
POST /api/tasks
Content-Type: application/json
X-CSRF-Token: <token>
Cookie: nd_session=<http-only JWT>; nd_csrf=<csrf token>

{"title":"Read for a few minutes","priority":"LOW","scheduledMinutes":15}
```

The response includes the new task in `data`; the server also records a task-history event.
