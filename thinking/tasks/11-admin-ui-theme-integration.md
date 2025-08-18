# Task 11: Admin UI (Theme Integration + Feature Shell)

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Build a professional Admin UI that fully adheres to design guidelines and consumes the shared theme from `@theme/`. Implement core admin features: dashboard, contexts CRUD + search, users management, and stats.

## Inputs
- `thinking/ai-master-guidelines.md`
- `thinking/final-requirements.md`
- `packages/shared/` (types, schemas, SDK)
- `apps/backend/` (admin endpoints)
- `theme/` (design tokens, components/styles)

## Dependencies
- Tasks 01–03 (repo, design enforcement, shared)
- Tasks 07–08 (backend app + adapters)
- Task 05 (OpenSearch mapping) for search UX alignment

## Steps
1. Theme Integration
   - Wire Tailwind to Admin app if not already: `tailwind.config.js`, `postcss.config.js`, `@tailwind` directives in global CSS.
   - Consume tokens from `@theme/` (colors, typography, spacing) or import its CSS/variables. If `@theme/` is a local app/library, reference via workspace alias or file path.
   - Ensure dark mode by toggling `data-theme="dark"` on `<html>`.

2. UI Foundation
   - Create reusable components: `Button`, `Input`, `Select`, `Card`, `Table` (sortable header, empty/error/loading states), `Badge`, `Modal`, `Toast`.
   - Build application shell: `app/admin/layout.tsx` with sidebar/nav, header slot (search, profile menu), responsive breakpoint behavior.

3. Pages & Flows
   - Dashboard `/admin`: key stats (counts, recent activity), charts (placeholder cards initially; wire later).
   - Contexts `/admin/contexts`: list/search/pagination; create/update/delete; validation via shared schemas. Show optimistic UI or loading states.
   - Users `/admin/users`: list/create/edit (name/email/role/status). Ensure role labeling for future auth.
   - Stats `/admin/stats`: summary cards + simple chart placeholders (data pulled from backend when available).
   - Settings `/admin/settings`: theme toggle, locale selector (TH/EN), basic app info.

4. Data & Contracts
   - Use `@rag/shared` types/schemas for API payloads; validate form inputs client-side.
   - Call backend admin endpoints under `/api/admin/*`. In local/no-infra mode, support mock responses (feature flag) to allow UI demos.

## Context Types & Type-Specific UI/Validation (from final-requirements)
Contexts have different shapes by `type`. The Admin UI MUST provide type-aware forms, validation, columns, and filters per the data model in `thinking/final-requirements.md`:

- Place
  - Fields: `title`, `body` (description/notes), attributes: `lat:number`, `lon:number`, `address:string`, `phone?:string`, `hours?:Record<string,string>`
  - Validation: `lat ∈ [-90,90]`, `lon ∈ [-180,180]`, `address` required; `hours` key/value strings
  - List columns: title, address, phone; optional mini-map icon when lat/lon present
  - Filters: has geo (bool), within radius (future), text

- Website
  - Fields: `title`, `body` (extracted text or summary), attributes: `url:string (required, https)`, `domain:string`, `last_crawled:Date`, `status_code?:number`
  - Validation: URL format; `status_code` 100–599
  - List columns: title, domain, last_crawled, status_code
  - Filters: domain, status_code range, recency (last N days)

- Ticket
  - Fields: `title`, `body` (details), attributes: `price:number ≥ 0`, `location:string`, `event_time:DateTime`, `status:enum("on_sale","sold_out","canceled","past")`
  - Validation: non-negative price; valid datetime; status in enum
  - List columns: title, event_time, price, status
  - Filters: status, date range, price range

- Doc Chunk
  - Fields: `title`, `body` (chunk text), attributes: `source_uri:string`, `page?:number`, `headings?:string[]`, `tags?:string[]`
  - Validation: `source_uri` non-empty; `page` positive integer if present
  - List columns: title, source_uri, page
  - Filters: source_uri contains, tag includes, has headings

Shared across all types
- Required base fields: `type`, `title`, `body`, `trust_level:int`, `language?:string`
- Intent links: provide UI to link/unlink intents (scope/action); show chips for linked intents
- Bulk operations: import/export CSV/JSON; bulk link/unlink intents (deferred OK if not in MVP)
- Search UX: text search over title/body; facet-style filters per type; pagination (server-side when available)
- Form UX: type selector drives dynamic fields; client validation mirrors Zod schemas; show error summaries and field-level messages

5. Accessibility & Internationalization
   - Keyboard navigable, focus visible, ARIA where appropriate.
   - Support TH/EN; mirror user language; persist selection in local storage.

6. Visual QA
   - Enforce contrast and tokens from `ai-master-guidelines` (no ad‑hoc colors). Verify dark mode adherence.
   - Responsive behavior (≥320px mobile → desktop). Sidebar collapses on small screens.

7. Tests & Smoke
   - Add simple component tests for `Table` and `Button` behaviors.
   - Add Playwright/Cypress smoke (optional) for main flows: create/delete context, change theme.

## Deliverables
- Admin Shell & Pages
  - `apps/admin-web/app/admin/layout.tsx`
  - `apps/admin-web/app/admin/page.tsx` (dashboard)
  - `apps/admin-web/app/admin/contexts/*` (list, form, detail, components)
  - `apps/admin-web/app/admin/users/*`
  - `apps/admin-web/app/admin/stats/*`
  - `apps/admin-web/app/admin/settings/*`
- Theme & Components
  - Tailwind config and global CSS linked to `@theme/` tokens
  - `apps/admin-web/components/ui/*` (Button, Card, Table, Input, Modal, Toast)
- Wiring
  - API client calls using `@rag/shared` schemas
  - Feature flag for mock mode when infra is not running

## Acceptance Criteria
- Visual: matches `ai-master-guidelines` and `@theme/` tokens in light/dark; responsive; consistent spacing/typography.
- UX: contexts CRUD works (mock mode and live backend), search filters list; type-specific forms and validation behave as specified; users list/edit works; dashboard and stats render without errors.
- A11y: keyboard navigation present; focus ring visible; AA contrast; semantic HTML.
- Quality: Admin builds without errors; basic tests pass; no hardcoded colors (reuse tokens only).
- Docs: short README section explaining how to run Admin with/without mock mode.
