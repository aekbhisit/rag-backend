Final Requirements document for your RAG application. It captures the concepts we agreed on (intents, strategies/instruction profiles, contexts, overrides, hybrid retrieval, logging, admin UX) in a concise, implementation-oriented way—without code.
1) Goal & Scope
Goal: A multi-tenant RAG assistant that decides when to answer directly vs. use retrieval, selects the right strategy based on the user’s situation (intent), retrieves the best context (official KB, tickets, places, websites), and responds in a controlled, auditable format.
Primary users:
End users (chat on LINE/Web/email)
Operators/Admins (manage content, intents, instruction profiles, targeting, overrides)
Observers (review logs, metrics)
Languages: TH/EN (auto-follow user by default; channel- or tenant-specific overrides allowed).
2) Core Concepts (shared vocabulary)
Intent: {scope, action} describing the type of question (e.g., support/howto, places/store_locator, billing/refund_policy).
Instruction Profile (Strategy): Reusable “how to answer” rules (tone, format, citation policy, allowed sources, recency bias, reranker, trust level).
Profile Target: Rules mapping a profile to where it applies (tenant / intent / channel / segment), with priority for tie-break.
Context: A knowledge item the model can cite (place, ticket, website page, document chunk, runbook, etc.) with flexible attributes.
Context→Intent Link: Declares which intents a context serves (many-to-many).
Context Profile Override (rare): Per-item tweak or alternate profile without affecting other items.
Query Log: Immutable record of each answer (chosen intent, profile, sources, confidence, latency).
3) High-Level Flow (runtime)
Preprocess: detect language; load user/tenant; gather short conversation summary (last 2–3 turns).
Intent classification: produce {scope, action, detail} (detail stays free-text for the query).
Answer vs. RAG decision:
Direct answer only for small-talk/formatting/known FAQs at high confidence and where policy allows no citations.
Otherwise RAG path.
Strategy (profile) selection:
Use intent + tenant/channel to select the most specific matching Instruction Profile via Profile Targets.
(Optional) “dual retrieval” assist: probe content briefly to reinforce strategy choice; strategy remains the control plane.
Structured fast-path (if applicable):
If intent implies structured data (e.g., store locator, ticket by ID), query structured store first (SQL/API/geo).
RAG retrieval:
Apply tenant ACLs + intent filters; run hybrid retrieval (BM25 + vector), rerank to top 8–12, trust-gate below min_trust.
Generation:
Build system prompt from the selected profile (tone, format, citation policy, safety, glossary).
Provide snippets + metadata; generate answer.
Post-process & respond:
Enforce citations/format, redact PII as required, normalize glossary terms.
Log & metrics: store query log (intent, profile, contexts, confidence, latency, channel).
4) Data Model (visual; no code)
TENANTS
  └─ INTENTS (scope, action, unique per tenant)
       ▲            ▲
       │            │  mapping (where a profile applies)
       │            └───────────────┐
INSTRUCTION PROFILES (reusable)     │
       ▲                             ▼
       │                     PROFILE TARGETS
       │              (tenant, intent, channel, priority)
       │
       │  (rare per-item tweak)
       │
CONTEXT PROFILE OVERRIDES (context → profile + small delta)
       ▲
       │
CONTEXTS (knowledge items: place, ticket, website, doc_chunk…)
       ▲  \
       │   \ many-to-many
       │    \
       └───── CONTEXT_INTENTS (context ↔ intent links)

