"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { BACKEND_URL, DEFAULT_TENANT_ID } from "../../../../../components/config";
import { Select } from "../../../../../components/ui/Select";

export default function TenantSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const [loading, setLoading] = React.useState(false);
  const [tenantName, setTenantName] = React.useState("");
  const [form, setForm] = React.useState<any>({
    profile: { defaultLanguage: "en", theme: "auto" },
    api: { enabled: true, rateLimitPerMinute: 60, rateLimitPerDay: 5000, allowedOrigins: [], ipAllowlist: [], webhookEndpoint: "", webhookSecret: "" },
    ai: {
      providers: { openai: { apiKey: "" }, anthropic: { apiKey: "" }, google: { apiKey: "" } },
      embedding: { provider: "openai", model: "text-embedding-3-small", dimensions: 1536 },
      generating: { provider: "openai", model: "gpt-4o-mini", maxTokens: 2048, temperature: 0.2 }
    },
    integrations: { googleMapsApiKey: "", firecrawlApiKey: "" }
  });

  const [embeddingOptions, setEmbeddingOptions] = React.useState<Array<{ provider: string; model: string }>>([]);
  const [generatingOptions, setGeneratingOptions] = React.useState<Array<{ provider: string; model: string }>>([]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/tenants/${id}`, { headers: { 'X-Tenant-ID': DEFAULT_TENANT_ID } });
      const t = await r.json();
      setTenantName(t.name || id);
      setForm({ ...form, ...(t.settings || {}) });
      // load AI pricing options
      try {
        const r2 = await fetch(`${BACKEND_URL}/api/admin/ai-pricing`, { headers: { 'X-Tenant-ID': DEFAULT_TENANT_ID } });
        const data = await r2.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const emb: Array<{ provider: string; model: string }> = [];
        const gen: Array<{ provider: string; model: string }> = [];
        for (const it of items) {
          const provider = String(it.provider || '').trim();
          const model = String(it.model || '').trim();
          const isEmbedding = (it.embedding_per_1k != null) || /embedding/i.test(model);
          if (provider && model) {
            if (isEmbedding) emb.push({ provider, model });
            else gen.push({ provider, model });
          }
        }
        setEmbeddingOptions(emb);
        setGeneratingOptions(gen);
      } catch {}
    } finally { setLoading(false); }
  };

  React.useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

  const save = async () => {
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': DEFAULT_TENANT_ID },
        body: JSON.stringify({ settings: form })
      });
      alert('Saved');
    } finally { setLoading(false); }
  };

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenant Settings — {tenantName}</h1>
        <button onClick={save} className="h-9 px-4 rounded bg-black text-white" disabled={loading}>Save</button>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <section className="border rounded p-4 space-y-3">
          <div className="font-medium">General</div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">Name
              <input className="mt-1 w-full border rounded px-2 py-1" value={tenantName} onChange={e => { setTenantName(e.target.value); setForm((f: any) => ({ ...f, name: e.target.value })); }} />
            </label>
            <label className="text-sm">Code
              <input className="mt-1 w-full border rounded px-2 py-1" value={String((form as any)?.code || '')} readOnly />
            </label>
            <label className="text-sm">Contact Email
              <input className="mt-1 w-full border rounded px-2 py-1" value={String((form as any)?.contact_email || '')} onChange={e => setForm((f: any) => ({ ...f, contact_email: e.target.value }))} />
            </label>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[color:var(--text)]">Default Language</label>
            <Select
              placeholder="Select language"
              value={form.profile?.defaultLanguage || 'en'}
              onChange={e => setForm((f: any) => ({ ...f, profile: { ...(f.profile || {}), defaultLanguage: e.target.value } }))}
              options={[
                { value: "en", label: "English" },
                { value: "th", label: "Thai" }
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[color:var(--text)]">Theme</label>
            <Select
              placeholder="Select theme"
              value={form.profile?.theme || 'auto'}
              onChange={e => setForm((f: any) => ({ ...f, profile: { ...(f.profile || {}), theme: e.target.value } }))}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "auto", label: "Auto" }
              ]}
            />
          </div>
        </section>

        <section className="border rounded p-4 space-y-3">
          <div className="font-medium">AI</div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Provider API Keys</div>
            <label className="text-sm">OpenAI API Key
              <input className="mt-1 w-full border rounded px-2 py-1" type="password" value={form.ai?.providers?.openai?.apiKey || ''} onChange={e => setForm((f: any) => ({ ...f, ai: { ...(f.ai || {}), providers: { ...(f.ai?.providers || {}), openai: { ...(f.ai?.providers?.openai || {}), apiKey: e.target.value } } } }))} />
            </label>
            <label className="text-sm">Anthropic API Key
              <input className="mt-1 w-full border rounded px-2 py-1" type="password" value={form.ai?.providers?.anthropic?.apiKey || ''} onChange={e => setForm((f: any) => ({ ...f, ai: { ...(f.ai || {}), providers: { ...(f.ai?.providers || {}), anthropic: { ...(f.ai?.providers?.anthropic || {}), apiKey: e.target.value } } } }))} />
            </label>
            <label className="text-sm">Google (Gemini) API Key
              <input className="mt-1 w-full border rounded px-2 py-1" type="password" value={form.ai?.providers?.google?.apiKey || ''} onChange={e => setForm((f: any) => ({ ...f, ai: { ...(f.ai || {}), providers: { ...(f.ai?.providers || {}), google: { ...(f.ai?.providers?.google || {}), apiKey: e.target.value } } } }))} />
            </label>
          </div>

          <div className="pt-2 space-y-2">
            <div className="text-sm font-medium">Embedding</div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[color:var(--text)]">Provider</label>
              <Select
                placeholder="Select provider"
                value={form.ai?.embedding?.provider || ''}
                onChange={e => setForm((f: any) => ({ ...f, ai: { ...(f.ai || {}), embedding: { ...(f.ai?.embedding || {}), provider: e.target.value, model: '' } } }))}
                options={[...new Set(embeddingOptions.map(o => o.provider))].map(p => ({ value: p, label: p }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[color:var(--text)]">Model</label>
              <Select
                placeholder="Select model"
                value={form.ai?.embedding?.model || ''}
                onChange={e => setForm((f: any) => ({ ...f, ai: { ...(f.ai || {}), embedding: { ...(f.ai?.embedding || {}), model: e.target.value } } }))}
                options={embeddingOptions.filter(o => o.provider === form.ai?.embedding?.provider).map(o => ({ value: o.model, label: o.model }))}
              />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <div className="text-sm font-medium">Generating</div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[color:var(--text)]">Provider</label>
              <Select
                placeholder="Select provider"
                value={form.ai?.generating?.provider || ''}
                onChange={e => setForm((f: any) => ({ ...f, ai: { ...(f.ai || {}), generating: { ...(f.ai?.generating || {}), provider: e.target.value, model: '' } } }))}
                options={[...new Set(generatingOptions.map(o => o.provider))].map(p => ({ value: p, label: p }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[color:var(--text)]">Model</label>
              <Select
                placeholder="Select model"
                value={form.ai?.generating?.model || ''}
                onChange={e => setForm((f: any) => ({ ...f, ai: { ...(f.ai || {}), generating: { ...(f.ai?.generating || {}), model: e.target.value } } }))}
                options={generatingOptions.filter(o => o.provider === form.ai?.generating?.provider).map(o => ({ value: o.model, label: o.model }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Max Tokens
                <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={form.ai?.generating?.maxTokens || 0} onChange={e => setForm((f: any) => ({ ...f, ai: { ...(f.ai || {}), generating: { ...(f.ai?.generating || {}), maxTokens: parseInt(e.target.value) || 0 } } }))} />
              </label>
              <label className="text-sm">Temperature
                <input type="number" step="0.01" className="mt-1 w-full border rounded px-2 py-1" value={form.ai?.generating?.temperature || 0} onChange={e => setForm((f: any) => ({ ...f, ai: { ...(f.ai || {}), generating: { ...(f.ai?.generating || {}), temperature: parseFloat(e.target.value) || 0 } } }))} />
              </label>
            </div>
          </div>
        </section>

        <section className="border rounded p-4 space-y-3">
          <div className="font-medium">API</div>
          <label className="text-sm flex items-center gap-2">Enabled
            <input type="checkbox" checked={!!form.api?.enabled} onChange={e => setForm((f: any) => ({ ...f, api: { ...(f.api || {}), enabled: e.target.checked } }))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Rate limit / minute
              <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={form.api?.rateLimitPerMinute || 0} onChange={e => setForm((f: any) => ({ ...f, api: { ...(f.api || {}), rateLimitPerMinute: parseInt(e.target.value) || 0 } }))} />
            </label>
            <label className="text-sm">Rate limit / day
              <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={form.api?.rateLimitPerDay || 0} onChange={e => setForm((f: any) => ({ ...f, api: { ...(f.api || {}), rateLimitPerDay: parseInt(e.target.value) || 0 } }))} />
            </label>
            <label className="text-sm">Allowed Origins (comma separated)
              <input className="mt-1 w-full border rounded px-2 py-1" value={(form.api?.allowedOrigins || []).join(', ')} onChange={e => setForm((f: any) => ({ ...f, api: { ...(f.api || {}), allowedOrigins: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) } }))} />
            </label>
          </div>
          <label className="text-sm">IP Allowlist (comma separated)
            <input className="mt-1 w-full border rounded px-2 py-1" value={(form.api?.ipAllowlist || []).join(', ')} onChange={e => setForm((f: any) => ({ ...f, api: { ...(f.api || {}), ipAllowlist: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) } }))} />
          </label>
          <label className="text-sm">Webhook Endpoint
            <input className="mt-1 w-full border rounded px-2 py-1" value={form.api?.webhookEndpoint || ''} onChange={e => setForm((f: any) => ({ ...f, api: { ...(f.api || {}), webhookEndpoint: e.target.value } }))} />
          </label>
          <label className="text-sm">Webhook Secret
            <input className="mt-1 w-full border rounded px-2 py-1" type="password" value={form.api?.webhookSecret || ''} onChange={e => setForm((f: any) => ({ ...f, api: { ...(f.api || {}), webhookSecret: e.target.value } }))} />
          </label>
        </section>

        <section className="border rounded p-4 space-y-3">
          <div className="font-medium">Integrations</div>
          <label className="text-sm">Google Maps API Key
            <input className="mt-1 w-full border rounded px-2 py-1" value={form.integrations?.googleMapsApiKey || ''} onChange={e => setForm((f: any) => ({ ...f, integrations: { ...(f.integrations || {}), googleMapsApiKey: e.target.value } }))} />
          </label>
          <label className="text-sm">Firecrawl API Key
            <input className="mt-1 w-full border rounded px-2 py-1" value={form.integrations?.firecrawlApiKey || ''} onChange={e => setForm((f: any) => ({ ...f, integrations: { ...(f.integrations || {}), firecrawlApiKey: e.target.value } }))} />
          </label>
        </section>

        
      </div>
    </main>
  );
}


