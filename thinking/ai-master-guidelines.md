## AI Development Master Guidelines (Color Scheme, Design System, Base Info)

Use this file as the single source of truth for visual design, tone, and base project context. Paste the Prompt Prefix into every AI task to enforce consistency.

### Project Base Info
- Project: Multi‑Tenant RAG Backend + Next.js (NextAdmin) Admin UI
- Stack: Next.js 15 (App Router), TypeScript, NextAdmin, CSS variables (optionally Tailwind later)
- Accessibility: WCAG 2.1 AA minimum contrast
- Languages: Thai/English (auto-detect; follow user language)
- Design goals: clean, accessible, high-contrast, enterprise look

### Brand Colors (Foundations)
- Primary (Indigo):
  - 50:  #EEF2FF
  - 100: #E0E7FF
  - 200: #C7D2FE
  - 300: #A5B4FC
  - 400: #818CF8
  - 500: #6366F1
  - 600: #4F46E5  (primary)
  - 700: #4338CA
  - 800: #3730A3
  - 900: #312E81
- Accent (Emerald): 500: #10B981, 600: #059669
- Warning (Amber): 500: #F59E0B, 600: #D97706
- Danger (Rose): 500: #E11D48, 600: #BE123C
- Info (Sky): 500: #0EA5E9, 600: #0284C7
- Neutral (Gray):
  - 50:  #F9FAFB
  - 100: #F3F4F6
  - 200: #E5E7EB
  - 300: #D1D5DB
  - 400: #9CA3AF
  - 500: #6B7280
  - 600: #4B5563
  - 700: #374151
  - 800: #1F2937
  - 900: #111827

### Semantic Tokens (map brand → usage)
- Text: default `--text: #111827`, muted `--text-muted: #4B5563`, inverted `--text-inverse: #FFFFFF`
- Backgrounds: `--bg: #FFFFFF`, `--bg-muted: #F9FAFB`, surface `--surface: #FFFFFF`
- Borders: `--border: #E5E7EB`
- Primary: `--primary: #4F46E5`, `--on-primary: #FFFFFF`
- Accent: `--accent: #10B981`, `--on-accent: #052E1E`
- Info: `--info: #0EA5E9`, `--on-info: #062A3A`
- Success: `--success: #10B981`, `--on-success: #052E1E`
- Warning: `--warning: #F59E0B`, `--on-warning: #231A00`
- Danger: `--danger: #E11D48`, `--on-danger: #3F0011`
- Focus ring: `--focus: rgba(79, 70, 229, 0.35)`

### Dark Mode Overrides
- `--bg: #0B1220`, `--bg-muted: #0F172A`, `--surface: #111827`
- `--text: #E5E7EB`, `--text-muted: #9CA3AF`, `--border: #1F2937`
- Keep semantic colors the same, ensure contrast (use 600/700 shades on dark)

