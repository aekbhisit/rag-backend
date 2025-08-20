export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
export const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || 'acc44cdb-8da5-4226-9569-1233a39f564f';

export function getTenantId(): string {
  // Prefer a runtime-selected tenant from localStorage if available
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('tenantId');
      if (stored && stored !== '00000000-0000-0000-0000-000000000000') return stored;
    } catch {}
  }
  // Fallback to configured default if it's not the zero UUID
  if (DEFAULT_TENANT_ID && DEFAULT_TENANT_ID !== '00000000-0000-0000-0000-000000000000') {
    return DEFAULT_TENANT_ID;
  }
  // Final fallback to known working demo tenant
  return 'acc44cdb-8da5-4226-9569-1233a39f564f';
}
