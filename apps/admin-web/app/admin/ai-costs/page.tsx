"use client";

import React from "react";
import { Card, CardBody, CardHeader } from "../../../components/Card";
import { LineChart } from "../../../components/charts/LineChart";
import { Table } from "../../../components/ui/Table";
import { Button } from "../../../components/Button";
import { Select } from "../../../components/ui/Select";
import { Badge } from "../../../components/ui/Badge";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";

type CostSummary = {
  totalCost: number;
  totalTokens: number;
  avgCostPerToken?: number;
  costTrend: Array<{ label: string; value: number }>;
  tokenTrend: Array<{ label: string; value: number }>;
  modelUsage: Array<{ model: string; tokens?: number; cost: number; percentage: number }>;
  providerUsage?: Array<{ provider: string; tokens?: number; cost: number; percentage: number }>;
};

type ExpensiveCall = {
  id: string;
  operation: string;
  name?: string;
  model?: string;
  provider?: string;
  tokensUsed?: number;
  cost?: number;
  timestamp?: string;
  trace_id?: string | null;
};

export default function AiCostsPage() {
  const [timeRange, setTimeRange] = React.useState("7d");
  const [modelFilter, setModelFilter] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [costSummary, setCostSummary] = React.useState<CostSummary>({
    totalCost: 0,
    totalTokens: 0,
    avgCostPerToken: 0,
    costTrend: [],
    tokenTrend: [],
    modelUsage: [],
    providerUsage: [],
  });
  const [topExpensive, setTopExpensive] = React.useState<ExpensiveCall[]>([]);
  const [topPage, setTopPage] = React.useState(1);
  const [topSize, setTopSize] = React.useState(10);
  const [topSortBy, setTopSortBy] = React.useState<'cost_total_usd'|'usage_total_tokens'|'start_time'|'latency_ms'>('cost_total_usd');
  const [topSortDir, setTopSortDir] = React.useState<'asc'|'desc'>('desc');
  const [topTotal, setTopTotal] = React.useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', timeRange);
      if (modelFilter) params.set('model', modelFilter);
      if (providerFilter) params.set('provider', providerFilter);
      params.set('top_page', String(topPage));
      params.set('top_size', String(topSize));
      params.set('top_sort_by', topSortBy);
      params.set('top_sort_dir', topSortDir);
      const r = await fetch(`${BACKEND_URL}/api/admin/ai-costs/summary?${params.toString()}`, {
        headers: { 'X-Tenant-ID': getTenantId() }
      });
      if (r.ok) {
        const data = await r.json();
        const s = data.summary || {};
        const costTrend = (s.costTrend || []).map((p: any) => ({ label: p.label ?? p.date, value: p.value ?? p.cost ?? 0 }));
        const tokenTrend = (s.tokenTrend || []).map((p: any) => ({ label: p.label ?? p.date, value: p.value ?? p.tokens ?? 0 }));
        const modelUsage = (s.modelUsage || s.byModel || []).map((m: any) => ({ model: m.model ?? m.key ?? 'unknown', cost: Number(m.cost || 0), percentage: 0 }));
        const providerUsage = (s.providerUsage || s.byProvider || []).map((p: any) => ({ provider: p.provider ?? p.key ?? 'unknown', cost: Number(p.cost || 0), percentage: 0 }));
        setCostSummary({
          totalCost: s.totalCost || 0,
          totalTokens: s.totalTokens || 0,
          avgCostPerToken: s.totalTokens > 0 ? (s.totalCost / s.totalTokens) : 0,
          costTrend,
          tokenTrend,
          modelUsage,
          providerUsage,
        });
        const top: any[] = (data.topExpensive || []).map((row: any) => ({
          ...row,
          usage: { total_tokens: row.usage?.total_tokens ?? row.usage_total_tokens ?? null },
          cost: { total_usd: row.cost?.total_usd ?? row.cost_total_usd ?? null },
        }));
        setTopExpensive(top);
        if (typeof data.topTotal === 'number') setTopTotal(data.topTotal);
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchData(); }, [timeRange, modelFilter, providerFilter, topPage, topSize, topSortBy, topSortDir]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(amount || 0);
  const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">AI Cost Summary</h1>
        <div className="flex gap-3">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }, { value: "1y", label: "Last year" }]}
          />
          <Button variant="outline" onClick={fetchData} disabled={loading}>Refresh</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>Total Cost</CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold text-[color:var(--primary)]">{formatCurrency(costSummary.totalCost)}</div>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">This period</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Total Tokens</CardHeader>
          <CardBody><div className="text-3xl font-semibold">{formatNumber(costSummary.totalTokens)}</div></CardBody>
        </Card>
        <Card>
          <CardHeader>Avg Cost/Token</CardHeader>
          <CardBody><div className="text-3xl font-semibold">{formatCurrency(costSummary.avgCostPerToken || 0)}</div></CardBody>
        </Card>
        <Card>
          <CardHeader>Top Model</CardHeader>
          <CardBody>
            <div className="text-lg font-semibold">
              {costSummary.modelUsage[0]?.model || '—'}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>Cost Trend</CardHeader>
          <CardBody>
            <LineChart data={costSummary.costTrend} color="#10B981" width={400} height={200} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Token Usage Trend</CardHeader>
          <CardBody>
            <LineChart data={costSummary.tokenTrend} color="#3B82F6" width={400} height={200} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>Model Usage Breakdown</CardHeader>
        <CardBody>
          <div className="space-y-3">
            {costSummary.modelUsage.map((m, i) => (
              <div key={`${m.model}:${i}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="info">{m.model}</Badge>
                </div>
                <div className="text-sm font-mono">{formatCurrency(m.cost)}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Top Expensive Calls</CardHeader>
        <CardBody>
          <Table
            columns={[
              { key: 'start_time', title: 'Date & Time', sortable: true, onSort: (dir: 'asc'|'desc') => { setTopSortBy('start_time'); setTopSortDir(dir); }, render: (_: any, row: any) => (<span className="text-sm font-mono text-[color:var(--text-muted)]">{row.start_time ? new Date(row.start_time).toLocaleString() : '—'}</span>) },
              { key: 'operation', title: 'Operation' },
              { key: 'model', title: 'Model', render: (_: any, row: any) => (<Badge variant="info" size="sm">{row.model || '—'}</Badge>) },
              { key: 'provider', title: 'Provider', render: (_: any, row: any) => (<span>{row.provider || '—'}</span>) },
              { key: 'usage_total_tokens', title: 'Tokens', sortable: true, onSort: (dir: 'asc'|'desc') => { setTopSortBy('usage_total_tokens'); setTopSortDir(dir); }, render: (_: any, row: any) => (<span className="font-mono">{row.usage?.total_tokens ?? row.usage_total_tokens ?? '—'}</span>) },
              { key: 'cost_total_usd', title: 'Cost', sortable: true, onSort: (dir: 'asc'|'desc') => { setTopSortBy('cost_total_usd'); setTopSortDir(dir); }, render: (_: any, row: any) => (<span className="font-mono">{(row.cost?.total_usd ?? row.cost_total_usd) != null ? Number(row.cost?.total_usd ?? row.cost_total_usd).toFixed(6) : '—'}</span>) },
            ]}
            data={topExpensive}
            loading={loading}
            empty={<div className="text-sm text-[color:var(--text-muted)]">No data</div>}
          />
          <Pagination
            page={topPage}
            size={topSize}
            total={topTotal ?? topExpensive.length}
            onPageChange={(p)=>setTopPage(p)}
            onSizeChange={(s)=>{setTopPage(1); setTopSize(s);}}
            className="mt-3 justify-end"
          />
        </CardBody>
      </Card>
    </main>
  );
}



