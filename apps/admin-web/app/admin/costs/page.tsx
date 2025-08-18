"use client";

import React from "react";
import { Card, CardBody, CardHeader } from "../../../components/Card";
import { LineChart } from "../../../components/charts/LineChart";
import { BarChart } from "../../../components/charts/Bar";
import { Table } from "../../../components/ui/Table";
import { Button } from "../../../components/Button";
import { Select } from "../../../components/ui/Select";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/Badge";
import { BACKEND_URL, DEFAULT_TENANT_ID } from "../../../components/config";

type CostSummary = {
  totalCost: number;
  totalTokens: number;
  avgCostPerToken: number;
  totalEmbeddings: number;
  costTrend: Array<{ label: string; value: number }>;
  tokenTrend: Array<{ label: string; value: number }>;
  modelUsage: Array<{ model: string; tokens: number; cost: number; percentage: number }>;
  providerUsage?: Array<{ provider: string; tokens: number; cost: number; percentage: number }>;
};

type EmbeddingHistory = {
  id: string;
  contextName: string;
  contextId: string;
  embeddingModel: string;
  tokensUsed: number;
  cost: number;
  timestamp: string;
  status: "success" | "failed" | "pending";
  processingTime?: number;
};

type GenerationHistory = {
  id: string;
  name: string;
  model: string;
  provider: string;
  tokensUsed: number;
  cost: number;
  timestamp: string;
  status: "success" | "failed" | "pending";
  processingTime?: number;
};

type ExpensiveCall = {
  id: string;
  operation: string;
  name: string;
  model: string;
  provider: string;
  tokensUsed: number;
  cost: number;
  timestamp: string;
  trace_id?: string | null;
};

