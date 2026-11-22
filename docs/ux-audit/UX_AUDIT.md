# Namma Dina — UX audit (Milestone 0)

**Date:** 14 November 2026  
**Scope:** Read only product audit. No application source files were changed during this milestone.

## Coverage and evidence

The Playwright run captured 216 full page screenshots across 21 routes. It covers 1440×900 desktop, 768×1024 tablet, and 412×915 mobile. App routes are captured in English and Kannada with both empty and populated local audit accounts. Public routes and onboarding are captured in both languages; onboarding uses an empty account. Chrome ran with reduced motion enabled so screenshots are stable. The complete route and viewport measurements are in [matrix-metrics.json](baseline/matrix-metrics.json).

Representative screenshots:

- [Empty My Day, English, desktop](baseline/matrix/empty/en/desktop/my-day.jpg)
- [Empty My Day, Kannada, mobile](baseline/matrix/empty/kn/mobile/my-day.jpg)
- [Populated My Day, English, mobile](baseline/matrix/populated/en/mobile/my-day.jpg)
- [Empty Tasks, Kannada, desktop](baseline/matrix/empty/kn/desktop/tasks.jpg)
- [Empty Breathe, English, tablet](baseline/matrix/empty/en/tablet/breathe.jpg)

The production baseline was built with `npm run build -w client` and served with Vite preview. The local mobile Lighthouse scores are **72 performance, 100 accessibility, 96 best practices, and 100 SEO**. Key metrics: FCP 2.0 s, LCP 3.7 s, TBT 610 ms, CLS 0, and 287 KiB total page weight. See [lighthouse-landing-mobile.production.json](baseline/lighthouse-landing-mobile.production.json). The separate development-server Lighthouse run is retained as a diagnostic only; it is not the baseline.

## Findings

### P1 — Horizontal overflow on core app screens

Measured document widths exceed the viewport on My Day and Breathe. Breathe is 94 px wider than the desktop viewport, 53 px wider on tablet, and 26 px wider on mobile. My Day is 9 px wider on mobile. These issues repeat across the empty/populated states and the two locales. See the `overflow` entries in the metrics file.

### P1 — Text hierarchy relies on very small type

Every captured screen contains at least one visible text element below 12 px; the smallest measured text is 8 px. Eyebrows, nav labels, helper copy, and metadata often land between 8 and 10 px. The next pass should set body copy around 15–16 px and keep secondary labels legible at a minimum of 12 px.

### P1 — Kannada currently covers the shell more deeply than the page content

The app shell and greeting change to Kannada, while many My Day cards, form labels, empty-state prompts, and action descriptions remain English. The Kannada capture also shows a dense bottom navigation row with small labels. Review each route’s copy with Kannada fluent review before treating the locale as complete.

### P1 — Font loading is not reliable in the audit environment

The app declares Plus Jakarta Sans and Noto Sans Kannada, but the browser did not confirm the Kannada webfont as loaded in 186 captures. The page fell back to other system fonts during this local run. The next pass should self-host fonts with their license files or use a verified local/system stack; it should not depend on an unverified third-party asset.

### P2 — My Day has many equally weighted panels

The populated dashboard presents progress, priorities, habits, quick check-ins, schedule, adaptive planning, and reflection in a long card grid. The empty state has useful gentle prompts, but the first action competes with several other panels. Make one clear next step primary, then let the supporting signals sit behind it.

### P2 — Breathe needs a narrower tablet and desktop composition

The breathing session, rhythm controls, and session history remain usable, but the current layout exceeds available width above and below the tablet breakpoint. Keep the session visually primary and let controls fit the content column without forcing horizontal scroll.

## Reference-site inspiration

These references inform information flow and interaction patterns; no brand assets or layouts are copied.

- [Headspace](https://www.headspace.com/mindfulness) groups mindfulness around clear entry points and use cases. Apply that clarity to the wellness area and avoid making the user choose among too many equally prominent options.
- [Sunsama](https://www.sunsama.com/) presents a calm daily-planning story around tasks, calendar, and a realistic day. Use that as a guide for My Day’s sequence and stopping point.
- [Todoist](https://www.todoist.com/) makes task capture and routines easy to understand. Apply the direct capture pattern to the first task action.
- [Linear Mobile](https://linear.app/mobile) focuses mobile work around quick capture and prioritization. Use that as a reference for a compact app shell and a short mobile action path.

## Milestone 1 direction

1. Keep the existing Aurora identity: deep night surfaces, restrained emerald/mint light, and small violet/cyan accents. Turn the current colors, spacing, radii, type sizes, elevation, and focus treatment into named tokens.
2. Set a readable type scale for Latin and Kannada copy, confirm font licenses, and self-host reviewed fonts with attribution/license files if external font files remain necessary.
3. Rebuild the responsive app shell first: predictable desktop navigation, a clear tablet treatment, and mobile navigation that respects safe-area insets and does not obscure content.
4. Rebalance My Day around the primary task/next action, a concise progress summary, and quieter supporting cards. Preserve the gentle empty-state voice.
5. Verify the design at the three documented viewport sizes and in both locales. Require no horizontal overflow, visible focus, legible controls, and WCAG AA contrast before expanding to the next surfaces.
