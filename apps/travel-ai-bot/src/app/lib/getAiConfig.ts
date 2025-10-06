/**
 * Utility to fetch AI configuration from the backend database
 * This replaces environment variable usage with database-stored API keys
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const TENANT_ID = process.env.TENANT_ID || 'acc44cdb-8da5-4226-9569-1233a39f564f';

export interface AiConfig {
  apiKey: string;
  model: string;
  provider: string;
  maxTokens: number;
  temperature: number;
}

let cachedConfig: AiConfig | null = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch AI configuration from backend database
 * Uses caching to avoid repeated API calls
 */
export async function getAiConfig(): Promise<AiConfig> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/agents-master/config`, {
      headers: {
        'x-tenant-id': TENANT_ID,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AI config: ${response.status} ${response.statusText}`);
    }

    const config = await response.json();
    
    // Validate required fields
    if (!config.apiKey) {
      throw new Error('API key not found in tenant configuration');
    }

    // Cache the config
    cachedConfig = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-4o',
      provider: config.provider || 'openai',
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7,
    };
    
    cacheExpiry = now + CACHE_DURATION;
    
    return cachedConfig;
  } catch (error) {
    console.error('Error fetching AI config from database:', error);
    
    // Fallback to environment variable if database fetch fails
    const fallbackApiKey = process.env.OPENAI_API_KEY;
    if (fallbackApiKey) {
      console.warn('Using fallback API key from environment variable');
      return {
        apiKey: fallbackApiKey,
        model: 'gpt-4o',
        provider: 'openai',
        maxTokens: 4000,
        temperature: 0.7,
      };
    }
    
    throw new Error(`Failed to get AI configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clear the cached AI configuration
 * Useful for testing or when config changes
 */
export function clearAiConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}
