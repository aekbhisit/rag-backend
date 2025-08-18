# Admin Web Tests

- T-WEB-001 Build succeeds
  - Steps: `pnpm --filter @rag/admin-web run build`
  - Expect: Next build success; static pages generated

- T-WEB-002 Theme toggle
  - Steps: run dev; click toggle
  - Expect: `<html data-theme="dark">` toggles on and off

- T-WEB-003 Shared import renders
  - Steps: open `/admin` page
  - Expect: schema parse example renders without errors
