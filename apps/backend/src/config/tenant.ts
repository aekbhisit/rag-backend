import 'dotenv/config';

/**
 * Centralized tenant configuration utilities.
 * Reads tenant id from NEXT_PUBLIC_RAG_TENANT_ID only.
 */
export function getDefaultTenantId(): string {
  // Use NEXT_PUBLIC_RAG_TENANT_ID only, no fallback to default ID
  const envTenant = process.env.NEXT_PUBLIC_RAG_TENANT_ID;
  if (!envTenant) {
    throw new Error('NEXT_PUBLIC_RAG_TENANT_ID environment variable is required');
  }
  return envTenant.toString();
}

export function resolveTenantId(headerValue?: string | null): string {
  const id = (headerValue || getDefaultTenantId()).toString();
  return id;
}

export function getTenantIdFromReq(req: { header(name: string): string | undefined }): string {
  return resolveTenantId(req.header('X-Tenant-ID'));
}


