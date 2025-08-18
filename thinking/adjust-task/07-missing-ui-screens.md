## 07) Missing Admin UI Screens (to build)

Build these admin interfaces to fully meet the updated design and final requirements. Prefix all admin routes with `/admin`.

### Intents (Intention Management)
- Routes:
  - `/admin/intents` (list/search/filter/paginate)
  - `/admin/intents/create`
  - `/admin/intents/edit/[id]`
  - Merge/Rename dialog/action on list
- Features:
  - CRUD
  - Merge/Rename with link preservation (contexts, targets)
  - Show linked contexts count; quick link/unlink modal
- Acceptance:
  - All intent flows functional; validations and conflict handling present

### Instruction Profiles
- Routes:
  - `/admin/profiles`
  - `/admin/profiles/create`
  - `/admin/profiles/edit/[id]`
  - `/admin/profiles/diff/[id]?vA=&vB=` (version diff view)
- Features:
  - CRUD, versioning, compare diff, staged publish flag
  - JSON policy editor with schema validation and helper presets
- Acceptance:
  - Version create/compare/publish works; invalid schema blocked gracefully

### Profile Targets
- Routes:
  - `/admin/profile-targets`
- Features:
  - Priority-ordered list with drag-and-drop
  - Filters: tenant, intent, channel, segment
  - Conflict warnings and impact preview (affected intents/contexts)
- Acceptance:
  - Ordering persists; conflicts detected; preview shows resolution order

### Context Profile Overrides
- Routes:
  - `/admin/overrides`
  - From context detail: `/admin/contexts/edit/[id]#overrides`
- Features:
  - Per-context override editor; list and revert
  - Show effective profile (base + override)
- Acceptance:
  - Override apply/revert reflected in preview and saved correctly

### Logs & Analytics
- Routes:
  - `/admin/logs`
  - `/admin/logs/[id]` (detail)
- Features:
  - Searchable logs (tenant, intent, time, confidence, zero-hit)
  - Charts: volume over time, zero-hit rate, response time, cache hit
- Acceptance:
  - Filters and charts update; detail shows retrieval hits and citations

### Admin Preview Tool
- Route:
  - `/admin/preview`
- Features:
  - Query input with knobs (tenant, channel, language)
  - Display: chosen profile, retrieval hits, citations, confidence, latency
  - Dry run (no writes)
- Acceptance:
  - End-to-end preview reflects backend pipeline output

### Users
- Routes:
  - `/admin/users`, `/admin/users/create`, `/admin/users/edit/[id]`
- Features:
  - Tenant-scoped admin management, basic roles (optional)
- Acceptance:
  - CRUD works; validation and unique constraints respected

### Settings
- Route:
  - `/admin/settings`
- Features:
  - Tenant configuration (keys/placeholders), language defaults
- Acceptance:
  - Values persist and are used by backend calls where applicable

