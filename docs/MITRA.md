# Mitra, your personal guide

Mitra is the small lantern companion in signed-in app pages. Its original inline SVG mascot has idle, listening, thinking, happy, and concerned poses. The launcher opens a keyboard-accessible chat sheet that adapts to mobile browser and Android keyboards, safe areas, reduced motion, and the Android back button.

## Guide and chat

The guide works without an AI provider. It can open app sections, summarize the user's logged day/week facts and Comeback Score, offer a short breathing pause, and create task, habit, water, sleep, workout, food, reflection, completion, deletion, or habit-check-in previews. Task moves are proposed by the existing deterministic scheduling engine; Mitra only asks whether to accept a planner opening. Short help topics are searchable locally, and while offline Mitra uses that guide and navigation without saving or queueing the typed message. The first-run tour highlights the main app areas and can be replayed in Settings.

Mitra can also provide open-ended AI chat when the server operator has configured Anthropic, set `AI_MITRA_ENABLED=true`, and the user has accepted the separate AI consent note and enabled AI help. The current message and only the app details needed for that reply may be sent. Previous chat messages are not sent to the provider. See [AI privacy and configuration](AI.md).

Any proposed task, habit, or log change appears as a preview with Confirm and Cancel. The database write happens only after confirmation. A successful change includes an Undo control that restores the previous values or deletes the new record, subject to the record still belonging to that account.

## Preferences and data

Settings includes launcher visibility, English/Kannada/follow-app language, optional in-app nudges, quiet hours, built-in speech playback, tour replay, AI consent, clear-history, and delete-assistant-data controls.

Conversation history is private to the signed-in account, limited to the latest 50 messages, and expires after 30 days. The user can clear history at any time. Deleting assistant data also clears the preferences and AI token usage and switches AI features off. Account export includes the Mitra settings and history. `AIUsage` remains a separate token-count-only table and does not contain prompts or replies.

Nudges are created only when the Mitra panel is open in a visible, active app, respect the account timezone and quiet hours, are limited to two per local day, and can be dismissed without repeating that nudge on the same day. They are in-app messages only; Mitra does not send push or operating-system notifications. Because the first release has no notification channel, it does not read the Android system Do Not Disturb state; a user who needs no in-app prompts should disable nudges or set quiet hours.

## Local verification

The server integration tests exercise owner-scoped history, confirmation-before-write, and undo without making a provider request. Set no provider credential for those tests. The migration is additive: it creates `AssistantSettings` and `AssistantMessage` and adds nullable/optional relations to `User`.
