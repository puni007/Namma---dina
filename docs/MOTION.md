# Aurora motion system

Namma Dina uses motion to make state changes easier to follow while keeping the Aurora identity and its midnight navy, emerald, mint, teal, and cyan palette.

## Motion modes

The Motion & effects setting is stored per user as `motionMode` (`auto`, `full`, `calm`, or `off`). Auto resolves to Off when the operating system requests reduced motion, Calm on devices with at most four CPU cores or 4 GB reported memory, and Full otherwise. The resolved mode is exposed through the root element’s `data-motion` attribute. CSS transitions and the canvas particle component read that mode; Off suppresses transitions/animations, while Calm stops continuous ambient loops.

Long-form pages do not mount the canvas. The canvas is used on the landing/auth surfaces, the My Day heading, and the breathing page. It scales particle count with screen size and motion mode, caps device pixel ratio at 2, and pauses when the browser tab is hidden or the Capacitor app is backgrounded.

## Tokens and effects

Shared Aurora colors, gradients, glow shadows, radii, spacing, and transition tokens are in `client/src/aurora.css`. The core timings are 150 ms, 280 ms, and 600 ms with two shared easing curves. Page transitions use the base timing. Effects use CSS and small inline SVGs; no animation library or large raster assets are required.

Time-of-day tint uses the signed-in user’s timezone, with a local fallback before sign-in. Kannada text uses Noto Sans Kannada with font-display swap and a taller line-height to avoid clipped glyphs.

## Adding an effect

1. Prefer a CSS transition or inline SVG over a new dependency.
2. Use shared tokens from `aurora.css` for duration, easing, colors, and glow.
3. Make the static state readable and complete when motion is disabled.
4. Do not animate layout dimensions; animate opacity or transforms to avoid layout shift.
5. Pause loops in hidden/background states and keep canvas DPR at or below 2.
6. Do not add continuous motion to long forms. Check keyboard focus, contrast, reduced motion, and a narrow mobile viewport.
