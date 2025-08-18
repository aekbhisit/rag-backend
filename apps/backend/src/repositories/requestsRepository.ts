import type { Pool } from 'pg';

export type RagRequestRow = {
	id: string;
	tenant_id: string;
	endpoint: string;
	query: string;
	prompt_key?: string | null;
	prompt_params?: any | null;
	prompt_text?: string | null;
	model?: string | null;
	answer_text?: string | null;
	answer_status: boolean;
	contexts_used?: string[] | null;
	intent_scope?: string | null;
	intent_action?: string | null;
	intent_detail?: string | null;
	latency_ms?: number | null;
	created_at: string;
	request_body?: any | null;
	embedding_usage_id?: string | null;
	generating_usage_id?: string | null;
};

export class RequestsRepository {
	constructor(private readonly pool: Pool) {}

	async ensureTable(): Promise<void> {
		await this.pool.query(`
			CREATE TABLE IF NOT EXISTS rag_requests (
				tenant_id uuid NOT NULL,
				id text PRIMARY KEY,
				endpoint text NOT NULL,
				query text,
				prompt_key text,
				prompt_params jsonb,
				prompt_text text,
				model text,
				answer_text text,
				answer_status boolean DEFAULT false,
				contexts_used text[],
				intent_scope text,
				intent_action text,
				intent_detail text,
				latency_ms integer,
				created_at timestamptz DEFAULT now(),
				request_body jsonb,
				embedding_usage_id text,
				generating_usage_id text
			);
			CREATE INDEX IF NOT EXISTS idx_rag_requests_tenant ON rag_requests(tenant_id);
			CREATE INDEX IF NOT EXISTS idx_rag_requests_created ON rag_requests(created_at DESC);
			ALTER TABLE rag_requests ADD COLUMN IF NOT EXISTS embedding_usage_id text;
			ALTER TABLE rag_requests ADD COLUMN IF NOT EXISTS generating_usage_id text;
		`);
	}

	async create(doc: RagRequestRow): Promise<void> {
		await this.ensureTable();
		await this.pool.query(
			`INSERT INTO rag_requests (
				tenant_id, id, endpoint, query, prompt_key, prompt_params, prompt_text, model, answer_text, answer_status,
				contexts_used, intent_scope, intent_action, intent_detail, latency_ms, created_at, request_body,
				embedding_usage_id, generating_usage_id
			) VALUES (
				$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
				$11,$12,$13,$14,$15,$16,$17,$18,$19
			) ON CONFLICT (id) DO UPDATE SET
				endpoint=EXCLUDED.endpoint,
				query=EXCLUDED.query,
				prompt_key=EXCLUDED.prompt_key,
				prompt_params=EXCLUDED.prompt_params,
				prompt_text=EXCLUDED.prompt_text,
				model=EXCLUDED.model,
				answer_text=EXCLUDED.answer_text,
				answer_status=EXCLUDED.answer_status,
				contexts_used=EXCLUDED.contexts_used,
				intent_scope=EXCLUDED.intent_scope,
				intent_action=EXCLUDED.intent_action,
				intent_detail=EXCLUDED.intent_detail,
				latency_ms=EXCLUDED.latency_ms,
				created_at=EXCLUDED.created_at,
				request_body=EXCLUDED.request_body,
				embedding_usage_id=EXCLUDED.embedding_usage_id,
				generating_usage_id=EXCLUDED.generating_usage_id
			`,
			[
				doc.tenant_id,
				doc.id,
				doc.endpoint,
				doc.query,
				doc.prompt_key ?? null,
				doc.prompt_params ?? null,
				doc.prompt_text ?? null,
				doc.model ?? null,
				doc.answer_text ?? null,
				doc.answer_status,
				doc.contexts_used ?? null,
				doc.intent_scope ?? null,
				doc.intent_action ?? null,
				doc.intent_detail ?? null,
				doc.latency_ms ?? null,
				doc.created_at ?? new Date().toISOString(),
				doc.request_body ?? null,
				doc.embedding_usage_id ?? null,
				doc.generating_usage_id ?? null,
			]
		);
	}

	async list(tenantId: string, q?: string, size: number = 50): Promise<RagRequestRow[]> {
		await this.ensureTable();
		const params: any[] = [tenantId];
		let where = 'tenant_id = $1';
		if (q && q.trim().length > 0) {
			params.push(`%${q}%`);
			const i = params.length;
			where += ` AND (query ILIKE $${i} OR prompt_text ILIKE $${i} OR answer_text ILIKE $${i})`;
		}
		const { rows } = await this.pool.query(
			`SELECT * FROM rag_requests WHERE ${where} ORDER BY created_at DESC LIMIT ${Math.max(1, Math.min(size, 500))}`,
			params
		);
		return rows as RagRequestRow[];
	}

	async getById(tenantId: string, id: string): Promise<RagRequestRow | null> {
		await this.ensureTable();
		const { rows } = await this.pool.query(
			`SELECT * FROM rag_requests WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
			[tenantId, id]
		);
		return (rows[0] as RagRequestRow) ?? null;
	}
}


