import { Client } from 'minio';

let client: Client | null = null;

export function getMinio() {
  if (!client) {
    client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: false,
      accessKey: process.env.MINIO_ROOT_USER || 'minio',
      secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio123',
    });
  }
  return client;
}

export async function init() {
  const c = getMinio();
  const bucket = process.env.MINIO_BUCKET || 'uploads';
  const exists = await c.bucketExists(bucket).catch(() => false);
  if (!exists) await c.makeBucket(bucket, 'us-east-1');
}

export async function health() {
  try {
    await getMinio().listBuckets();
    return { status: 'ok' as const };
  } catch (e) {
    return { status: 'error' as const, error: (e as Error).message };
  }
}


