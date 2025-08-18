# AI Development Prompt Template (for Task Execution)

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your prompt before using this template.

---

## 0) Prompt Prefix
[PASTE the “Prompt Prefix” block from `thinking/ai-master-guidelines.md` here.]

## 1) Project Context (do not change)
- App: Multi-tenant RAG backend with Next.js 15 (App Router) admin UI using NextAdmin
- Backend: Node.js 18+, TypeScript, Express; Postgres (RLS), OpenSearch, Redis, MinIO
- Design: Use only CSS variables from `thinking/ai-master-guidelines.md`; enforce contrast rules. No new hex colors.
- Repo layout: Follow `thinking/structure.md`. Do not move files unless instructed.

## 2) Your Task
- Task ID: {{TASK_ID}}
- Task File: `thinking/tasks/{{TASK_FILE}}`
- Objective: {{OBJECTIVE_FROM_TASK}}
- Inputs: {{INPUTS_FROM_TASK}}
- Dependencies: {{DEPENDENCIES_FROM_TASK}}
- Acceptance Criteria: {{ACCEPTANCE_FROM_TASK}}

Paste the full task file content below for reference:
```md
{{PASTE_TASK_FILE_CONTENTS_HERE}}
```

## 3) Implementation Rules
- Stack/version: Next.js 15, TypeScript strict, Zod validation for APIs, NextAdmin patterns.
- Multi-tenant: Always scope data by `tenant_id`; respect Postgres RLS.
- Styling: Use CSS variables; body text must use `--text`; links `--primary` (600) with underline; meet WCAG AA.
- Code quality: Clear names, early returns, error handling with standard ErrorResponse shape.
- Tests: Provide unit tests for services; integration tests for routes/adapters where relevant.
- Observability: Add minimal tracing hooks (Langfuse placeholder) if touching orchestrator/retrieval.
- Performance: Avoid N+1 queries; index where needed; cache per requirements if applicable.
- Do not introduce unrelated dependencies or restructure beyond the task scope.

## 4) Output Format (strict)
1) Plan
- Short step list mapping to files you will change/create.

2) Changes
For each file changed or created, output a fenced code block with the full final content:
```path
apps/backend/src/example/File.ts
```
```ts
// full file content after your change
```
Repeat for all files. Include only files you changed/created.

3) Commands
Provide shell commands to install/build/test/run (non-interactive flags where possible). Example:
```bash
pnpm install
pnpm -w -r build
pnpm -w -r test
```

4) Verification
- Bullet checklist showing how your output meets each Acceptance Criterion.
- Notes on edge cases handled.

## 5) Definition of Done
- All Acceptance Criteria satisfied
- Lint/type-check/tests pass
- Follows stack and design constraints (tokens, contrast, Next.js 15)
- No unrelated changes

## 6) Fill These Placeholders Before Running
- {{TASK_ID}} = e.g., 01, 02, 03...
- {{TASK_FILE}} = e.g., 01-repo-and-monorepo-scaffolding.md
- {{OBJECTIVE_FROM_TASK}} = copy from task
- {{INPUTS_FROM_TASK}} = copy from task
- {{DEPENDENCIES_FROM_TASK}} = copy from task
- {{ACCEPTANCE_FROM_TASK}} = copy from task

---

Example usage outline
1) Copy the Prompt Prefix from `thinking/ai-master-guidelines.md` into section 0
2) Paste this template
3) Fill placeholders from the specific task file under `thinking/tasks/`
4) Run the AI