QUERY LOGS (query, chosen intent/profile, used contexts, confidence, latency)
Contexts (flexible attributes by type)
Common fields: id, tenant_id, type, title, body (text for search), trust_level, priority, lang
Attributes (flexible):
place: lat, lon, address, city, phone (+ map link)
website: url, canonical, domain, last_crawled
ticket: price, location, event_time, status
doc_chunk/runbook: source_uri, page, headings, tags
Contexts can link to multiple intents (e.g., a “Bangkok Store” serves places/store_locator and support/branch_info).
Instruction Profiles (what they contain)
Answer style: tone, language preference, max words, output format (steps | bullets | table | steps+citations)
Retrieval policy: allowed source_types, BM25/vector weights, recency decay, reranker on/off, final_k
Trust/Safety: min_trust_level, citation_required, PII policy, escalation threshold
Glossary/Synonyms: preferred terms; synonym hints
Profile Targets (how profiles are applied)
Keys: tenant_id, intent_id, channel (optional user_segment)
Have priority for tie-break; more specific beats less specific
Operators can define defaults (global/tenant) and fine-grained mappings
Context Profile Overrides (isolate exceptions)
Pin a specific context to a profile (and/or delta changes like “max_words: 120”)
No impact on other contexts
5) Retrieval & Answering (requirements)
Hybrid search: combine BM25 (title, headings, body) + vector ANN; return top N (e.g., 100).
Reranker: reduce to top 8–12 passages before generation.
Trust gating: drop passages below profile’s min_trust_level; if empty and no fallback allowed → ask one clarifying question or escalate.
Structured fast-path: for intents like places/store_locator, prefer structured lookups (e.g., geo distance, exact field matches) before semantic search.
Citations: always include source identifiers (URI/URL/title/chunk_id) per profile policy.
Output payload: answer text, citations[], intent used, profile id, confidence, latency.
6) Admin Console (operator UX)
Dashboard: volume, zero-hit rate, low-confidence rate, top intents, recent profile publishes.
Contexts: list, search, filter by type/intent/tags; create/edit (type-aware forms); bulk import; bulk link to intents.
Intents: create/manage {scope, action}; merge/rename safely (preserve links).
Profiles: create/edit reusable profiles; versioning + diffs; preview; staged rollout.
Profile Targets: map profiles to tenant/intent/channel (+ priority); show “impacted contexts” preview.
Overrides: pin/tweak specific contexts; list & revert easily.
Logs & Analytics: searchable query logs; per-intent accuracy, confidence distributions, citation compliance, reranker uplift.
7) APIs (names & purpose; no request bodies)
Classification: POST /classify → intent {scope, action, detail}
Answering: POST /answer → returns {answer, citations[], intent_used, profile_id, confidence, latency_ms}
Preview (admin): GET /preview?query=...&tenant=... (dry-run through retrieval + generation, no writes)
Contexts: CRUD + bulk import/export; link/unlink intents
Intents: CRUD
Profiles: CRUD, diff, publish, versions
Profile Targets: CRUD (ordered by priority)
Overrides: CRUD per context
Logs: query/filter/export
8) Non-Functional Requirements
Privacy & Safety: PII redaction level enforced by profile; tenant isolation on every operation.
Observability: trace every request (classification, strategy chosen, retrieval hits, reranker, generation, costs, latency); error budgets and alerts.
Performance: p95 < 1.5s for RAG answers with rerank (target); p95 < 400ms for direct answers/structured fast-path.
Reliability: graceful degradation—if reranker unavailable, fall back to hybrid-only; if embeddings service fails, serve cached results.
Auditability: every answer logs intent_id, profile_id (version), context_ids used.
Internationalization: language auto-detect; per-tenant/channel language preference via profile.
9) Deployment & Stack (Option A baseline)
Search: OpenSearch (BM25 + k-NN HNSW)
Storage: MinIO (raw docs), Postgres (metadata, intents, profiles, targets, overrides, logs)
Orchestration: Docker (Swarm/K8s), CI/CD of services
Parsers: Unstructured/trafilatura (+ OCR for scans)
Embeddings: OpenAI or self-hosted (e.g., bge-m3)
Reranker: Hosted (Cohere/Jina) or self-host
Cache: Redis (semantic + result caching)
Observability: Langfuse (traces) + your metrics stack
10) Acceptance Criteria (MVP)
Intent detection produces {scope, action, detail} with ≥90% route accuracy on a small curated test set.
Profiles can be created/edited, targeted (tenant/intent/channel), versioned, and previewed; changes reflect immediately in answers without reindexing.
Contexts support at least 4 types (place, website, ticket, doc_chunk) with flexible attributes; can be linked to multiple intents.
Overrides: operator can tweak one context’s behavior without affecting others.
Retrieval: hybrid + rerank + trust gate; citations included in responses.
Structured fast-path functions for places/store_locator (geo radius) and simple ticket lookup by ID.
Logs: each answer records intent, profile, contexts used, confidence, latency.
Admin UX: operators can do the “five minute tasks” (add context, change profile for an intent, pin one override, inspect a log, preview an answer).
11) Phase 1.1 Backlog (nice-to-have)
A/B testing per intent/profile; staged rollouts with auto-rollback on quality regression.
Test set runner (nightly) with metrics (zero-hit, citation rate, confidence, FCR proxy).
Map view for places; schema linter for context attributes; bulk fix workflows.
Dual-retrieval strategy discovery (strategy index) to assist profile selection.
Per-tenant glossary management.