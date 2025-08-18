import { getPostgresPool } from "../adapters/db/postgresClient";

function mask(value?: string | null): string {
  if (!value) return "";
  if (value.length <= 6) return "***";
  return value.slice(0, 3) + "***" + value.slice(-3);
}

async function run() {
  const pool = getPostgresPool();
  try {
    const { rows } = await pool.query(`SELECT id, name, code, slug, contact_email, is_active, settings FROM tenants ORDER BY created_at ASC`);
    for (const r of rows) {
      const s = r.settings || {};
      const providers = (s.ai?.providers) || {};
      console.log(JSON.stringify({
        id: r.id,
        name: r.name,
        code: r.code,
        slug: r.slug,
        email: r.contact_email,
        is_active: r.is_active,
        profile: s.profile || {},
        api: s.api ? { ...s.api, webhookSecret: mask(s.api.webhookSecret) } : undefined,
        aiProviders: {
          openai: providers.openai ? mask(providers.openai.apiKey) : undefined,
          anthropic: providers.anthropic ? mask(providers.anthropic.apiKey) : undefined,
          google: providers.google ? mask(providers.google.apiKey) : undefined,
        },
        aiEmbedding: s.ai?.embedding || {},
        aiGenerating: s.ai?.generating || {},
        integrations: s.integrations ? {
          googleMapsApiKey: mask(s.integrations.googleMapsApiKey),
          firecrawlApiKey: mask(s.integrations.firecrawlApiKey),
        } : undefined,
      }, null, 2));
    }
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });


