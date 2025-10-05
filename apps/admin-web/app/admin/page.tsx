"use client";

import React from "react";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Sparkline } from "../../components/charts/Sparkline";
import { BarChart } from "../../components/charts/Bar";
import { Badge } from "../../components/ui/Badge";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/Button";
import { BACKEND_URL, getTenantId } from "../../components/config";
import { useTranslation } from "../../hooks/useTranslation";

type StatsData = {
  totalQueries: number;
  successRate: number;
  avgResponseTime: number;
  zeroHitRate: number;
  topIntents: Array<{ intent: string; count: number; percentage: number }>;
  queryTrend: number[];
  responseTimes: number[];
  confidenceDistribution: Array<{ range: string; count: number }>;
  contextUsage: Array<{ type: string; count: number; percentage: number }>;
  errorRate: number;
  cacheHitRate: number;
};

export default function AdminDashboard() {
  const { t, mounted: translationMounted } = useTranslation();
  const [timeRange, setTimeRange] = React.useState("7d");
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState<StatsData>({
    totalQueries: 12847,
    successRate: 94.2,
    avgResponseTime: 847,
    zeroHitRate: 8.3,
    topIntents: [
      { intent: "general.question", count: 3421, percentage: 26.6 },
      { intent: "support.technical", count: 2156, percentage: 16.8 },
      { intent: "location.search", count: 1834, percentage: 14.3 },
      { intent: "product.info", count: 1523, percentage: 11.9 },
      { intent: "booking.inquiry", count: 987, percentage: 7.7 }
    ],
    queryTrend: [145, 167, 134, 189, 156, 203, 178, 234, 198, 267, 245, 289, 312, 278],
    responseTimes: [650, 720, 890, 760, 1200, 980, 850, 920, 780, 1100, 890, 750, 680, 920],
    confidenceDistribution: [
      { range: "0.9-1.0", count: 7892 },
      { range: "0.8-0.9", count: 2341 },
      { range: "0.7-0.8", count: 1456 },
      { range: "0.6-0.7", count: 823 },
      { range: "0.0-0.6", count: 335 }
    ],
    contextUsage: [
      { type: "website", count: 4521, percentage: 35.2 },
      { type: "document", count: 2876, percentage: 22.2 },
      { type: "text", count: 1000, percentage: 8.0 },
      { type: "place", count: 2934, percentage: 22.8 },
      { type: "ticket", count: 1516, percentage: 11.8 }
    ],
    errorRate: 2.1,
    cacheHitRate: 78.4
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/dashboard?range=${encodeURIComponent(timeRange)}`, {
        headers: { 'X-Tenant-ID': getTenantId() }
      });
      if (r.ok) {
        const data = await r.json();
        setStats(prev => ({
          totalQueries: data.totalQueries ?? 0,
          successRate: data.successRate ?? 0,
          avgResponseTime: data.avgResponseTime ?? 0,
          zeroHitRate: data.zeroHitRate ?? 0,
          topIntents: Array.isArray(data.topIntents) ? data.topIntents : [],
          queryTrend: Array.isArray(data.queryTrend) ? data.queryTrend.map((p: any) => Number(p.count ?? 0)) : [],
          responseTimes: Array.isArray(data.responseTimes) ? data.responseTimes.map((p: any) => Number(p.avg_ms ?? 0)) : [],
          confidenceDistribution: [],
          contextUsage: Array.isArray(data.contextUsage) ? data.contextUsage : [],
          errorRate: data.errorRate ?? 0,
          cacheHitRate: prev.cacheHitRate,
        }));
      } else {
        // fallback to zeroed stats on error
        setStats(prev => ({ ...prev, totalQueries: 0, successRate: 0, avgResponseTime: 0, zeroHitRate: 0, topIntents: [], queryTrend: [], responseTimes: [], contextUsage: [], errorRate: 0 }));
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setStats(prev => ({ ...prev, totalQueries: 0, successRate: 0, avgResponseTime: 0, zeroHitRate: 0, topIntents: [], queryTrend: [], responseTimes: [], contextUsage: [], errorRate: 0 }));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "success";
    if (rate >= 90) return "warning";
    return "error";
  };

  const getResponseTimeColor = (time: number) => {
    if (time <= 500) return "success";
    if (time <= 1000) return "warning";
    return "error";
  };

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('dashboard') : 'Dashboard'}
        </h1>
        <div className="flex gap-3">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: "1d", label: translationMounted ? t('last24Hours') : "Last 24 hours" },
              { value: "7d", label: translationMounted ? t('last7Days') : "Last 7 days" },
              { value: "30d", label: translationMounted ? t('last30Days') : "Last 30 days" },
              { value: "90d", label: translationMounted ? t('last90Days') : "Last 90 days" }
            ]}
          />
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {translationMounted ? t('refresh') : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>{translationMounted ? t('totalQueries') : 'Total Queries'}</CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-semibold">{formatNumber(stats.totalQueries)}</span>
              {stats.queryTrend.length > 0 ? (
                <Sparkline data={stats.queryTrend} stroke="#10B981" />
              ) : (
                <span className="text-xs text-[color:var(--text-muted)]">
                  {translationMounted ? t('noData') : 'No data'}
                </span>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>{translationMounted ? t('successRate') : 'Success Rate'}</CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-semibold">{formatPercentage(stats.successRate)}</span>
                <Badge variant={getSuccessRateColor(stats.successRate)} className="ml-2">
                  {stats.successRate >= 95 ? (translationMounted ? t('excellent') : 'Excellent') : stats.successRate >= 90 ? (translationMounted ? t('good') : 'Good') : (translationMounted ? t('needsAttention') : 'Needs Attention')}
                </Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>{translationMounted ? t('avgResponseTime') : 'Avg Response Time'}</CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-semibold">{stats.avgResponseTime}ms</span>
                <Badge variant={getResponseTimeColor(stats.avgResponseTime)} className="ml-2">
                  {stats.avgResponseTime <= 500 ? (translationMounted ? t('fast') : 'Fast') : stats.avgResponseTime <= 1000 ? (translationMounted ? t('ok') : 'OK') : (translationMounted ? t('slow') : 'Slow')}
                </Badge>
              </div>
              {stats.responseTimes.length > 0 ? (
                <Sparkline data={stats.responseTimes} stroke="#F59E0B" />
              ) : (
                <span className="text-xs text-[color:var(--text-muted)]">
                  {translationMounted ? t('noData') : 'No data'}
                </span>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>{translationMounted ? t('zeroHitRate') : 'Zero-Hit Rate'}</CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-semibold">{formatPercentage(stats.zeroHitRate)}</span>
                <Badge variant={stats.zeroHitRate <= 10 ? "success" : stats.zeroHitRate <= 20 ? "warning" : "error"} className="ml-2">
                  {stats.zeroHitRate <= 10 ? (translationMounted ? t('good') : 'Good') : stats.zeroHitRate <= 20 ? (translationMounted ? t('fair') : 'Fair') : (translationMounted ? t('high') : 'High')}
                </Badge>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Charts and Detailed Stats */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>{translationMounted ? t('queryVolumeTrend') : 'Query Volume Trend'}</CardHeader>
          <CardBody>
            {stats.queryTrend.length > 0 ? (
              <BarChart data={stats.queryTrend} color="#4F46E5" />
            ) : (
              <div className="text-sm text-[color:var(--text-muted)]">
                {translationMounted ? t('noTrendData') : 'No trend data'}
              </div>
            )}
            <p className="text-sm text-[color:var(--text-muted)] mt-2">
              {translationMounted ? t('dailyQueryVolume') : 'Daily query volume over the selected time period'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>{translationMounted ? t('responseTimeDistribution') : 'Response Time Distribution'}</CardHeader>
          <CardBody>
            {stats.responseTimes.length > 0 ? (
              <BarChart data={stats.responseTimes} color="#F59E0B" />
            ) : (
              <div className="text-sm text-[color:var(--text-muted)]">
                {translationMounted ? t('noResponseTimeData') : 'No response time data'}
              </div>
            )}
            <p className="text-sm text-[color:var(--text-muted)] mt-2">
              {translationMounted ? t('responseTimeDistributionMs') : 'Response time distribution (milliseconds)'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>{translationMounted ? t('topIntents') : 'Top Intents'}</CardHeader>
          <CardBody>
            <div className="space-y-3">
              {stats.topIntents.length === 0 && (
                <div className="text-sm text-[color:var(--text-muted)]">
                  {translationMounted ? t('noIntentData') : 'No intent data'}
                </div>
              )}
              {stats.topIntents.map((intent, index) => (
                <div key={`${intent?.intent || 'unknown'}:${index}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[color:var(--text-muted)] w-4">
                      #{index + 1}
                    </span>
                    <span className="font-medium">{intent.intent}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[color:var(--text-muted)]">
                      {formatNumber(intent.count)}
                    </span>
                    <Badge variant="info" size="sm">
                      {formatPercentage(intent.percentage)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>{translationMounted ? t('contextTypeUsage') : 'Context Type Usage'}</CardHeader>
          <CardBody>
            <div className="space-y-3">
              {stats.contextUsage.length === 0 && (
                <div className="text-sm text-[color:var(--text-muted)]">
                  {translationMounted ? t('noContextData') : 'No context data'}
                </div>
              )}
              {stats.contextUsage.map((context, index) => (
                <div key={`${context?.type || 'unknown'}:${index}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="info" size="sm">
                      {context.type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[color:var(--text-muted)]">
                      {formatNumber(context.count)}
                    </span>
                    <span className="text-sm font-medium">
                      {formatPercentage(context.percentage)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader>Confidence Distribution</CardHeader>
          <CardBody>
            {stats.confidenceDistribution.length === 0 ? (
              <div className="text-sm text-[color:var(--text-muted)]">No distribution data</div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const maxCount = Math.max(
                    0,
                    ...stats.confidenceDistribution.map((c) => c.count || 0)
                  );
                  return stats.confidenceDistribution.map((conf, index) => (
                    <div key={`${conf?.range || 'unknown'}:${index}`} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{conf.range}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-40 bg-[color:var(--surface-muted)] rounded-full h-2">
                          <div
                            className="bg-[color:var(--primary)] h-2 rounded-full"
                            style={{ width: `${maxCount > 0 ? Math.min(100, (conf.count / maxCount) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-[color:var(--text-muted)] w-12 text-right">
                          {formatNumber(conf.count)}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>System Health</CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Error Rate</span>
                <Badge variant={stats.errorRate <= 2 ? "success" : stats.errorRate <= 5 ? "warning" : "error"}>
                  {formatPercentage(stats.errorRate)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cache Hit Rate</span>
                <Badge variant={stats.cacheHitRate >= 80 ? "success" : stats.cacheHitRate >= 60 ? "warning" : "error"}>
                  {formatPercentage(stats.cacheHitRate)}
                </Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Quick Actions</CardHeader>
          <CardBody>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Audit Log
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configure Alerts
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}