## 05) UI Programming per Menu

### Objective
Program the admin-web UI to the updated design, backed by APIs.

### Steps
- Layout & Navigation
  - Replace admin layout with theme-like topbar/sidenav/footer.
  - Centralize menu config (with a RAG section) and active highlighting.
- Dashboard
  - Render metrics from `LogService` endpoints; use cards/charts aligned with theme.
- Contexts
  - List/search/filter/paginate; create/edit with type-aware forms; link intents.
- Intents
  - CRUD; merge/rename flows preserving links.
- Instruction Profiles & Targets
  - CRUD; priority ordering; conflict warnings; preview apply.
- Overrides
  - Per-context override editor; list/revert.
- Logs
  - Searchable logs; basic charts (volume, zero-hit, latency, reranker uplift placeholder).
- Settings/Users
  - Tenant-scoped admin management.

### Acceptance
- All menus functional end-to-end with API calls and updated visuals.

