import { Langfuse } from 'langfuse';

export interface TraceMeta {
	name: string;
	input?: unknown;
	output?: unknown;
	metadata?: Record<string, unknown>;
	model?: string;
	usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
	traceId?: string;
	userId?: string;
	sessionId?: string;
}

let singleton: Langfuse | null = null;

function getClient(): Langfuse | null {
	if (singleton) return singleton;
	const publicKey = process.env.LANGFUSE_PUBLIC_KEY || '';
	const secretKey = process.env.LANGFUSE_SECRET_KEY || '';
	const baseUrl = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASEURL || 'http://localhost:3101';
	if (!publicKey || !secretKey) return null;
	singleton = new Langfuse({ publicKey, secretKey, baseUrl });
	return singleton;
}

export async function recordGeneration(_trace: any) { return; }
export async function startGeneration(_args: any) { return { end: async () => {} }; }


