import { getPostgresPool } from "../adapters/db/postgresClient";

async function run() {
  const pool = getPostgresPool();
  try {
    const { rows: tenants } = await pool.query(`SELECT id, settings FROM tenants`);
    let fixed = 0;
    for (const t of tenants) {
      const s = t.settings || {};
      const next: any = { ...s };

      // Ensure parent blocks exist
      next.profile = next.profile || { defaultLanguage: "en", theme: "auto" };
      next.api = next.api || { enabled: true, rateLimitPerMinute: 60, rateLimitPerDay: 5000, allowedOrigins: [], ipAllowlist: [], webhookEndpoint: "", webhookSecret: "" };
      next.ai = next.ai || { providers: {}, embedding: { provider: "", model: "", dimensions: 1536 }, generating: { provider: "", model: "", maxTokens: 2048, temperature: 0.2 } };
      next.ai.providers = next.ai.providers || {};
      next.integrations = next.integrations || { googleMapsApiKey: "", firecrawlApiKey: "" };

      // Migrate keys from old aiModel if missing
      const old = s.aiModel || {};
      const embOld = old.embedding || {};
      const genOld = old.generating || {};

      const embProvider = (next.ai.embedding?.provider || embOld.embeddingProvider || "openai").toLowerCase();
      const genProvider = (next.ai.generating?.provider || genOld.provider || "openai").toLowerCase();

      if (!next.ai.providers[embProvider]) next.ai.providers[embProvider] = {};
      if (!next.ai.providers[genProvider]) next.ai.providers[genProvider] = {};

      if (!next.ai.providers[embProvider].apiKey && embOld.apiKey) next.ai.providers[embProvider].apiKey = embOld.apiKey;
      if (!next.ai.providers[genProvider].apiKey && genOld.apiKey) next.ai.providers[genProvider].apiKey = genOld.apiKey;

      // Carry over models if blank
      if (!next.ai.embedding.model && embOld.embeddingModel) next.ai.embedding.model = embOld.embeddingModel;
      if (!next.ai.generating.model && genOld.model) next.ai.generating.model = genOld.model;

      // Carry over integrations
      const integOld = s.integrations || {};
      if (!next.integrations.googleMapsApiKey && integOld.googleMapsApiKey) next.integrations.googleMapsApiKey = integOld.googleMapsApiKey;
      if (!next.integrations.firecrawlApiKey && integOld.firecrawlApiKey) next.integrations.firecrawlApiKey = integOld.firecrawlApiKey;

      await pool.query(`UPDATE tenants SET settings=$2, updated_at=now() WHERE id=$1`, [t.id, next]);
      fixed += 1;
    }
    console.log(`Repaired ${fixed} tenant(s).`);
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });


