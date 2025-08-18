# Shared Package Tests

- T-SH-001 Build artifacts
  - Steps: `pnpm -w @rag/shared run build`
  - Expect: `packages/shared/dist/index.js` and `.d.ts` present; `exports` resolves

- T-SH-002 Schema validation
  - Steps: parse valid and invalid payloads with `ContextRetrievalRequestSchema`
  - Expect: valid passes; invalid throws ZodError

- T-SH-003 SDK validation
  - Steps: `new RagSdkClient({ baseUrl }).retrieveContexts(invalid)`
  - Expect: throws before network request due to schema parsing
