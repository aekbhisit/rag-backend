import { ContextRetrievalRequestSchema, ContextRetrievalResponseSchema } from "../schemas";
export class RagSdkClient {
    baseUrl;
    defaultHeaders;
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, "");
        this.defaultHeaders = {
            "Content-Type": "application/json",
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
            ...(config.tenantId ? { "X-Tenant-ID": config.tenantId } : {}),
        };
    }
    async retrieveContexts(input) {
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
