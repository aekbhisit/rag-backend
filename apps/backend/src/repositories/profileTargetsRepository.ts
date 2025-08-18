import type { Pool } from 'pg';

export type ProfileTargetRow = {
  profile_id: string;
  tenant_id: string;
  intent_scope: string | null;
  intent_action: string | null;
  channel: string;
  user_segment: string;
  priority: number;
};

export class ProfileTargetsRepository {
  constructor(private readonly pool: Pool) {}

  async list(tenantId: string): Promise<ProfileTargetRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM profile_targets WHERE tenant_id=$1 ORDER BY priority DESC`,
      [tenantId]
    );
    return rows as ProfileTargetRow[];
  }

  async upsert(tenantId: string, input: ProfileTargetRow): Promise<ProfileTargetRow> {
    const { profile_id, intent_scope, intent_action, channel, user_segment, priority } = input;
    const { rows } = await this.pool.query(
      `INSERT INTO profile_targets (profile_id, tenant_id, intent_scope, intent_action, channel, user_segment, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (profile_id, tenant_id, intent_scope, intent_action, channel, user_segment)
       DO UPDATE SET priority=excluded.priority
       RETURNING *`,
      [profile_id, tenantId, intent_scope ?? null, intent_action ?? null, channel ?? '', user_segment ?? '', priority ?? 0]
    );
    return rows[0] as ProfileTargetRow;
  }

  async delete(tenantId: string, key: { profile_id: string; intent_scope?: string | null; intent_action?: string | null; channel?: string; user_segment?: string; }): Promise<boolean> {
    const { profile_id, intent_scope = null, intent_action = null, channel = '', user_segment = '' } = key;
    const res = await this.pool.query(
      `DELETE FROM profile_targets WHERE profile_id=$1 AND tenant_id=$2 AND coalesce(intent_scope,'')=coalesce($3,'') AND coalesce(intent_action,'')=coalesce($4,'') AND channel=$5 AND user_segment=$6`,
      [profile_id, tenantId, intent_scope, intent_action, channel, user_segment]
    );
    return (res.rowCount ?? 0) > 0;
  }
}