### Contrast & Readability Rules
- Body text on light backgrounds must use `--text` (#111827). Do not use `--text-muted` for paragraphs or long labels.
- Body text on dark backgrounds must use `--text` in dark theme (#E5E7EB). Avoid lowering opacity for primary text.
- Minimum contrast ratios: normal text ≥ 4.5:1 (AA), large text (≥ 20px/24px) ≥ 3:1. Target ≥ 7:1 for primary copy.
- Prohibited on light backgrounds (`--bg`/`--surface` = #FFFFFF):
  - Any text lighter than Gray-600 (#4B5563) for important content.
  - Using Gray-400 (#9CA3AF) or lighter for labels, inputs, or table body text.
  - Low-contrast color-on-color (e.g., Indigo-300 text on white) for links; use `--primary` (600) with underline.
- Prohibited on dark backgrounds: light-gray text on `--surface` without sufficient contrast; ensure tokens come from dark theme values.
- Muted text usage is limited to tertiary metadata, helper text, and captions; never for form labels, table body cells, or paragraph copy.
- Links must be `--primary` (600) with visible hover (underline) and focus ring; do not rely on color alone.

### Typography
- Font: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"
- Scale (size/line-height in px):
  - xs: 12/16, sm: 14/20, base: 16/24, lg: 18/28, xl: 20/28, 2xl: 24/32, 3xl: 30/36
- Weights: 400 (regular), 500 (medium), 600 (semibold)
- Heading style: H1 30/36 600; H2 24/32 600; H3 20/28 600

### Spacing, Radius, Elevation
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Radius: sm 6, md 8 (default), lg 12, xl 16
- Shadows:
  - sm: 0 1px 2px rgba(0,0,0,.06)
  - md: 0 2px 8px rgba(0,0,0,.08)
  - lg: 0 8px 24px rgba(0,0,0,.12)

### Components (UI Rules)
- Buttons
  - Primary: bg `--primary`, text `--on-primary`, hover darken by ~8%, focus ring `--focus`
  - Secondary: bg `--bg-muted`, text `--text`, border `--border`
  - Tertiary: bg transparent, text `--primary`
  - Danger: bg `--danger`, text `--on-danger`
  - Size: md height 40, radius md, padding 12–16 horizontal
- Inputs
  - Height 40, bg `--surface`, text `--text`, border `--border`, radius md
  - Focus: 1px `--primary` border + focus ring
  - Error: border `--danger`, helper text `--danger`
- Cards
  - Padding 20–24, radius lg, shadow md, border `--border`, bg `--surface`
- Tables
  - Header bg `--bg-muted`, text `--text`, row hover `--bg-muted`
  - Zebra optional using 50/0B1220 overlays
- Badges
  - Neutral: bg Gray-100/900 by theme; Success/Warning/Danger/Info use semantic colors at 100/20% bg + 600 text

### Data Visualization Palette
- Series: [#4F46E5, #10B981, #0EA5E9, #F59E0B, #E11D48, #A78BFA]
- Gridlines: `#E5E7EB` light, `#1F2937` dark; Axes text follows `--text-muted`

### Content & Tone
- Tone: professional, concise, action-oriented
- Language: mirror user language (TH/EN); avoid slang; keep labels short; sentence case
- Accessibility: all non-text color use must have secondary indicator (icon/shape) when critical

### Prompt Prefix (Paste into every AI task)
```text
Follow this project’s master guidelines strictly.
Design System:
- Use CSS variables defined here: primary #4F46E5, accent #10B981, info #0EA5E9, warning #F59E0B, danger #E11D48, neutral gray scale (50–900), backgrounds #FFFFFF (light) / #0B1220 (dark), surface #FFFFFF (light) / #111827 (dark), text #111827 (light) / #E5E7EB (dark).
- Typography: Inter, sizes xs 12 → 3xl 30; headings H1 30/36 600, H2 24/32 600, H3 20/28 600.
- Spacing: 4‑based scale; radius md=8; shadows: sm/md/lg as defined.
- Components: buttons/inputs/cards/tables/badges use semantic tokens and focus ring.
- Accessibility: WCAG AA contrast; include focus states.
Behavior:
- Use Next.js 15 (App Router) + NextAdmin patterns.
- Internationalization: auto TH/EN; mirror user language.
- Contrast policy: body text must use `--text`; do not use muted/gray on white backgrounds for paragraphs; links are `--primary` (600) and underlined.
Do NOT invent new colors or fonts. Reuse tokens only.
```

### CSS Variables (Drop into global CSS)
```css
:root {
  --bg: #FFFFFF; --bg-muted: #F9FAFB; --surface: #FFFFFF;
  --text: #111827; --text-muted: #4B5563; --text-inverse: #FFFFFF;
  --border: #E5E7EB; --focus: rgba(79,70,229,0.35);
  --primary: #4F46E5; --on-primary: #FFFFFF;
  --accent: #10B981; --on-accent: #052E1E;
  --info: #0EA5E9; --on-info: #062A3A;
  --success: #10B981; --on-success: #052E1E;
  --warning: #F59E0B; --on-warning: #231A00;
  --danger: #E11D48; --on-danger: #3F0011;
}

[data-theme="dark"] {
  --bg: #0B1220; --bg-muted: #0F172A; --surface: #111827;
  --text: #E5E7EB; --text-muted: #9CA3AF; --text-inverse: #0B1220;
  --border: #1F2937; /* semantic colors remain the same */
}

/* Defaults enforcing readability */
html, body { color: var(--text); background: var(--bg); }
p, li, label, input, textarea, table { color: var(--text); }
.muted, .helper-text, small { color: var(--text-muted); }
a { color: var(--primary); text-decoration: underline; text-underline-offset: 2px; }
```

### Next.js/NextAdmin Theming Hook
- Include global CSS variables in `app/globals.css`.
- Apply dark mode by toggling `data-theme="dark"` on `<html>`.
- Ensure NextAdmin components inherit CSS variables (wrap in a layout that includes `globals.css`).

### Application Path Conventions
- Admin UI
  - Base route: `/admin`
  - Next.js segment: `app/(admin)` with a shared layout importing `app/globals.css`
- API
  - REST base: `/api/v1`
  - Health check: `/api/health`
  - Auth: `/api/auth/*`
  - Webhooks: `/api/webhooks/*`
  - API docs (OpenAPI/Swagger): `/api/docs`
- Multi‑tenancy
  - Preferred API scoping: header `X-Tenant-ID: <tenantId>`
  - Optional UI path prefix when deep-linking by tenant: `/t/[tenantId]/admin`
- Static assets
  - Served from `public/` at `/<asset>` (e.g., `/logo.svg`)
- File uploads
  - Endpoint: `/api/v1/files` (multipart/form-data); public URLs under `/files/<id>` as applicable
- Versioning
  - Use `v1` in API base path; introduce `v2` only for breaking changes

### Do / Don’t
- Do reuse tokens and semantic variables for any UI work
- Do keep contrast high; verify on light and dark
- Don’t introduce new colors without updating this file
- Don’t hardcode hex values in components; use CSS variables
- Don’t use gray-500 or lighter for paragraph/body text on white; use `--text` only

### Versioning
- Changes to colors/typography require a version note here and a PR review.
