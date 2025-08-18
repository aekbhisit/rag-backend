import { getPostgresPool } from "../adapters/db/postgresClient";
import { TenantsRepository, TenantRow } from "../repositories/tenantsRepository";

function normalizeCode(existing?: string | null): string | null {
  if (!existing || !existing.trim()) return null;
  const candidate = existing.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{2}\d{4}$/.test(candidate)) return candidate;
  return null;
}

function migrateSettings(oldSettings: any): any {
  const s = oldSettings || {};

  const app = s.app || {};
  const tenant = s.tenant || {};
  const aiModel = s.aiModel || {};
  const embeddingOld = aiModel.embedding || {};
  const generatingOld = aiModel.generating || {};
  const integrations = s.integrations || {};

  const providers: Record<string, { apiKey?: string }> = {
    openai: {},
    anthropic: {},
    google: {},
  };

  // Preserve API keys based on provider from old model blocks
  if (embeddingOld.apiKey && (embeddingOld.embeddingProvider || "openai").toLowerCase() === "openai") {
    providers.openai.apiKey = embeddingOld.apiKey;
  }
  if (generatingOld.apiKey) {
    const p = (generatingOld.provider || "openai").toLowerCase();
    if (providers[p]) providers[p].apiKey = generatingOld.apiKey;
  }

  const settings = {
    profile: {
      defaultLanguage: app.defaultLanguage || "en",
      theme: app.theme || "auto",
    },
    api: {
      enabled: true,
      rateLimitPerMinute: 60,
      rateLimitPerDay: 5000,
      allowedOrigins: Array.isArray(tenant.allowedDomains) ? tenant.allowedDomains : [],
      ipAllowlist: [],
      webhookEndpoint: tenant.webhookUrl || "",
      webhookSecret: "",
    },
    ai: {
      providers,
      embedding: {
        provider: (embeddingOld.embeddingProvider || "openai").toLowerCase(),
        model: embeddingOld.embeddingModel || "",
        dimensions: typeof embeddingOld.dimensions === "number" ? embeddingOld.dimensions : 1536,
      },
      generating: {
        provider: (generatingOld.provider || "openai").toLowerCase(),
        model: generatingOld.model || "",
        maxTokens: typeof generatingOld.maxTokens === "number" ? generatingOld.maxTokens : 2048,
        temperature: typeof generatingOld.temperature === "number" ? generatingOld.temperature : 0.2,
      },
    },
    integrations: {
      googleMapsApiKey: integrations.googleMapsApiKey || "",
      firecrawlApiKey: integrations.firecrawlApiKey || "",
    },
  };

  return settings;
}

async function run() {
  const pool = getPostgresPool();
  const repo = new TenantsRepository(pool);

  const tenants: TenantRow[] = await repo.list();
  let migrated = 0;

  for (const t of tenants) {
    const oldSettings = t.settings || {};
    const newSettings = migrateSettings(oldSettings);

    // Normalize code format: AA1234, generate if missing/invalid
    const normalized = normalizeCode(t.code || null);
    const patch: any = { settings: newSettings };
    if (!normalized) {
      // Let repository generate a new code only on create; here keep existing if present, else leave as-is
      // We can only uppercase if present and not in expected format
      if (t.code && t.code.trim()) patch.code = t.code.trim().toUpperCase();
    } else if (normalized !== t.code) {
      patch.code = normalized;
    }

    // Remove slug usage by nulling it out to avoid confusion (optional)
    patch.slug = null;

    await pool.query(
      `UPDATE tenants SET code = COALESCE($2, code), slug = $3, settings = $4, updated_at = now() WHERE id=$1`,
      [t.id, patch.code ?? null, patch.slug, patch.settings]
    );

    migrated += 1;
  }

  console.log(`Migrated ${migrated} tenant(s) to new settings structure.`);
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


