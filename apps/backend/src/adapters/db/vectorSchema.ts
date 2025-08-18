import type { Pool } from 'pg';

export async function ensureContextsVectorColumns(pool: Pool, dim = 1536): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Ensure pgvector extension is available (created by initdb, but safe to call)
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    // Add embedding and geo columns if missing
    await client.query(`ALTER TABLE contexts ADD COLUMN IF NOT EXISTS embedding vector(${dim})`);
    await client.query(`ALTER TABLE contexts ADD COLUMN IF NOT EXISTS latitude double precision`);
    await client.query(`ALTER TABLE contexts ADD COLUMN IF NOT EXISTS longitude double precision`);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export function extractLatLon(attributes: any): { lat: number | null; lon: number | null } {
  try {
    const a = attributes || {};
    const lat = coerceNum(a.lat ?? a.latitude ?? a.latitudes);
    const lon = coerceNum(a.lon ?? a.lng ?? a.longitude ?? a.longitudes);
    return { lat, lon };
  } catch {
    return { lat: null, lon: null };
  }
}

function coerceNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : (typeof v === 'number' ? v : NaN);
  return Number.isFinite(n) ? n : null;
}


