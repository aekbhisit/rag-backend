export interface Intent {
  id: string;
  tenant_id: string;
  scope: string;
  action: string;
  description?: string;
  created_at: string;
}

export interface EnhancedIntentFilters {
  scope?: string;
  action?: string;
  detail?: string;
}


