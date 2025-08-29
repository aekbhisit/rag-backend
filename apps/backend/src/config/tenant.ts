import 'dotenv/config';

/**
 * Centralized tenant configuration utilities.
 * Reads default tenant id from env variables TENANT_ID or DEFAULT_TENANT_ID.
 */
export function getDefaultTenantId(): string {
  // Accept RAG_TENANT_ID for parity with Next app env naming
  const envTenant = process.env.TENANT_ID || process.env.DEFAULT_TENANT_ID || process.env.RAG_TENANT_ID;
  const fallback = '00000000-0000-0000-0000-000000000000';
  const id = (envTenant || fallback).toString();
  return id;
}

export function resolveTenantId(headerValue?: string | null): string {
  const id = (headerValue || getDefaultTenantId()).toString();
  return id;
}

export function getTenantIdFromReq(req: { header(name: string): string | undefined }): string {
  return resolveTenantId(req.header('X-Tenant-ID'));
}


