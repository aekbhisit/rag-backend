import type { Pool } from 'pg';

export type InstructionProfileRow = {
  id: string;
  tenant_id: string;
  name: string;
  version: number;
  answer_style: any | null;
  retrieval_policy: any | null;
  trust_safety: any | null;
  glossary: any | null;
  ai_instruction_message: string;
  is_active: boolean;
  min_trust_level: number;
  created_at: string;
  updated_at: string;
};

export class InstructionProfilesRepository {
  constructor(private readonly pool: Pool) {}

  async list(tenantId: string, q?: string): Promise<InstructionProfileRow[]> {
    const params: any[] = [tenantId];
    let where = 'tenant_id=$1';
    if (q) { params.push(`%${q}%`); where += ` AND name ILIKE $${params.length}`; }
    const { rows } = await this.pool.query(
      `SELECT * FROM instruction_profiles WHERE ${where} ORDER BY name` , params
    );
    return rows as InstructionProfileRow[];
  }

  async get(tenantId: string, id: string): Promise<InstructionProfileRow | null> {
    const { rows } = await this.pool.query(`SELECT * FROM instruction_profiles WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
    return (rows[0] as InstructionProfileRow) ?? null;
  }

  async create(tenantId: string, input: Omit<InstructionProfileRow, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<InstructionProfileRow> {
    const { name, version, answer_style, retrieval_policy, trust_safety, glossary, ai_instruction_message, is_active, min_trust_level } = input as any;
    const { rows } = await this.pool.query(
      `INSERT INTO instruction_profiles (tenant_id, name, version, answer_style, retrieval_policy, trust_safety, glossary, ai_instruction_message, is_active, min_trust_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [tenantId, name, version ?? 1, answer_style ?? null, retrieval_policy ?? null, trust_safety ?? null, glossary ?? null, ai_instruction_message, is_active ?? true, min_trust_level ?? 0]
    );
    return rows[0] as InstructionProfileRow;
  }

  async update(tenantId: string, id: string, patch: Partial<InstructionProfileRow>): Promise<InstructionProfileRow | null> {
    const existing = await this.get(tenantId, id);
    if (!existing) return null;
    const next = { ...existing, ...patch } as any;
    const { rows } = await this.pool.query(
      `UPDATE instruction_profiles SET name=$3, version=$4, answer_style=$5, retrieval_policy=$6, trust_safety=$7, glossary=$8, ai_instruction_message=$9, is_active=$10, min_trust_level=$11, updated_at=now()
       WHERE tenant_id=$1 AND id=$2 RETURNING *`,
      [tenantId, id, next.name, next.version, next.answer_style, next.retrieval_policy, next.trust_safety, next.glossary, next.ai_instruction_message, next.is_active, next.min_trust_level]
    );
    return (rows[0] as InstructionProfileRow) ?? null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM instruction_profiles WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
    return (res.rowCount ?? 0) > 0;
  }
}


