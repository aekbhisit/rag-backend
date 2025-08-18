import { Langfuse } from 'langfuse';

type DailyMetric = {
  date: string; // YYYY-MM-DD
  totalCostUSD?: number;
  totalTokens?: number;
  generations?: number;
  embeddings?: number;
};

type Observation = {
  id: string;
  createdAt: string;
  startTime?: string;
  endTime?: string;
  name?: string;
  type?: string; // generation|span|event
  model?: string;
  provider?: string;
  status?: string;
  costInUSD?: number;
  usage?: { input?: number; output?: number; total?: number; promptTokens?: number; completionTokens?: number; totalTokens?: number };
  metadata?: Record<string, any>;
};

let sdkClient: Langfuse | null = null;
function getClient(): Langfuse {
  if (sdkClient) return sdkClient;
  const rawBase = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASEURL || '';
  const baseUrl = rawBase.replace(/\/+$/, '');
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY || '';
  const secretKey = process.env.LANGFUSE_SECRET_KEY || '';
  if (!baseUrl || !publicKey || !secretKey) {
    throw new Error('Langfuse config missing: LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY');
  }
  sdkClient = new Langfuse({ baseUrl, publicKey, secretKey });
  return sdkClient;
}

// No direct HTTP calls; use SDK per docs

export async function fetchDailyMetrics(_fromISO: string, _toISO: string) { return []; }
export async function fetchObservations(_fromISO: string, _toISO: string, _limit = 100) { return []; }


