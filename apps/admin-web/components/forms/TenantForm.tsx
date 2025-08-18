"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../config";

type TenantFormProps = {
  tenantId?: string;
};

export default function TenantForm({ tenantId }: TenantFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", code: "", contact_email: "", is_active: true });
  const [settings, setSettings] = React.useState<any>({
    profile: { defaultLanguage: "en", theme: "auto" },
    api: { enabled: true, rateLimitPerMinute: 60, rateLimitPerDay: 5000, allowedOrigins: [], ipAllowlist: [], webhookEndpoint: "", webhookSecret: "" },
    ai: {
      providers: { openai: { apiKey: "" }, anthropic: { apiKey: "" }, google: { apiKey: "" } },
      embedding: { provider: "", model: "", dimensions: 1536 },
      generating: { provider: "", model: "", maxTokens: 2048, temperature: 0.2 }
    },
    integrations: { googleMapsApiKey: "", firecrawlApiKey: "" }
  });
  const [embeddingOptions, setEmbeddingOptions] = React.useState<Array<{ provider: string; model: string }>>([]);
  const [generatingOptions, setGeneratingOptions] = React.useState<Array<{ provider: string; model: string }>>([]);

  const loadAiPricing = async () => {
    const r = await fetch(`${BACKEND_URL}/api/admin/ai-pricing`);
    const data = await r.json();
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
    setSettings((s: any) => {
      const embProvider = s?.ai?.embedding?.provider || (emb[0]?.provider || '');
      const embModel = s?.ai?.embedding?.model || (emb.find(o => o.provider === embProvider)?.model || '');
      const genProvider = s?.ai?.generating?.provider || (gen[0]?.provider || '');
      const genModel = s?.ai?.generating?.model || (gen.find(o => o.provider === genProvider)?.model || '');
      return {
        ...s,
        ai: {
          ...(s.ai || {}),
          embedding: { ...(s.ai?.embedding || {}), provider: embProvider, model: embModel },
          generating: { ...(s.ai?.generating || {}), provider: genProvider, model: genModel }
        }
      };
    });
  };

  const loadForEdit = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/tenants/${tenantId}`, { headers: { 'X-Tenant-ID': getTenantId() } });
      if (r.ok) {
        const t = await r.json();
        setForm({ name: t.name || "", code: t.code || "", contact_email: t.contact_email || "", is_active: !!t.is_active });
        setSettings((s: any) => ({ ...s, ...(t.settings || {}) }));
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadAiPricing(); }, []);
  React.useEffect(() => { if (tenantId) loadForEdit(); /* eslint-disable-next-line */ }, [tenantId]);

  const save = async () => {
    setLoading(true);
    try {
      if (tenantId) {
        await fetch(`${BACKEND_URL}/api/admin/tenants/${tenantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() },
          body: JSON.stringify({ ...form, settings })
        });
      } else {
        await fetch(`${BACKEND_URL}/api/admin/tenants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() },
          body: JSON.stringify({ ...form, settings })
        });
      }
      router.push('/admin/tenants');
    } finally { setLoading(false); }
  };

  return (
    <div className="grid gap-6">
      <section className="border rounded p-4 space-y-3">
        <div className="font-medium">General</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm">Name
              <input className="mt-1 w-full border rounded px-2 py-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="text-sm">Code
              <input className="mt-1 w-full border rounded px-2 py-1" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="AA1234" />
            </label>
            <label className="text-sm">Contact Email
              <input type="email" className="mt-1 w-full border rounded px-2 py-1" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
            </label>
          </div>
          <div className="space-y-3">
            <label className="text-sm">Default Language
              <select className="mt-1 w-full border rounded px-2 py-1" value={settings.profile?.defaultLanguage || 'en'} onChange={e => setSettings((s: any) => ({ ...s, profile: { ...(s.profile || {}), defaultLanguage: e.target.value } }))}>
                <option value="en">English</option>
                <option value="th">Thai</option>
              </select>
            </label>
            <label className="text-sm">Theme
              <select className="mt-1 w-full border rounded px-2 py-1" value={settings.profile?.theme || 'auto'} onChange={e => setSettings((s: any) => ({ ...s, profile: { ...(s.profile || {}), theme: e.target.value } }))}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </label>
            <label className="text-sm flex items-center gap-2">Status (Active)
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            </label>
          </div>
        </div>
      </section>

      <section className="border rounded p-4 space-y-3">
        <div className="font-medium">AI</div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Provider API Keys</div>
            <label className="text-sm">OpenAI API Key
              <input className="mt-1 w-full border rounded px-2 py-1" type="password" value={settings.ai?.providers?.openai?.apiKey || ''} onChange={e => setSettings((s: any) => ({ ...s, ai: { ...(s.ai || {}), providers: { ...(s.ai?.providers || {}), openai: { ...(s.ai?.providers?.openai || {}), apiKey: e.target.value } } } }))} />
            </label>
            <label className="text-sm">Anthropic API Key
              <input className="mt-1 w-full border rounded px-2 py-1" type="password" value={settings.ai?.providers?.anthropic?.apiKey || ''} onChange={e => setSettings((s: any) => ({ ...s, ai: { ...(s.ai || {}), providers: { ...(s.ai?.providers || {}), anthropic: { ...(s.ai?.providers?.anthropic || {}), apiKey: e.target.value } } } }))} />
            </label>
            <label className="text-sm">Google (Gemini) API Key
              <input className="mt-1 w-full border rounded px-2 py-1" type="password" value={settings.ai?.providers?.google?.apiKey || ''} onChange={e => setSettings((s: any) => ({ ...s, ai: { ...(s.ai || {}), providers: { ...(s.ai?.providers || {}), google: { ...(s.ai?.providers?.google || {}), apiKey: e.target.value } } } }))} />
            </label>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Embedding</div>
            <label className="text-sm">Provider
              <select className="mt-1 w-full border rounded px-2 py-1" value={settings.ai?.embedding?.provider || ''} onChange={e => {
                const newProvider = e.target.value;
                const firstModel = embeddingOptions.find(o => o.provider === newProvider)?.model || '';
                setSettings((s: any) => ({ ...s, ai: { ...(s.ai || {}), embedding: { ...(s.ai?.embedding || {}), provider: newProvider, model: firstModel } } }));
              }}>
                {[...new Set(embeddingOptions.map(o => o.provider))].map(p => (<option key={p} value={p}>{p}</option>))}
              </select>
            </label>
            <label className="text-sm">Model
              <select className="mt-1 w-full border rounded px-2 py-1" value={settings.ai?.embedding?.model || ''} onChange={e => setSettings((s: any) => ({ ...s, ai: { ...(s.ai || {}), embedding: { ...(s.ai?.embedding || {}), model: e.target.value } } }))}>
                {embeddingOptions.filter(o => o.provider === settings.ai?.embedding?.provider).map(o => (<option key={`${o.provider}:${o.model}`} value={o.model}>{o.model}</option>))}
              </select>
            </label>

            <div className="text-sm font-medium pt-2">Generating</div>
            <label className="text-sm">Provider
              <select className="mt-1 w-full border rounded px-2 py-1" value={settings.ai?.generating?.provider || ''} onChange={e => {
                const newProvider = e.target.value;
                const firstModel = generatingOptions.find(o => o.provider === newProvider)?.model || '';
                setSettings((s: any) => ({ ...s, ai: { ...(s.ai || {}), generating: { ...(s.ai?.generating || {}), provider: newProvider, model: firstModel } } }));
              }}>
                {[...new Set(generatingOptions.map(o => o.provider))].map(p => (<option key={p} value={p}>{p}</option>))}
              </select>
            </label>
            <label className="text-sm">Model
              <select className="mt-1 w-full border rounded px-2 py-1" value={settings.ai?.generating?.model || ''} onChange={e => setSettings((s: any) => ({ ...s, ai: { ...(s.ai || {}), generating: { ...(s.ai?.generating || {}), model: e.target.value } } }))}>
                {generatingOptions.filter(o => o.provider === settings.ai?.generating?.provider).map(o => (<option key={`${o.provider}:${o.model}`} value={o.model}>{o.model}</option>))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Max Tokens
                <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={settings.ai?.generating?.maxTokens || 0} onChange={e => setSettings((s: any) => ({ ...s, ai: { ...(s.ai || {}), generating: { ...(s.ai?.generating || {}), maxTokens: parseInt(e.target.value) || 0 } } }))} />
              </label>
              <label className="text-sm">Temperature
                <input type="number" step="0.01" className="mt-1 w-full border rounded px-2 py-1" value={settings.ai?.generating?.temperature || 0} onChange={e => setSettings((s: any) => ({ ...s, ai: { ...(s.ai || {}), generating: { ...(s.ai?.generating || {}), temperature: parseFloat(e.target.value) || 0 } } }))} />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="border rounded p-4 space-y-3">
        <div className="font-medium">API</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm flex items-center gap-2">Enabled
              <input type="checkbox" checked={!!settings.api?.enabled} onChange={e => setSettings((s: any) => ({ ...s, api: { ...(s.api || {}), enabled: e.target.checked } }))} />
            </label>
            <label className="text-sm">Rate limit / minute
              <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={settings.api?.rateLimitPerMinute || 0} onChange={e => setSettings((s: any) => ({ ...s, api: { ...(s.api || {}), rateLimitPerMinute: parseInt(e.target.value) || 0 } }))} />
            </label>
            <label className="text-sm">Rate limit / day
              <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={settings.api?.rateLimitPerDay || 0} onChange={e => setSettings((s: any) => ({ ...s, api: { ...(s.api || {}), rateLimitPerDay: parseInt(e.target.value) || 0 } }))} />
            </label>
            <label className="text-sm">Allowed Origins (comma separated)
              <input className="mt-1 w-full border rounded px-2 py-1" value={(settings.api?.allowedOrigins || []).join(', ')} onChange={e => setSettings((s: any) => ({ ...s, api: { ...(s.api || {}), allowedOrigins: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) } }))} />
            </label>
          </div>
          <div className="space-y-3">
            <label className="text-sm">Allowed Origins (comma separated)
              <input className="mt-1 w-full border rounded px-2 py-1" value={(settings.api?.allowedOrigins || []).join(', ')} onChange={e => setSettings((s: any) => ({ ...s, api: { ...(s.api || {}), allowedOrigins: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) } }))} />
            </label>
            <label className="text-sm">IP Allowlist (comma separated)
              <input className="mt-1 w-full border rounded px-2 py-1" value={(settings.api?.ipAllowlist || []).join(', ')} onChange={e => setSettings((s: any) => ({ ...s, api: { ...(s.api || {}), ipAllowlist: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) } }))} />
            </label>
            <label className="text-sm">Webhook Endpoint
              <input className="mt-1 w-full border rounded px-2 py-1" value={settings.api?.webhookEndpoint || ''} onChange={e => setSettings((s: any) => ({ ...s, api: { ...(s.api || {}), webhookEndpoint: e.target.value } }))} />
            </label>
            <label className="text-sm">Webhook Secret
              <input className="mt-1 w-full border rounded px-2 py-1" type="password" value={settings.api?.webhookSecret || ''} onChange={e => setSettings((s: any) => ({ ...s, api: { ...(s.api || {}), webhookSecret: e.target.value } }))} />
            </label>
          </div>
        </div>
      </section>

      <section className="border rounded p-4 space-y-3">
        <div className="font-medium">Integrations</div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">Google Maps API Key
            <input className="mt-1 w-full border rounded px-2 py-1" value={settings.integrations?.googleMapsApiKey || ''} onChange={e => setSettings((s: any) => ({ ...s, integrations: { ...(s.integrations || {}), googleMapsApiKey: e.target.value } }))} />
          </label>
          <label className="text-sm">Firecrawl API Key
            <input className="mt-1 w-full border rounded px-2 py-1" value={settings.integrations?.firecrawlApiKey || ''} onChange={e => setSettings((s: any) => ({ ...s, integrations: { ...(s.integrations || {}), firecrawlApiKey: e.target.value } }))} />
          </label>
        </div>
      </section>

      <div className="flex gap-2">
        <button onClick={save} disabled={loading} className="h-9 px-4 rounded bg-black text-white">Save</button>
        <button onClick={() => router.push('/admin/tenants')} className="h-9 px-4 rounded border">Cancel</button>
      </div>
    </div>
  );
}


