# Namma Dina design system

This is the source of truth for the Aurora visual language. CSS variables are defined in `client/src/m1-redesign.css`; the Tailwind theme maps to those variables so utilities and product components use the same values.

## Tokens

| Role | Aurora (dark) | Aurora Day (light) |
| --- | --- | --- |
| Canvas | `#06110F` | `#F3F7F3` |
| Surface | `#0B1B18` | `#FFFFFF` |
| Raised surface | `#102520` | `#EAF1EC` |
| Overlay | `#17312A` | `#E2ECE5` |
| Primary text | `#F2FBF6` | `#17362B` |
| Secondary text | `#C1D2C9` | `#36594B` |
| Muted text | `#9BB4A5` | `#526E60` |
| Action / progress | `#69E2AA` | `#11734F` |
| Teal | `#63D5C7` | `#126D67` |
| Sunrise | `#F2C27A` | `#875914` |
| Border | `rgba(179, 235, 205, .15)` | `rgba(31, 72, 51, .15)` |

Primary actions use an emerald-to-teal fill with dark ink text so the bright surface stays readable. Semantic states use success `#68D7A4`, warning `#F2C27A`, danger `#F38D86`, and info `#79C8D1` on dark; their Aurora Day equivalents use darker text-safe hues. Decorative accents never carry meaning by color alone.

Measured foreground-to-background ratios for the implemented palette are: Aurora primary 18.18:1, secondary 12.18:1, muted 8.65:1; Aurora Day primary 12.14:1, secondary 7.22:1, muted 5.16:1. Primary button ink contrasts with dark emerald/teal at 10.15:1 and 9.22:1, and with Aurora Day emerald/teal at 10.36:1 and 9.69:1. These exceed the WCAG AA 4.5:1 body-text threshold. Recheck any new colors against their actual surfaces before use.

## Type and spacing

| Token | Value | Use |
| --- | ---: | --- |
| `text-xs` | 12 px / 1.5 | Utility labels and metadata |
| `text-sm` | 14 px / 1.5 | Supporting UI |
| `text-base` | 16 px / 1.55 | Body and controls |
| `text-lg` | 18 px / 1.45 | Emphasized body |
| `text-xl` | 20 px / 1.35 | Card titles |
| `text-2xl` | 24 px / 1.25 | Section titles |
| `text-3xl` | 32 px / 1.2 | Page titles |
| `text-display` | 44 px / 1.1 | Marketing or high-level display |

Spacing follows a 4 px base grid: 4, 8, 12, 16, 20, 24, 32, 40, and 48 px. The interface uses 12, 16, and 22 px radii for controls, compact surfaces, and primary surfaces; pills are fully rounded. Shared elevation is a soft shadow plus a one-pixel border, not a glow.

## Components and states

Shared primitives use consistent interaction states: default, hover, pressed, focus-visible, disabled, loading, and error where relevant. The system covers Button, IconButton, Input, Select, Checkbox, Toggle, Chip, Badge, Card, Tabs, Modal/Bottom sheet, Toast, Tooltip, Skeleton, EmptyState, ProgressRing, StatCard, ListItem, and Avatar. Touch controls are at least 44 × 44 px. Focus rings remain visible in both themes.

M1 implements the shared app shell and My Day first. Subsequent screens should consume these tokens and components rather than introduce one-off colors or type sizes.

## Usage

- Use `--nd-*` CSS variables for product-specific values.
- Tailwind semantic colors point to the same CSS variables; do not repeat hex values in utility config.
- Use Aurora for the default dark appearance and Aurora Day for its light equivalent. The user can switch themes from the app shell; the preference is saved locally.
- Use Plus Jakarta Sans for headings, DM Sans for Latin text, and Noto Sans Kannada for Kannada text. Bundle font files locally and retain their OFL notices.
- Prefer a single strong action and a plain-language explanation on each screen.
