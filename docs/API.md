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

## Daily planning

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

Schedule creation rejects overlaps with another user-owned block or a scheduled task. Fixed commitments are included in planning. Recommendations remain suggestions until explicitly accepted.

## Tracking and reflection

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
