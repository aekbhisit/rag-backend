# Task 02: Design Guidelines Enforcement

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Install global CSS variables and base styles ensuring high contrast and readability across the app (Next.js 15 App Router).

## Inputs
- `thinking/ai-master-guidelines.md`

## Dependencies
- Task 01

## Steps
1. Create `apps/admin-web/styles/globals.css` and paste the CSS Variables and defaults from the guidelines.
2. Import `globals.css` in `apps/admin-web/app/layout.tsx`.
3. Add dark mode support by toggling `data-theme` on `<html>` (temporary manual toggle in layout).

## Deliverables
- `apps/admin-web/styles/globals.css`
- `apps/admin-web/app/layout.tsx` importing globals

## Acceptance Criteria
- Body text uses `--text` not muted tones; links are `--primary` (600) with underline.
- Light and dark themes render with WCAG AA contrast for text and controls.
