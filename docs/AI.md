# AI companion

The AI companion is optional, off by default, and called only from the Express server. If `ANTHROPIC_API_KEY` or `AI_MODEL` is empty, or no feature flag is enabled, AI controls stay hidden and the existing app continues to work without AI. No model is selected in the example configuration.

## Configuration

Set these on the server only. Do not add them to `VITE_*` variables, the Android app, or client source.

| Variable | Purpose | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Server-side Anthropic credential | unset |
| `AI_MODEL` | Operator-selected model identifier | unset |
| `AI_MORNING_BRIEFING_ENABLED` | Allow the morning briefing | `false` |
| `AI_QUICK_ADD_ENABLED` | Allow natural-language task/habit previews | `false` |
| `AI_COMEBACK_PLAN_ENABLED` | Allow explanations of deterministic reschedule suggestions | `false` |
| `AI_WEEKLY_REFLECTION_ENABLED` | Allow weekly reflection summaries | `false` |
| `AI_MITRA_ENABLED` | Allow Mitra to answer open-ended chat requests | `false` |

The server must have a key and model and the corresponding feature flag must be true. A signed-in user must also enable both the AI companion and the specific feature in Settings. User consent is stored in `UserSettings`; all toggles default off.

## Data sent

Only fields needed for the selected request are sent. The API key, model name, prompts, and generated responses never go to the client. Names, email addresses, passwords, access tokens, refresh tokens, and other account credentials are never included in provider requests.

| Feature | Fields sent to Anthropic | Writes made by the AI endpoint |
|---|---|---|
| Morning briefing | Local date; up to 20 current tasks with title/status/due or scheduled time/duration; up to 20 active habit names/targets and completion; today’s water total; most recent sleep duration from the last 7 days; selected language | Token counts only. The text is cached in process memory per user/date/language; it is not persisted. |
| Quick add | User-entered text (up to 800 characters), selected language, local date and timezone context | Token counts only. The validated preview is returned to the client. A task or habit is written only after the user confirms through the existing CRUD endpoint. |
| Comeback plan | Up to 3 owner-verified suggested task titles, deterministic reasons, proposed start times and durations; selected language | Token counts only. Existing deterministic scheduling remains authoritative; no schedule is changed. |
| Weekly reflection | Last 7 days of reflection fields, reflection and wellness mood ratings, and sleep dates/durations; selected language | Token counts only. If distress/self-harm phrases are detected in reflection text, the provider is skipped and the server returns a supportive safety message. |
| Mitra chat | The current chat message, local date and timezone; no prior chat history is sent | The response or validated action preview is stored in the user's separate Mitra chat history. A saved action is written only after explicit confirmation. |

Every user-provided title and reflection is treated as untrusted data in the prompt. Outputs are length/schema checked. Quick-add results are validated through the same Zod schemas as task and habit creation. The client always asks for confirmation before saving a quick-add result.

## Limits and retention

- At most 20 successful or in-flight provider requests per user per local calendar day.
- At most 12 requests per client IP in a rolling 15-minute window on `/api/ai`, in addition to the normal API limit.
- Provider requests time out after 15 seconds. Provider failures return a short error and leave deterministic/non-AI flows available.
- `AIUsage` stores only feature name, input/output token counts, and request timestamp. It does not store prompt or response text. Mitra's user-requested, private conversation history is stored separately as `AssistantMessage` and can contain chat text and action previews.
- Mitra history is retained for up to 30 days and capped at the latest 50 messages. Users can clear chat history or delete all assistant data from Settings; account export includes assistant messages and preferences.
- Morning briefing text is held in process memory for the current local day and is lost on server restart.
- **Delete my AI data** removes usage rows and the in-memory briefing cache, and turns off the companion and every feature setting. **Delete my assistant data** also removes Mitra chat history and Mitra preferences.
- Account export includes AI usage counts and, separately, the user's Mitra chat history. Chat history is user data and does not appear in `AIUsage`.

Weekly reflection output is supportive language, not diagnosis or medical advice. Detection is a best-effort keyword screen and cannot identify every urgent situation. Users are encouraged to contact a trusted person, local support line, or local emergency services when appropriate.

## Tests

Server unit tests inject a mocked provider with `setAIProviderForTests`. Tests must not use a real Anthropic credential or make provider network requests.
