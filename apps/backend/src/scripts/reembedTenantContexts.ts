import { getPostgresPool } from "../adapters/db/postgresClient";
import { TenantsRepository } from "../repositories/tenantsRepository";
import { createEmbedding } from "../adapters/ai/embeddingClient";
import { extractLatLon, ensureContextsVectorColumns } from "../adapters/db/vectorSchema";

async function run() {
  const tenantId = process.env.TENANT_ID;
  if (!tenantId) {
    console.error("Please set TENANT_ID env var");
    process.exit(1);
  }
  const pool = getPostgresPool();
  const tenantsRepo = new TenantsRepository(pool);
  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    const { rows } = await client.query(`
      SELECT id, tenant_id, type, title, body, instruction, attributes, trust_level, status, keywords, language, created_at, updated_at
      FROM contexts WHERE tenant_id=$1
      ORDER BY created_at DESC
    `, [tenantId]);
    console.log(`Found ${rows.length} contexts for tenant ${tenantId}`);
    const tenant = await tenantsRepo.get(tenantId);
    const ai: any = tenant?.settings?.ai || {};
    const embCfg: any = ai.embedding || {};
    const provider: string = (embCfg.provider || (process.env.EMBEDDING_PROVIDER || 'openai')).toLowerCase();
    const model: string = embCfg.model || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const targetDim = Number(process.env.EMBEDDING_DIM || '1536');
    const apiKey: string | undefined = ai?.providers?.[provider]?.apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined);
    await ensureContextsVectorColumns(getPostgresPool(), targetDim);

    let ok = 0; let fail = 0;
    for (const c of rows) {
      try {
        const keywords = Array.isArray(c.keywords) ? c.keywords : [];
        const emb = await createEmbedding({ title: c.title, body: c.body, keywords }, { provider: provider as any, apiKey, model, targetDim, metadata: { tenant_id: tenantId, context_id: c.id } });
        const { lat, lon } = extractLatLon(c.attributes || {});
        const vectorLiteral = `[${emb.vector.map((n: number) => Number(n)).join(',')}]`;
        await pool.query(
          `UPDATE contexts SET embedding = $3::vector, latitude=$4, longitude=$5 WHERE tenant_id=$1 AND id=$2`,
          [tenantId, c.id, vectorLiteral, lat, lon]
        );
        ok++;
      } catch (e) {
        fail++;
        console.error(`Failed re-embed context ${c.id}:`, (e as any)?.message || e);
      }
    }
    console.log(`Re-embedded ${ok} contexts; failed ${fail}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });


