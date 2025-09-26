// Simple in-memory registry to map frontend session IDs to backend session UUIDs
// Note: This is per process and will reset on server restart. For production, use a durable store.

const registry = new Map<string, string>();

export function debugDumpRegistry(): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of registry.entries()) obj[k] = v;
  return obj;
}

function makeKey(frontendSessionId: string): string {
  return String(frontendSessionId || '').trim();
}

export function getMappedBackendSessionId(frontendSessionId: string): string | undefined {
  const key = makeKey(frontendSessionId);
  return key ? registry.get(key) : undefined;
}

export function setMappedBackendSessionId(frontendSessionId: string, backendSessionId: string): void {
  const key = makeKey(frontendSessionId);
  if (!key || !backendSessionId) return;
  registry.set(key, backendSessionId);
}

export function clearMappedBackendSessionId(frontendSessionId: string): void {
  const key = makeKey(frontendSessionId);
  if (!key) return;
  registry.delete(key);
}


