import fs from "node:fs";
import path from "node:path";
// import { fileURLToPath } from "node:url";

export interface OpenSearchClientLike {
  indices: {
    exists(params: { index: string }): Promise<{ body: boolean } | boolean>;
    create(params: { index: string; body: any }): Promise<any>;
    putMapping(params: { index: string; body: any }): Promise<any>;
  };
  cluster?: { health(params?: Record<string, any>): Promise<{ status?: string } | any> };
}

function resolveMappingFilePath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "infra/search/context-index.json"),
    path.resolve(process.cwd(), "../../infra/search/context-index.json"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {
      // ignore
    }
  }
  return null;
}

export async function ensureContextIndex(client: OpenSearchClientLike, indexName = "contexts") {
  const existsResult = await client.indices.exists({ index: indexName });
  const exists = typeof existsResult === "boolean" ? existsResult : (existsResult as any).body;
  if (exists) return { created: false };

  const mappingPath = resolveMappingFilePath();
  if (!mappingPath) {
    // Fallback: create empty index if mapping file not found
    await client.indices.create({ index: indexName, body: {} });
    return { created: true, warning: "mapping file not found; created with default settings" } as const;
  }
  const raw = fs.readFileSync(mappingPath, "utf-8");
  const body = JSON.parse(raw);
  await client.indices.create({ index: indexName, body });
  return { created: true };
}

export async function putMappings(client: OpenSearchClientLike, indexName = "contexts", mapping: any) {
  return client.indices.putMapping({ index: indexName, body: mapping });
}

export async function health(client: OpenSearchClientLike) {
  if (!client.cluster?.health) return { status: "unknown" } as const;
  const h = await client.cluster.health();
  return { status: h.status ?? "unknown" } as const;
}


