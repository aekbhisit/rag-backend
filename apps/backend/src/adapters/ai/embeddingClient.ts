// Langfuse removed

type Provider = 'openai' | 'none';

export interface EmbeddingInput {
	title: string;
	body: string;
	keywords?: string[];
}

export interface EmbeddingResult {
	vector: number[];
	dimension: number;
	model: string;
	usage_id?: string;
	usage?: { promptTokens?: number; totalTokens?: number };
	latencyMs?: number;
  cost?: { input_usd?: number | null; output_usd?: number | null; total_usd?: number | null; currency?: string | null };
}

export interface EmbeddingOptions {
	provider?: Provider;
	apiKey?: string;
	model?: string;
	targetDim?: number;
	metadata?: Record<string, unknown>;
}

function buildText({ title, body, keywords }: EmbeddingInput): string {
	const parts: string[] = [];
	if (title) parts.push(`Title: ${title}`);
	if (Array.isArray(keywords) && keywords.length > 0) parts.push(`Keywords: ${keywords.join(', ')}`);
	if (body) parts.push(`Body:\n${body}`);
	return parts.join('\n\n');
}

async function embedWithOpenAI(text: string, opts?: EmbeddingOptions): Promise<EmbeddingResult> {
	const apiKey = opts?.apiKey || process.env.OPENAI_API_KEY;
	const model = opts?.model || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
	if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
	const started = Date.now();
	const res = await fetch('https://api.openai.com/v1/embeddings', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
		body: JSON.stringify({ input: text, model })
	});
	if (!res.ok) {
		throw new Error(`OpenAI embeddings HTTP ${res.status}`);
	}
	const data = await res.json();
	const latency = Date.now() - started;
	const estTokens = Math.max(1, Math.ceil(text.length / 4));
	const vector = (data?.data?.[0]?.embedding || []) as number[];
	// Log to ai_usage index for cost analytics
	let usageId: string | undefined;
	let pricingSnap: any = { input_per_1k: null, output_per_1k: null, total_per_1k: null, version: null, source: null };
	let costSnap: any = { input_usd: null, output_usd: null, total_usd: null, currency: 'USD', source: null };
	try {
		const { indexAiUsage } = await import('../search/aiUsageLogService');
		const { AiPricingRepository } = await import('../../repositories/aiPricingRepository');
		const { getPostgresPool } = await import('../../adapters/db/postgresClient');
		const nowIso = new Date().toISOString();
		// Compute cost from pricing snapshot if available
		try {
			const tenantId = String((opts?.metadata as any)?.tenant_id || '00000000-0000-0000-0000-000000000000');
			const repo = new AiPricingRepository(getPostgresPool());
			const pr = await repo.findByModel(tenantId, 'openai', model);
			if (pr) {
				pricingSnap = { input_per_1k: pr.input_per_1k ?? null, output_per_1k: pr.output_per_1k ?? null, total_per_1k: pr.embedding_per_1k ?? null, version: pr.version || null, source: 'tenant' };
				const totalTok = (data?.usage?.total_tokens as number) || estTokens;
				const cTotal = pr.embedding_per_1k ? (totalTok / 1000) * pr.embedding_per_1k : 0;
				costSnap = { input_usd: null, output_usd: null, total_usd: pr.embedding_per_1k ? cTotal : null, currency: pr.currency || 'USD', source: 'computed' };
			}
		} catch {}
		usageId = await indexAiUsage({
			tenant_id: String((opts?.metadata as any)?.tenant_id || '00000000-0000-0000-0000-000000000000'),
			operation: 'embedding',
			provider: 'openai',
			model,
			start_time: nowIso,
			end_time: nowIso,
			latency_ms: latency,
			usage: {
				input_tokens: (data as any)?.usage?.prompt_tokens ?? estTokens,
				output_tokens: 0,
				total_tokens: (data as any)?.usage?.total_tokens ?? estTokens,
			},
			cost: costSnap,
			pricing: pricingSnap,
			metadata: { context_id: (opts?.metadata as any)?.context_id || null },
			imported_at: nowIso,
		});
	} catch {}
	return {
		vector,
		dimension: vector.length,
		model,
		usage_id: usageId,
		usage: {
			promptTokens: (data as any)?.usage?.prompt_tokens ?? estTokens,
			totalTokens: (data as any)?.usage?.total_tokens ?? estTokens,
		},
		latencyMs: latency,
    cost: costSnap,
	};
}

function pseudoHash(str: string): number[] {
	// Deterministic fallback: 384 dims simple hashing
	const dim = 384;
	const out = new Array<number>(dim).fill(0);
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		const idx = code % dim;
		out[idx] += (code % 13) - 6;
	}
	// L2 normalize
	let norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0));
	if (norm === 0) norm = 1;
	for (let i = 0; i < out.length; i++) out[i] = out[i] / norm;
	return out;
}

async function embedWithFallback(text: string): Promise<EmbeddingResult> {
	const dim = Number(process.env.EMBEDDING_DIM || '1024');
	const vec = pseudoHash(text);
	const resized = resize(vec, dim);
	const estTokens = Math.max(1, Math.ceil(text.length / 4));
	return { vector: resized, dimension: resized.length, model: 'fallback-384', usage: { promptTokens: estTokens, totalTokens: estTokens }, latencyMs: 0, cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' } };
}

export async function createEmbedding(input: EmbeddingInput, options?: EmbeddingOptions): Promise<EmbeddingResult> {
	const text = buildText(input);
	const provider: Provider = options?.provider
		? options.provider
		: (process.env.EMBEDDING_PROVIDER === 'openai' ? 'openai' : 'none');
	const targetDim = options?.targetDim ?? Number(process.env.EMBEDDING_DIM || '1024');
	if (provider === 'openai') {
		try {
			const r = await embedWithOpenAI(text, options);
			return { ...r, vector: resize(r.vector, targetDim), dimension: targetDim };
		} catch {
			/* fallthrough */
		}
	}
	return await embedWithFallback(text);
}

function resize(vector: number[], target: number): number[] {
	if (vector.length === target) return vector;
	if (vector.length > target) return vector.slice(0, target);
	const out = vector.slice();
	while (out.length < target) out.push(0);
	return out;
}


