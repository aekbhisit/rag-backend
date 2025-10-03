import { useState, useEffect } from 'react';
import { getApiUrl } from '@/app/lib/apiHelper';

export interface TenantAiConfig {
  apiKey: string;
  model: string;
  provider: string;
  maxTokens: number;
  temperature: number;
}

export function useTenantAiConfig() {
  const [config, setConfig] = useState<TenantAiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(getApiUrl('/api/tenant-ai-config'), {
          headers: {
            'X-Tenant-ID': process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tenant config: ${response.status}`);
        }
        
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        console.error('Error fetching tenant AI config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to default config
        setConfig({
          apiKey: '',
          model: 'gpt-4o',
          provider: 'openai',
          maxTokens: 4000,
          temperature: 0.7
        });
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  return { config, loading, error };
}
