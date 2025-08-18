export interface QueryLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  query: string;
  detected_language?: string;
  profile_id?: string;
  retrieval_method?: 'structured' | 'hybrid' | 'fallback';
  latency_ms?: number;
  created_at: string;
}


