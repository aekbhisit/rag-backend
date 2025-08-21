export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
export const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000';

export function getTenantId(): string {
  // Prefer a runtime-selected tenant from localStorage if available
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('tenantId');
      if (stored) return stored;
    } catch {}
  }
  // Return the configured default tenant ID
  return DEFAULT_TENANT_ID;
}
