/**
 * Session Auth Utilities
 * ----------------------
 * Fetch an ephemeral API key for the Realtime session from the server.
 */

export interface EphemeralKeyResponse {
  client_secret?: { value?: string };
  [key: string]: any;
}

export async function fetchEphemeralKey(): Promise<string> {
  // Add cache-busting parameter to force new server-side session
  const cacheBuster = `t=${Date.now()}&r=${Math.random().toString(36).substr(2, 9)}`;
  const url = `/services/session?${cacheBuster}`;

  try {
    const tokenResponse = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    const data: EphemeralKeyResponse = await tokenResponse.json();
    try { console.log('[SessionAuth] API response:', data); } catch {}

    const key = data?.client_secret?.value;
    if (!key || typeof key !== 'string') {
      throw new Error(`No ephemeral key provided by the server. Response: ${JSON.stringify(data)}`);
    }
    return key;
  } catch (err) {
    console.error('[SessionAuth] Failed to get ephemeral key:', err);
    throw (err instanceof Error ? err : new Error('Failed to get ephemeral key'));
  }
}


