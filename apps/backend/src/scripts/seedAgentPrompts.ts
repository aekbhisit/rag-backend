import fs from 'fs';
import path from 'path';
import { getPostgresPool } from '../adapters/db/postgresClient';

type SeedMode = 'merge' | 'replace';

interface SeedPromptRow {
  tenantId?: string | null;
  agentKey: string;
  category: 'base' | 'initial_system' | 'intention';
  intent?: string | null;
  style?: string | null;
  locale: string;
  content: string;
  metadata?: any;
  publish?: boolean;
}

function readJsonFile(filePath: string): any {
  const abs = path.resolve(process.cwd(), filePath);
  const content = fs.readFileSync(abs, 'utf8');
  return JSON.parse(content);
}

async function main() {
  const MODE = (process.env.MODE as SeedMode) || 'merge';
  const PROMPTS_FILE = process.env.PROMPTS_FILE || '';
  if (!PROMPTS_FILE) {
    console.error('PROMPTS_FILE env var required (path to JSON).');
    process.exit(1);
  }

  const data = readJsonFile(PROMPTS_FILE);
  if (!Array.isArray(data)) {
    console.error('JSON must be an array of prompt rows');
    process.exit(1);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    for (const row of data as SeedPromptRow[]) {
      const tenantId = row.tenantId ?? null;
      const intent = row.intent ?? null;
      const style = row.style ?? null;
      const metadata = row.metadata ?? {};
      const publish = row.publish ?? true;

      // If replace: unpublish any existing active for this key tuple
      if (MODE === 'replace') {
        await client.query(
          `UPDATE agent_prompts SET is_published = false
           WHERE (COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000') = COALESCE($1::uuid,'00000000-0000-0000-0000-000000000000'))
             AND agent_key = $2 AND category = $3 AND COALESCE(intent,'-') = COALESCE($4,'-') AND COALESCE(style,'-') = COALESCE($5,'-') AND locale = $6`,
          [tenantId, row.agentKey, row.category, intent, style, row.locale]
        );
      }

      // If merge: skip insert when an active record already exists
      if (MODE === 'merge') {
        const existing = await client.query(
          `SELECT id FROM agent_prompts
           WHERE (COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000') = COALESCE($1::uuid,'00000000-0000-0000-0000-000000000000'))
             AND agent_key = $2 AND category = $3 AND COALESCE(intent,'-') = COALESCE($4,'-') AND COALESCE(style,'-') = COALESCE($5,'-') AND locale = $6
             AND is_published = true
           LIMIT 1`,
          [tenantId, row.agentKey, row.category, intent, style, row.locale]
        );
        if (existing.rowCount > 0) {
          console.log('Skip existing (merge):', row.agentKey, row.category, intent, style, row.locale);
          continue;
        }
      }

      const ins = await client.query(
        `INSERT INTO agent_prompts (tenant_id, agent_key, category, intent, style, locale, content, metadata, is_published)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
         RETURNING id`,
        [tenantId, row.agentKey, row.category, intent, style, row.locale, row.content, metadata, publish]
      );
      console.log('Inserted prompt id:', ins.rows[0].id);

      if (publish) {
        // Bump version for clarity
        await client.query(`UPDATE agent_prompts SET version = version + 1 WHERE id = $1`, [ins.rows[0].id]);
      }
    }

    console.log('Seeding completed.');
  } finally {
    client.release();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


