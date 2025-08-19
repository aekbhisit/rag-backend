"use client";

import React from "react";
import { Card, CardBody, CardHeader } from "../../../components/Card";
import { BACKEND_URL } from "../../../components/config";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/Button";
import { Badge } from "../../../components/ui/Badge";
import { Textarea } from "../../../components/ui/Textarea";
import { useDialog } from "../../../components/ui/DialogProvider";
import { TIMEZONE_OPTIONS, formatDateForTable } from "../../../utils/timezone";

type AppSettings = {
  appName: string;
  appVersion: string;
  defaultLanguage: string;
  theme: "light" | "dark" | "auto";
  timezone: string;
  maxQueryLength: number;
  defaultTrustLevel: number;
  enableAnalytics: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
  apiRateLimit: number;
  supportEmail: string;
  maintenanceMode: boolean;
  debugMode: boolean;
};

type TenantSettings = {
  tenantId: string;
  tenantName: string;
  maxContexts: number;
  maxUsers: number;
  allowedDomains: string[];
  customInstructions: string;
  webhookUrl: string;
  apiKeys: Array<{ id: string; name: string; created: string; lastUsed?: string }>;
};

type AIModelSettings = {
  embeddingProvider: string;
  embeddingModel: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  dimensions: number;
  batchSize: number;
  timeout: number;
  retryAttempts: number;
  fallbackProvider?: string;
  fallbackModel?: string;
  fallbackApiKey?: string;
};

type GeneratingModelSettings = {
  provider: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retryAttempts: number;
};

const embeddingProviders = [
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "text-embedding-3-large", name: "Text Embedding 3 Large", dimensions: 3072, maxTokens: 8191 },
      { id: "text-embedding-3-small", name: "Text Embedding 3 Small", dimensions: 1536, maxTokens: 8191 },
      { id: "text-embedding-ada-002", name: "Text Embedding Ada 002", dimensions: 1536, maxTokens: 8191 }
    ]
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    models: [
      { id: "text-embedding-3-large", name: "Text Embedding 3 Large", dimensions: 3072, maxTokens: 8191 },
      { id: "text-embedding-3-small", name: "Text Embedding 3 Small", dimensions: 1536, maxTokens: 8191 },
      { id: "text-embedding-ada-002", name: "Text Embedding Ada 002", dimensions: 1536, maxTokens: 8191 }
    ]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      { id: "claude-3-embedding", name: "Claude 3 Embedding", dimensions: 1024, maxTokens: 4096 }
    ]
  },
  {
    id: "cohere",
    name: "Cohere",
    models: [
      { id: "embed-english-v3.0", name: "Embed English v3.0", dimensions: 1024, maxTokens: 512 },
      { id: "embed-multilingual-v3.0", name: "Embed Multilingual v3.0", dimensions: 1024, maxTokens: 512 }
    ]
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    models: [
      { id: "sentence-transformers/all-MiniLM-L6-v2", name: "All MiniLM L6 v2", dimensions: 384, maxTokens: 256 },
      { id: "sentence-transformers/all-mpnet-base-v2", name: "All MPNet Base v2", dimensions: 768, maxTokens: 384 }
    ]
  }
];

