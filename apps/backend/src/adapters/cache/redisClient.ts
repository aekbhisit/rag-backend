import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export async function init() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();
  }
}

export async function health() {
  try {
    await client?.ping();
    return { status: 'ok' as const };
  } catch (e) {
    return { status: 'error' as const, error: (e as Error).message };
  }
}


