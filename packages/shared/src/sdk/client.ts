import { ContextRetrievalRequestSchema, ContextRetrievalResponseSchema } from "../schemas";

export interface SdkConfig {
  baseUrl: string;
  apiKey?: string;
  tenantId?: string;
}

export class RagSdkClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: SdkConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...(config.tenantId ? { "X-Tenant-ID": config.tenantId } : {}),
    };
  }

  async retrieveContexts(input: unknown) {
    const body = ContextRetrievalRequestSchema.parse(input);
    const res = await fetch(`${this.baseUrl}/api/retrieve`, {
      method: "POST",
      headers: this.defaultHeaders,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return ContextRetrievalResponseSchema.parse(data);
  }
}


