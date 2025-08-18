import { getPostgresPool } from '../db/postgresClient';
import { RequestsRepository } from '../../repositories/requestsRepository';

export async function indexRagRequest(doc: {
  tenant_id: string;
  id: string;
  endpoint: string;
  query: string;
  prompt_key?: string;
  prompt_params?: Record<string, unknown> | null;
  prompt_text: string;
  model?: string;
  answer_text?: string;
  answer_status: boolean;
  contexts_used: string[];
  intent_scope?: string;
  intent_action?: string;
  intent_detail?: string;
  latency_ms?: number;
  created_at?: string;
  request_body?: any;
  embedding_usage_id?: string | null;
  generating_usage_id?: string | null;
}) {
  const repo = new RequestsRepository(getPostgresPool());
  await repo.create({
    tenant_id: doc.tenant_id,
    id: doc.id,
    endpoint: doc.endpoint,
    query: doc.query,
    prompt_key: doc.prompt_key ?? null,
    prompt_params: doc.prompt_params ?? null,
    prompt_text: doc.prompt_text,
    model: doc.model ?? null,
    answer_text: doc.answer_text ?? null,
    answer_status: doc.answer_status,
    contexts_used: doc.contexts_used ?? null,
    intent_scope: doc.intent_scope ?? null,
    intent_action: doc.intent_action ?? null,
    intent_detail: doc.intent_detail ?? null,
    latency_ms: doc.latency_ms ?? null,
    created_at: doc.created_at || new Date().toISOString(),
    request_body: doc.request_body ?? null,
    embedding_usage_id: doc.embedding_usage_id ?? null,
    generating_usage_id: doc.generating_usage_id ?? null,
  } as any);
}


