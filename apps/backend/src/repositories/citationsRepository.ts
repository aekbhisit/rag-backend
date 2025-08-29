import type { Pool } from 'pg';

export type CitationRow = {
  id: string;
  tenant_id: string;
  message_id: string;
  chunk_id: string;
  source_type: string;
  source_uri: string | null;
  score: number | null;
  highlight: string | null;
  metadata: any;
};

export class CitationsRepository {
  constructor(private readonly pool: Pool) {}

  async listByMessage(tenantId: string, messageId: string): Promise<CitationRow[]> {
    const { rows } = await this.pool.query(`SELECT * FROM rag_citations WHERE tenant_id=$1 AND message_id=$2 ORDER BY score DESC NULLS LAST`, [tenantId, messageId]);
    return rows as CitationRow[];
  }
}