const generatingProviders = [
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-5-mini", name: "GPT-5 mini" },
      { id: "gpt-5", name: "GPT-5" },
      { id: "gpt-4o-mini", name: "GPT-4o mini" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 mini" }
    ]
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o (deployment)" },
      { id: "gpt-35-turbo", name: "GPT-3.5 Turbo (legacy)" }
    ]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-haiku", name: "Claude 3 Haiku" }
    ]
  },
  {
    id: "google",
    name: "Google",
    models: [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" }
    ]
  }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<"app" | "tenant" | "security" | "aimodel" | "generating" | "integrations">("app");
  const [loading, setLoading] = React.useState(false);
  const [appSettings, setAppSettings] = React.useState<AppSettings>({
    appName: "RAG Assistant",
    appVersion: "1.0.0",
    defaultLanguage: "en",
    theme: "auto",
    timezone: "Asia/Bangkok",
    maxQueryLength: 1000,
    defaultTrustLevel: 3,
    enableAnalytics: true,
    enableCaching: true,
    cacheTimeout: 300,
    apiRateLimit: 100,
    supportEmail: "support@example.com",
    maintenanceMode: false,
    debugMode: false
  });

  const [tenantSettings, setTenantSettings] = React.useState<TenantSettings>({
    tenantId: typeof window !== 'undefined' ? (localStorage.getItem('tenantId') || '') : '',
    tenantName: "Default Tenant",
    maxContexts: 10000,
    maxUsers: 100,
    allowedDomains: ["example.com", "*.example.com"],
    customInstructions: "Always be helpful and accurate. Provide citations when possible.",
    webhookUrl: "",
    apiKeys: []
  });

  const [aiModelSettings, setAiModelSettings] = React.useState<AIModelSettings>({
    embeddingProvider: "openai",
    embeddingModel: "text-embedding-3-small",
    apiKey: "",
    maxTokens: 8191,
    temperature: 0,
    dimensions: 1536,
    batchSize: 100,
    timeout: 30000,
    retryAttempts: 3,
    fallbackProvider: "",
    fallbackModel: "",
    fallbackApiKey: ""
  });

  const [generatingSettings, setGeneratingSettings] = React.useState<GeneratingModelSettings>({
    provider: "openai",
    model: "gpt-4o-mini",
    apiKey: "",
    maxTokens: 2048,
    temperature: 0.2,
    timeout: 30000,
    retryAttempts: 3
  });

  const dialog = useDialog();

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/admin/settings`, {
          headers: { "X-Tenant-ID": tenantSettings.tenantId }
        });
        if (res.ok) {
          const data = await res.json();
          const s = data.tenant?.settings || {};
          if (s.app) setAppSettings((prev) => ({ ...prev, ...s.app }));
          if (s.tenant) setTenantSettings((prev) => ({
            ...prev,
            ...s.tenant,
            apiKeys: Array.isArray(s.tenant?.apiKeys) ? s.tenant.apiKeys : []
          }));
          if (s.aiModel) {
            // Support namespaced structure: { embedding: {...}, generating: {...} }
            if (s.aiModel.embedding) {
              setAiModelSettings((prev) => ({ ...prev, ...s.aiModel.embedding }));
            } else {
              // Backward-compat: flat structure
              setAiModelSettings((prev) => ({ ...prev, ...s.aiModel }));
            }
            if (s.aiModel.generating) {
              setGeneratingSettings((prev) => ({ ...prev, ...s.aiModel.generating }));
            }
          }
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateAppSetting = (key: keyof AppSettings, value: any) => {
    setAppSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateTenantSetting = (key: keyof TenantSettings, value: any) => {
    setTenantSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAiModelSetting = (key: keyof AIModelSettings, value: any) => {
    setAiModelSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const payload = {
        settings: {
          app: appSettings,
          tenant: tenantSettings,
          aiModel: {
            embedding: aiModelSettings,
            generating: generatingSettings,
          },
        }
      };
      const res = await fetch(`${BACKEND_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantSettings.tenantId,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      await dialog.alert({ title: 'Saved', description: 'Settings saved successfully!' });
    } catch (error) {
      console.error("Failed to save settings:", error);
      await dialog.alert({ title: 'Save Failed', description: 'Failed to save settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const newKey = {
      id: Date.now().toString(),
      name: `API Key ${tenantSettings.apiKeys.length + 1}`,
      created: new Date().toISOString()
    };
    setTenantSettings(prev => ({
      ...prev,
      apiKeys: [...prev.apiKeys, newKey]
    }));
  };

  const revokeApiKey = async (keyId: string) => {
    const ok = await dialog.confirm({ title: 'Revoke API key', description: 'Are you sure you want to revoke this API key? This action cannot be undone.', confirmText: 'Revoke', variant: 'danger' });
    if (!ok) return;
    
    setTenantSettings(prev => ({
      ...prev,
      apiKeys: prev.apiKeys.filter(key => key.id !== keyId)
    }));
  };

  const formatDate = (dateString: string) => {
    return formatDateForTable(dateString);
  };

  const tabs = [
    { id: "app" as const, label: "Application", icon: "⚙️" },
    { id: "tenant" as const, label: "Tenant", icon: "🏢" },
    { id: "aimodel" as const, label: "AI Models (Embedding)", icon: "🧩" },
    { id: "generating" as const, label: "Models (Generating)", icon: "📝" },
    { id: "integrations" as const, label: "Integrations", icon: "🧰" },
    { id: "security" as const, label: "Security", icon: "🔒" }
  ];

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Button onClick={saveSettings} loading={loading}>
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Settings
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[color:var(--border)]">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-[color:var(--primary)] text-[color:var(--primary)]'
                  : 'border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:border-[color:var(--border)]'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* App Settings Tab */}
      {activeTab === "app" && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>General Settings</CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Application Name"
                value={appSettings.appName}
                onChange={(e) => updateAppSetting("appName", e.target.value)}
              />
              <Input
                label="Version"
                value={appSettings.appVersion}
                onChange={(e) => updateAppSetting("appVersion", e.target.value)}
                hint="Current application version"
              />
              <Select
                label="Default Language"
                value={appSettings.defaultLanguage}
                onChange={(e) => updateAppSetting("defaultLanguage", e.target.value)}
                options={[
                  { value: "en", label: "English" },
                  { value: "th", label: "Thai" },
                  { value: "auto", label: "Auto-detect" }
                ]}
              />
              <Select
                label="Theme"
                value={appSettings.theme}
                onChange={(e) => updateAppSetting("theme", e.target.value)}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "auto", label: "Auto (System)" }
                ]}
              />
              <Select
                label="Timezone"
                value={appSettings.timezone}
                onChange={(e) => updateAppSetting("timezone", e.target.value)}
                options={TIMEZONE_OPTIONS}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Performance Settings</CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Max Query Length"
                type="number"
                value={appSettings.maxQueryLength}
                onChange={(e) => updateAppSetting("maxQueryLength", parseInt(e.target.value))}
                hint="Maximum characters allowed in a single query"
              />
              <Select
                label="Default Trust Level"
                value={String(appSettings.defaultTrustLevel)}
                onChange={(e) => updateAppSetting("defaultTrustLevel", parseInt(e.target.value))}
                options={[
                  { value: "1", label: "1 - Low" },
                  { value: "2", label: "2 - Medium" },
                  { value: "3", label: "3 - High" },
                  { value: "4", label: "4 - Verified" },
                  { value: "5", label: "5 - Official" }
                ]}
              />
              <Input
                label="Cache Timeout (seconds)"
                type="number"
                value={appSettings.cacheTimeout}
                onChange={(e) => updateAppSetting("cacheTimeout", parseInt(e.target.value))}
                hint="How long to cache query results"
              />
              <Input
                label="API Rate Limit (requests/minute)"
                type="number"
                value={appSettings.apiRateLimit}
                onChange={(e) => updateAppSetting("apiRateLimit", parseInt(e.target.value))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>System Settings</CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Support Email"
                type="email"
                value={appSettings.supportEmail}
                onChange={(e) => updateAppSetting("supportEmail", e.target.value)}
              />
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={appSettings.enableAnalytics}
                    onChange={(e) => updateAppSetting("enableAnalytics", e.target.checked)}
                    className="rounded border-[color:var(--border)]"
                  />
                  <span className="text-sm font-medium">Enable Analytics</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={appSettings.enableCaching}
                    onChange={(e) => updateAppSetting("enableCaching", e.target.checked)}
                    className="rounded border-[color:var(--border)]"
                  />
                  <span className="text-sm font-medium">Enable Caching</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={appSettings.maintenanceMode}
                    onChange={(e) => updateAppSetting("maintenanceMode", e.target.checked)}
                    className="rounded border-[color:var(--border)]"
                  />
                  <span className="text-sm font-medium">Maintenance Mode</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={appSettings.debugMode}
                    onChange={(e) => updateAppSetting("debugMode", e.target.checked)}
                    className="rounded border-[color:var(--border)]"
                  />
                  <span className="text-sm font-medium">Debug Mode</span>
                </label>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tenant Settings Tab */}
      {activeTab === "tenant" && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>Tenant Information</CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Tenant ID"
                value={tenantSettings.tenantId}
                disabled
                hint="Unique identifier for this tenant"
              />
              <Input
                label="Tenant Name"
                value={tenantSettings.tenantName}
                onChange={(e) => updateTenantSetting("tenantName", e.target.value)}
              />
              <Input
                label="Max Contexts"
                type="number"
                value={tenantSettings.maxContexts}
                onChange={(e) => updateTenantSetting("maxContexts", parseInt(e.target.value))}
                hint="Maximum number of contexts allowed"
              />
              <Input
                label="Max Users"
                type="number"
                value={tenantSettings.maxUsers}
                onChange={(e) => updateTenantSetting("maxUsers", parseInt(e.target.value))}
                hint="Maximum number of users allowed"
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Configuration</CardHeader>
            <CardBody className="space-y-4">
              <Textarea
                label="Allowed Domains"
                value={tenantSettings.allowedDomains.join("\n")}
                onChange={(e) => updateTenantSetting("allowedDomains", e.target.value.split("\n").filter(d => d.trim()))}
                rows={3}
                hint="One domain per line. Use * for wildcards."
              />
              <Textarea
                label="Custom Instructions"
                value={tenantSettings.customInstructions}
                onChange={(e) => updateTenantSetting("customInstructions", e.target.value)}
                rows={4}
                hint="Default instructions for AI responses"
              />
              <Input
                label="Webhook URL"
                value={tenantSettings.webhookUrl}
                onChange={(e) => updateTenantSetting("webhookUrl", e.target.value)}
                placeholder="https://your-domain.com/webhook"
                hint="Optional webhook for notifications"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* AI Models Settings Tab */}
      {activeTab === "aimodel" && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>Embedding Model Configuration</CardHeader>
            <CardBody className="space-y-4">
              <Select
                label="Provider"
                value={aiModelSettings.embeddingProvider}
                onChange={(e) => {
                  const provider = embeddingProviders.find(p => p.id === e.target.value);
                  const defaultModel = provider?.models[0];
                  updateAiModelSetting("embeddingProvider", e.target.value);
                  if (defaultModel) {
                    updateAiModelSetting("embeddingModel", defaultModel.id);
                    updateAiModelSetting("dimensions", defaultModel.dimensions);
                    updateAiModelSetting("maxTokens", defaultModel.maxTokens);
                  }
                }}
                options={embeddingProviders.map(provider => ({
                  value: provider.id,
                  label: provider.name
                }))}
                hint="Choose your embedding model provider"
              />
              
              <Select
                label="Model"
                value={aiModelSettings.embeddingModel}
                onChange={(e) => {
                  const provider = embeddingProviders.find(p => p.id === aiModelSettings.embeddingProvider);
                  const model = provider?.models.find(m => m.id === e.target.value);
                  updateAiModelSetting("embeddingModel", e.target.value);
                  if (model) {
                    updateAiModelSetting("dimensions", model.dimensions);
                    updateAiModelSetting("maxTokens", model.maxTokens);
                  }
                }}
                options={
                  embeddingProviders
                    .find(p => p.id === aiModelSettings.embeddingProvider)
                    ?.models.map(model => ({
                      value: model.id,
                      label: `${model.name} (${model.dimensions}d)`
                    })) || []
                }
                hint="Select the specific embedding model"
              />

              <Input
                label="API Key"
                type="password"
                value={aiModelSettings.apiKey}
                onChange={(e) => updateAiModelSetting("apiKey", e.target.value)}
                placeholder="sk-..."
                hint="Your API key for the selected provider"
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2H7v-2H4a1 1 0 01-1-1v-4c0-5.523 4.477-10 10-10s10 4.477 10 10a4 4 0 01-4 4z" />
                  </svg>
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Dimensions"
                  type="number"
                  value={aiModelSettings.dimensions}
                  onChange={(e) => updateAiModelSetting("dimensions", parseInt(e.target.value))}
                  hint="Vector dimensions"
                  disabled
                />
                <Input
                  label="Max Tokens"
                  type="number"
                  value={aiModelSettings.maxTokens}
                  onChange={(e) => updateAiModelSetting("maxTokens", parseInt(e.target.value))}
                  hint="Maximum input tokens"
                  disabled
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Advanced Settings</CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Batch Size"
                type="number"
                value={aiModelSettings.batchSize}
                onChange={(e) => updateAiModelSetting("batchSize", parseInt(e.target.value))}
                hint="Number of texts to process in one batch"
                min="1"
                max="1000"
              />
              
              <Input
                label="Timeout (ms)"
                type="number"
                value={aiModelSettings.timeout}
                onChange={(e) => updateAiModelSetting("timeout", parseInt(e.target.value))}
                hint="Request timeout in milliseconds"
                min="1000"
                max="300000"
              />
              
              <Input
                label="Retry Attempts"
                type="number"
                value={aiModelSettings.retryAttempts}
                onChange={(e) => updateAiModelSetting("retryAttempts", parseInt(e.target.value))}
                hint="Number of retry attempts on failure"
                min="0"
                max="10"
              />

              <div className="pt-4 border-t border-[color:var(--border)]">
                <h4 className="text-sm font-medium text-[color:var(--text)] mb-3">Test Connection</h4>
                <Button
                  variant="outline"
                  onClick={async () => {
                    console.log("Testing embedding connection...");
                    // Mock test
                    await dialog.alert({ title: 'Connection Test', description: 'Connection test successful!' });
                  }}
                  className="w-full"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Connection
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Fallback Configuration</CardHeader>
            <CardBody className="space-y-4">
              <Select
                label="Fallback Provider"
                value={aiModelSettings.fallbackProvider || ""}
                onChange={(e) => {
                  const provider = embeddingProviders.find(p => p.id === e.target.value);
                  const defaultModel = provider?.models[0];
                  updateAiModelSetting("fallbackProvider", e.target.value);
                  if (defaultModel) {
                    updateAiModelSetting("fallbackModel", defaultModel.id);
                  }
                }}
                options={[
                  { value: "", label: "No fallback" },
                  ...embeddingProviders
                    .filter(p => p.id !== aiModelSettings.embeddingProvider)
                    .map(provider => ({
                      value: provider.id,
                      label: provider.name
                    }))
                ]}
                hint="Backup provider if primary fails"
              />
              
              {aiModelSettings.fallbackProvider && (
                <>
                  <Select
                    label="Fallback Model"
                    value={aiModelSettings.fallbackModel || ""}
                    onChange={(e) => updateAiModelSetting("fallbackModel", e.target.value)}
                    options={
                      embeddingProviders
                        .find(p => p.id === aiModelSettings.fallbackProvider)
                        ?.models.map(model => ({
                          value: model.id,
                          label: `${model.name} (${model.dimensions}d)`
                        })) || []
                    }
                    hint="Fallback model to use"
                  />

                  <Input
                    label="Fallback API Key"
                    type="password"
                    value={aiModelSettings.fallbackApiKey || ""}
                    onChange={(e) => updateAiModelSetting("fallbackApiKey", e.target.value)}
                    placeholder="sk-..."
                    hint="API key for fallback provider"
                    leftIcon={
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2H7v-2H4a1 1 0 01-1-1v-4c0-5.523 4.477-10 10-10s10 4.477 10 10a4 4 0 01-4 4z" />
                      </svg>
                    }
                  />
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Model Information</CardHeader>
            <CardBody>
              {(() => {
                const provider = embeddingProviders.find(p => p.id === aiModelSettings.embeddingProvider);
                const model = provider?.models.find(m => m.id === aiModelSettings.embeddingModel);
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-[color:var(--text)]">Provider:</span>
                        <div className="text-[color:var(--text-muted)]">{provider?.name}</div>
                      </div>
                      <div>
                        <span className="font-medium text-[color:var(--text)]">Model:</span>
                        <div className="text-[color:var(--text-muted)]">{model?.name}</div>
                      </div>
                      <div>
                        <span className="font-medium text-[color:var(--text)]">Dimensions:</span>
                        <div className="text-[color:var(--text-muted)]">{model?.dimensions}</div>
                      </div>
                      <div>
                        <span className="font-medium text-[color:var(--text)]">Max Tokens:</span>
                        <div className="text-[color:var(--text-muted)]">{model?.maxTokens}</div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-[color:var(--border)]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-[color:var(--text-muted)]">
                          {aiModelSettings.apiKey ? "API Key configured" : "API Key required"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Generating Models Settings Tab */}
      {activeTab === "generating" && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>Generating Model Configuration</CardHeader>
            <CardBody className="space-y-4">
              <Select
                label="Provider"
                value={generatingSettings.provider}
                onChange={(e) => {
                  const provider = generatingProviders.find(p => p.id === e.target.value);
                  const defaultModel = provider?.models[0];
                  setGeneratingSettings(prev => ({
                    ...prev,
                    provider: e.target.value,
                    model: defaultModel?.id || prev.model,
                  }));
                }}
                options={generatingProviders.map(provider => ({
                  value: provider.id,
                  label: provider.name
                }))}
                hint="Choose your generating model provider"
              />

              <Select
                label="Model"
                value={generatingSettings.model}
                onChange={(e) => {
                  setGeneratingSettings(prev => ({ ...prev, model: e.target.value }));
                }}
                options={
                  generatingProviders
                    .find(p => p.id === generatingSettings.provider)
                    ?.models.map(model => ({
                      value: model.id,
                      label: model.name
                    })) || []
                }
                hint="Select the specific generating model"
              />

              <Input
                label="API Key"
                type="password"
                value={generatingSettings.apiKey}
                onChange={(e) => setGeneratingSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                hint="Your API key for the selected provider"
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2H7v-2H4a1 1 0 01-1-1v-4c0-5.523 4.477-10 10-10s10 4.477 10 10a4 4 0 01-4 4z" />
                  </svg>
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Max Tokens"
                  type="number"
                  value={generatingSettings.maxTokens}
                  onChange={(e) => setGeneratingSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 0 }))}
                  hint="Maximum output tokens"
                />
                <Input
                  label="Temperature"
                  type="number"
                  value={generatingSettings.temperature}
                  onChange={(e) => setGeneratingSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
                  hint="Creativity vs determinism"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Timeout (ms)"
                  type="number"
                  value={generatingSettings.timeout}
                  onChange={(e) => setGeneratingSettings(prev => ({ ...prev, timeout: parseInt(e.target.value) || 0 }))}
                  hint="Request timeout in milliseconds"
                />
                <Input
                  label="Retry Attempts"
                  type="number"
                  value={generatingSettings.retryAttempts}
                  onChange={(e) => setGeneratingSettings(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) || 0 }))}
                  hint="Number of retry attempts on failure"
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Model Notes</CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
                <div>• Generating model is used for summarization and content generation.</div>
                <div>• Keep API keys secure; keys are stored in tenant settings JSON.</div>
                <div>• Ensure provider quotas and limits are configured appropriately.</div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Security Settings Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <span>API Keys</span>
                <Button onClick={generateApiKey} size="sm">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Generate Key
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {tenantSettings.apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 border border-[color:var(--border)] rounded-lg">
                    <div>
                      <div className="font-medium">{key.name}</div>
                      <div className="text-sm text-[color:var(--text-muted)]">
                        Created: {formatDate(key.created)}
                        {key.lastUsed && ` • Last used: ${formatDate(key.lastUsed)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={key.lastUsed ? "success" : "default"}>
                        {key.lastUsed ? "Active" : "Unused"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeApiKey(key.id)}
                        className="text-[color:var(--error)]"
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Security Policies</CardHeader>
            <CardBody className="space-y-4">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Password Policy</label>
                  <div className="text-sm text-[color:var(--text-muted)]">
                    • Minimum 8 characters<br/>
                    • At least 1 uppercase letter<br/>
                    • At least 1 number<br/>
                    • At least 1 special character
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Session Settings</label>
                  <div className="text-sm text-[color:var(--text-muted)]">
                    • Session timeout: 24 hours<br/>
                    • Remember me: 30 days<br/>
                    • Max concurrent sessions: 3
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Audit Log</CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[color:var(--surface-muted)] rounded-lg">
                  <div>
                    <div className="font-medium">Settings updated</div>
                    <div className="text-sm text-[color:var(--text-muted)]">Admin User • 2 hours ago</div>
                  </div>
                  <Badge variant="info">Update</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-[color:var(--surface-muted)] rounded-lg">
                  <div>
                    <div className="font-medium">API key generated</div>
                    <div className="text-sm text-[color:var(--text-muted)]">Admin User • 1 day ago</div>
                  </div>
                  <Badge variant="success">Create</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-[color:var(--surface-muted)] rounded-lg">
                  <div>
                    <div className="font-medium">User role changed</div>
                    <div className="text-sm text-[color:var(--text-muted)]">Admin User • 3 days ago</div>
                  </div>
                  <Badge variant="warning">Modify</Badge>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>Google Maps</CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Google Maps API Key"
                type="password"
                value={(tenantSettings as any)?.integrations?.googleMapsApiKey || ""}
                onChange={(e) => {
                  setTenantSettings(prev => ({
                    ...prev,
                    integrations: {
                      ...(prev as any).integrations,
                      googleMapsApiKey: e.target.value,
                    },
                  }) as any);
                }}
                placeholder="AIza..."
                hint="Used for map picker and place lookups"
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Firecrawl</CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Firecrawl API Key"
                type="password"
                value={(tenantSettings as any)?.integrations?.firecrawlApiKey || ""}
                onChange={(e) => {
                  setTenantSettings(prev => ({
                    ...prev,
                    integrations: {
                      ...(prev as any).integrations,
                      firecrawlApiKey: e.target.value,
                    },
                  }) as any);
                }}
                placeholder="fc_sk_..."
                hint="Optional. Used to improve website scraping quality."
              />
            </CardBody>
          </Card>
        </div>
      )}
    </main>
  );
}