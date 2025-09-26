type CreateSessionBody = {
  user_id?: string | null;
  channel: 'normal' | 'realtime' | 'human';
  status?: 'active' | 'ended' | 'error';
  meta?: any;
};

type CreateMessageBody = {
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  type: 'text' | 'audio' | 'image' | 'event';
  content?: string | null;
  content_tokens?: number | null;
  response_tokens?: number | null;
  total_tokens?: number | null;
  model?: string | null;
  latency_ms?: number | null;
  meta?: any;
};

export class ConversationCollector {
  private readonly baseUrl: string;
  private readonly tenantId: string;

  constructor(opts?: { baseUrl?: string; tenantId?: string }) {
    this.baseUrl = (opts?.baseUrl || process.env.RAG_BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
    // Use NEXT_PUBLIC_ version for client-side access only
    this.tenantId = opts?.tenantId || process.env.NEXT_PUBLIC_RAG_TENANT_ID || '';
    
    // Debug environment variables (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ConversationCollector] Config:`, {
        baseUrl: this.baseUrl,
        tenantId: this.tenantId ? `${this.tenantId.slice(0, 8)}...` : 'MISSING'
      });
    }
    
    if (!this.tenantId) {
      throw new Error('RAG_TENANT_ID is required for logging.');
    }
  }

  private headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.tenantId) h['X-Tenant-ID'] = this.tenantId;
    return h;
  }

  async createSession(body: CreateSessionBody) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    console.log('[ConversationCollector] Creating session with body:', body);
    console.log('[ConversationCollector] Using baseUrl:', this.baseUrl);
    
    try {
      const res = await fetch(`${this.baseUrl}/api/admin/sessions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      console.log('[ConversationCollector] Session creation response:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[ConversationCollector] Session creation failed:', errorText);
        throw new Error(`createSession failed: ${res.status} ${res.statusText} - ${errorText}`);
      }
      
      const result = await res.json();
      console.log('[ConversationCollector] Session created successfully:', result);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`createSession timed out after 10 seconds. Check if backend is running at ${this.baseUrl}`);
      }
      console.error('[ConversationCollector] Session creation error:', error);
      throw error;
    }
  }

  async endSession(sessionId: string) {
    const res = await fetch(`${this.baseUrl}/api/admin/sessions/${encodeURIComponent(sessionId)}/end`, {
      method: 'POST',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`endSession failed: ${res.status}`);
  }

  async createMessage(body: CreateMessageBody) {
    const res = await fetch(`${this.baseUrl}/api/admin/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`createMessage failed: ${res.status}`);
    return res.json();
  }

  async attachPrompt(messageId: string, data: { template: string; params?: any; tools_declared?: any }) {
    const res = await fetch(`${this.baseUrl}/api/admin/messages/${encodeURIComponent(messageId)}/prompt`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`attachPrompt failed: ${res.status}`);
    return res.json();
  }

  async logToolCall(messageId: string, data: { tool_name: string; arguments?: any; result?: any; status?: string; error?: string; started_at?: string; ended_at?: string; duration_ms?: number }) {
    const res = await fetch(`${this.baseUrl}/api/admin/messages/${encodeURIComponent(messageId)}/tool-calls`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`logToolCall failed: ${res.status}`);
    return res.json();
  }

  async logCitations(messageId: string, items: Array<{ chunk_id: string; source_type: string; source_uri?: string; score?: number; highlight?: string; metadata?: any }>) {
    for (const c of items) {
      const res = await fetch(`${this.baseUrl}/api/admin/messages/${encodeURIComponent(messageId)}/citations`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(c),
      });
      if (!res.ok) throw new Error(`logCitation failed: ${res.status}`);
    }
  }
}

export function createCollector() {
  // Fallback tenant ID if environment variables are not available
  // Use the same fallback as backend default to keep Admin and Logger in sync
  const fallbackTenantId = '00000000-0000-0000-0000-000000000000';
  const tenantId = process.env.NEXT_PUBLIC_RAG_TENANT_ID || fallbackTenantId;
  
  // Use the correct backend URL - try multiple environment variables
  const baseUrl = process.env.RAG_BASE_URL || 
                  process.env.BACKEND_URL || 
                  process.env.NEXT_PUBLIC_BACKEND_URL || 
                  'http://localhost:3001';
  
  return new ConversationCollector({
    tenantId,
    baseUrl
  });
}


