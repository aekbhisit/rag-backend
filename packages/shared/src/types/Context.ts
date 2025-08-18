export type ContextType = 'place' | 'website' | 'ticket' | 'document' | 'text';

export interface Context {
  id: string;
  tenant_id: string;
  type: ContextType;
  title: string;
  body: string;
  instruction?: string;
  attributes: Record<string, unknown>;
  trust_level: number;
  language?: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  context_id: string;
  snippet: string;
  score?: number;
}


