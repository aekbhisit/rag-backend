# Task 01: Repo and Monorepo Scaffolding

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Initialize the repository structure exactly as defined in `thinking/structure.md`.

## Inputs
- `thinking/structure.md`
- `thinking/final-requirements.md`

## Dependencies
- None

## Steps
1. Create directories: `apps/backend`, `apps/admin-web`, `packages/shared`, `infra/docker`, `infra/k8s`, `infra/db/{migrations,rls,seed}`, `infra/search`, `.github/workflows`, `thinking`.
2. Add root `README.md` skeleton describing monorepo and workspaces.
3. Initialize `package.json` in root with npm/yarn/pnpm workspaces referencing `apps/*` and `packages/*`.
4. Add basic `.gitignore` and editorconfig.

## Deliverables
- Folder tree matching `thinking/structure.md`.
- Root `package.json` with workspaces.
- `README.md` with quick start.

## Acceptance Criteria
- Folder structure exists and matches `thinking/structure.md`.
- Running a workspace command (e.g., `npm -w` or `pnpm -w -r`) lists both apps and shared package.