export default function CostSummaryPage() {
  const [timeRange, setTimeRange] = React.useState("7d");
  const [modelFilter, setModelFilter] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<string>("timestamp");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");

  const [costSummary, setCostSummary] = React.useState<CostSummary>({
    totalCost: 127.45,
    totalTokens: 2847650,
    avgCostPerToken: 0.0000448,
    totalEmbeddings: 1247,
    costTrend: [
      { label: "Jan 1", value: 12.34 },
      { label: "Jan 8", value: 15.67 },
      { label: "Jan 15", value: 18.92 },
      { label: "Jan 22", value: 22.15 },
      { label: "Jan 29", value: 19.83 },
      { label: "Feb 5", value: 25.47 },
      { label: "Feb 12", value: 13.07 }
    ],
    tokenTrend: [
      { label: "Jan 1", value: 245000 },
      { label: "Jan 8", value: 312000 },
      { label: "Jan 15", value: 378000 },
      { label: "Jan 22", value: 441000 },
      { label: "Jan 29", value: 395000 },
      { label: "Feb 5", value: 507000 },
      { label: "Feb 12", value: 260000 }
    ],
    modelUsage: [
      { model: "text-embedding-ada-002", tokens: 1847650, cost: 92.38, percentage: 64.9 },
      { model: "text-embedding-3-small", tokens: 650000, cost: 26.00, percentage: 22.8 },
      { model: "text-embedding-3-large", tokens: 350000, cost: 9.07, percentage: 12.3 }
    ]
  });

  const [embeddingHistory, setEmbeddingHistory] = React.useState<EmbeddingHistory[]>([]);
  const [generationHistory, setGenerationHistory] = React.useState<GenerationHistory[]>([]);
  const [topExpensive, setTopExpensive] = React.useState<ExpensiveCall[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', timeRange);
      if (modelFilter) params.set('model', modelFilter);
      if (providerFilter) params.set('provider', providerFilter);
      const r = await fetch(`${BACKEND_URL}/api/admin/costs/summary?${params.toString()}`, {
        headers: { 'X-Tenant-ID': DEFAULT_TENANT_ID }
      });
      if (r.ok) {
        const data = await r.json();
        const s = data.summary || {};
        setCostSummary({
          totalCost: s.totalCost || 0,
          totalTokens: s.totalTokens || 0,
          avgCostPerToken: s.avgCostPerToken || 0,
          totalEmbeddings: s.totalEmbeddings || 0,
          costTrend: s.costTrend || [],
          tokenTrend: s.tokenTrend || [],
          modelUsage: s.modelUsage || [],
          providerUsage: s.providerUsage || [],
        });
        setEmbeddingHistory(data.embeddingHistory || []);
        setGenerationHistory(data.generationHistory || []);
        setTopExpensive(data.topExpensive || []);
      }
    } catch (error) {
      console.error("Failed to fetch cost data:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [timeRange]);

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const filteredAndSortedHistory = React.useMemo(() => {
    let filtered = embeddingHistory.filter(entry => {
      const matchesSearch = !searchTerm || 
        entry.contextName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.embeddingModel.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesModel = !modelFilter || entry.embeddingModel === modelFilter;
      
      return matchesSearch && matchesModel;
    });

    return filtered.sort((a, b) => {
      const aVal = a[sortKey as keyof EmbeddingHistory];
      const bVal = b[sortKey as keyof EmbeddingHistory];
      
      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [embeddingHistory, searchTerm, modelFilter, sortKey, sortDirection]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "success": return "success";
      case "failed": return "error";
      case "pending": return "warning";
      default: return "default";
    }
  };

  const columns = [
    {
      key: "timestamp",
      title: "Date & Time",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm font-mono text-[color:var(--text-muted)]">
          {formatDate(value)}
        </span>
      )
    },
    {
      key: "contextName",
      title: "Context",
      sortable: true,
      render: (value: string, row: EmbeddingHistory) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-[color:var(--text-muted)] font-mono">
            ID: {row.contextId}
          </div>
        </div>
      )
    },
    {
      key: "embeddingModel",
      title: "Model",
      sortable: true,
      render: (value: string) => (
        <Badge variant="info" size="sm">
          {value}
        </Badge>
      )
    },
    {
      key: "tokensUsed",
      title: "Tokens",
      sortable: true,
      render: (value: number) => (
        <span className="font-mono text-sm">
          {formatNumber(value)}
        </span>
      )
    },
    {
      key: "cost",
      title: "Cost",
      sortable: true,
      render: (value: number) => (
        <span className="font-mono text-sm font-medium">
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: "processingTime",
      title: "Processing Time",
      render: (value: number) => (
        <span className="text-sm text-[color:var(--text-muted)]">
          {value ? `${value}s` : "—"}
        </span>
      )
    },
    {
      key: "status",
      title: "Status",
      sortable: true,
      render: (value: string) => (
        <Badge variant={getStatusBadgeVariant(value)}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      )
    }
  ];

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Cost Summary</h1>
        <div className="flex gap-3">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
              { value: "1y", label: "Last year" }
            ]}
          />
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          <Button variant="outline">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>Total Cost</CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold text-[color:var(--primary)]">
              {formatCurrency(costSummary.totalCost)}
            </div>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">
              This period
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Total Tokens</CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold">
              {formatNumber(costSummary.totalTokens)}
            </div>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">
              Tokens processed
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Avg Cost/Token</CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold">
              {formatCurrency(costSummary.avgCostPerToken)}
            </div>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">
              Per token
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Total Embeddings</CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold">
              {formatNumber(costSummary.totalEmbeddings)}
            </div>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">
              Contexts processed
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>Cost Trend</CardHeader>
          <CardBody>
            <LineChart 
              data={costSummary.costTrend} 
              color="#10B981" 
              width={400} 
              height={200}
            />
            <p className="text-sm text-[color:var(--text-muted)] mt-2">
              Daily embedding costs over time
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Token Usage Trend</CardHeader>
          <CardBody>
            <LineChart 
              data={costSummary.tokenTrend} 
              color="#3B82F6" 
              width={400} 
              height={200}
            />
            <p className="text-sm text-[color:var(--text-muted)] mt-2">
              Daily token consumption
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Model & Provider Breakdown */}
      <Card>
        <CardHeader>Model Usage Breakdown</CardHeader>
        <CardBody>
          <div className="space-y-4">
            {costSummary.modelUsage.map((model) => (
              <div key={model.model} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="info">{model.model}</Badge>
                  <span className="text-sm text-[color:var(--text-muted)]">
                    {formatNumber(model.tokens)} tokens
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-[color:var(--surface-muted)] rounded-full h-2">
                    <div 
                      className="bg-[color:var(--primary)] h-2 rounded-full"
                      style={{ width: `${model.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {model.percentage.toFixed(1)}%
                  </span>
                  <span className="text-sm font-mono font-medium w-16 text-right">
                    {formatCurrency(model.cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Provider Usage Breakdown</CardHeader>
        <CardBody>
          <div className="space-y-4">
            {(costSummary.providerUsage || []).map((p) => (
              <div key={p.provider} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="default">{p.provider}</Badge>
                  <span className="text-sm text-[color:var(--text-muted)]">
                    {formatNumber(p.tokens)} tokens
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-[color:var(--surface-muted)] rounded-full h-2">
                    <div 
                      className="bg-[color:var(--primary)] h-2 rounded-full"
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {p.percentage.toFixed(1)}%
                  </span>
                  <span className="text-sm font-mono font-medium w-16 text-right">
                    {formatCurrency(p.cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          placeholder="Search contexts or models..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <Select
          placeholder="Filter by model"
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          options={[
            { value: "", label: "All Models" },
            { value: "text-embedding-ada-002", label: "text-embedding-ada-002" },
            { value: "text-embedding-3-small", label: "text-embedding-3-small" },
            { value: "text-embedding-3-large", label: "text-embedding-3-large" }
          ]}
        />
        <Select
          placeholder="Filter by provider"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          options={[
            { value: "", label: "All Providers" },
            { value: "openai", label: "OpenAI" },
            { value: "anthropic", label: "Anthropic" },
            { value: "azure-openai", label: "Azure OpenAI" },
            { value: "google", label: "Google" },
          ]}
        />
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => { setSearchTerm(""); setModelFilter(""); }}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Embedding History Table */}
      <Card>
        <CardHeader>Embedding History</CardHeader>
        <CardBody>
          <Table
            columns={columns}
            data={filteredAndSortedHistory}
            loading={loading}
            onSort={handleSort}
            sortKey={sortKey}
            sortDirection={sortDirection}
            empty={
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-[color:var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-[color:var(--text)]">No embedding history</h3>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">No embedding operations have been recorded yet.</p>
              </div>
            }
          />
        </CardBody>
      </Card>

      {/* Generation History */}
      <Card>
        <CardHeader>Generation History</CardHeader>
        <CardBody>
          <Table
            columns={[
              { key: 'timestamp', title: 'Date & Time', sortable: true, render: (v: string) => (<span className="text-sm font-mono text-[color:var(--text-muted)]">{formatDate(v)}</span>) },
              { key: 'name', title: 'Name', sortable: true },
              { key: 'model', title: 'Model', sortable: true, render: (v: string) => (<Badge variant="info" size="sm">{v}</Badge>) },
              { key: 'provider', title: 'Provider', sortable: true },
              { key: 'tokensUsed', title: 'Tokens', sortable: true, render: (v: number) => (<span className="font-mono text-sm">{formatNumber(v)}</span>) },
              { key: 'cost', title: 'Cost', sortable: true, render: (v: number) => (<span className="font-mono text-sm font-medium">{formatCurrency(v)}</span>) },
              { key: 'status', title: 'Status', sortable: true, render: (v: string) => (<Badge variant={getStatusBadgeVariant(v)}>{v.charAt(0).toUpperCase()+v.slice(1)}</Badge>) },
            ]}
            data={generationHistory}
            loading={loading}
            onSort={handleSort as any}
            sortKey={sortKey}
            sortDirection={sortDirection}
            empty={<div className="text-sm text-[color:var(--text-muted)]">No generation history</div>}
          />
        </CardBody>
      </Card>

      {/* Top Expensive Calls */}
      <Card>
        <CardHeader>Top Expensive Calls</CardHeader>
        <CardBody>
          <Table
            columns={[
              { key: 'timestamp', title: 'Date & Time', sortable: true, render: (v: string) => (<span className="text-sm font-mono text-[color:var(--text-muted)]">{formatDate(v)}</span>) },
              { key: 'operation', title: 'Operation', sortable: true },
              { key: 'name', title: 'Name', sortable: true },
              { key: 'model', title: 'Model', sortable: true },
              { key: 'provider', title: 'Provider', sortable: true },
              { key: 'tokensUsed', title: 'Tokens', sortable: true, render: (v: number) => (<span className="font-mono text-sm">{formatNumber(v)}</span>) },
              { key: 'cost', title: 'Cost', sortable: true, render: (v: number) => (<span className="font-mono text-sm font-medium">{formatCurrency(v)}</span>) },
              { key: 'trace_id', title: 'Trace', render: (_: any, row: ExpensiveCall) => (
                row.trace_id ? <a className="text-[color:var(--primary)] underline" href={`${process.env.NEXT_PUBLIC_LANGFUSE_HOST || 'http://localhost:3101'}/trace/${row.trace_id}`} target="_blank" rel="noreferrer">Open</a> : <span className="text-[color:var(--text-muted)]">—</span>
              ) },
            ]}
            data={topExpensive}
            loading={loading}
            onSort={handleSort as any}
            sortKey={sortKey}
            sortDirection={sortDirection}
            empty={<div className="text-sm text-[color:var(--text-muted)]">No data</div>}
          />
        </CardBody>
      </Card>
    </main>
  );
}
