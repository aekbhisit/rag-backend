"use client";

import React from "react";
import { Table } from "../../../components/ui/Table";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Badge } from "../../../components/ui/Badge";
import { formatDateDetailed } from "../../../utils/timezone";
import { useTranslation } from "../../../hooks/useTranslation";

type AuditLogEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "failure" | "warning";
};

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = React.useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string>("timestamp");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  
  const { t, mounted: translationMounted } = useTranslation();

  React.useEffect(() => {
    fetchAuditLogs();
  }, [page, size]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/logs?page=${page}&size=${size}`, {
        headers: { "X-Tenant-ID": getTenantId() }
      });
      if (response.ok) {
        const data = await response.json();
        const entries: AuditLogEntry[] = (data.items || []).map((r: any) => ({
          id: r.id,
          timestamp: r.created_at,
          user: r.user_id || "system",
          action: (r.retrieval_method || "QUERY").toString().toUpperCase(),
          resource: r.profile_id ? "profile" : "query",
          resourceId: r.profile_id || undefined,
          details: r.query || "",
          ipAddress: (r.request_jsonb && (r.request_jsonb.ip || r.request_jsonb.ipAddress)) || "",
          userAgent: (r.request_jsonb && (r.request_jsonb.user_agent || r.request_jsonb.userAgent)) || "",
          status: (typeof r.confidence === 'number' ? 'success' : 'success') as AuditLogEntry['status'],
        }));
        setAuditLogs(entries);
        if (typeof data.total === 'number') setTotal(data.total);
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const filteredAndSortedLogs = React.useMemo(() => {
    let filtered = auditLogs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesStatus = !statusFilter || log.status === statusFilter;
      const matchesUser = !userFilter || log.user.includes(userFilter);
      
      return matchesSearch && matchesAction && matchesStatus && matchesUser;
    });

    return filtered.sort((a, b) => {
      const aVal = a[sortKey as keyof AuditLogEntry];
      const bVal = b[sortKey as keyof AuditLogEntry];
      
      if (sortDirection === "asc") {
        return (aVal || '') < (bVal || '') ? -1 : (aVal || '') > (bVal || '') ? 1 : 0;
      } else {
        return (aVal || '') > (bVal || '') ? -1 : (aVal || '') < (bVal || '') ? 1 : 0;
      }
    });
  }, [auditLogs, searchTerm, actionFilter, statusFilter, userFilter, sortKey, sortDirection]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "success": return "success";
      case "failure": return "error";
      case "warning": return "warning";
      default: return "default";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return (
          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case "UPDATE":
        return (
          <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case "DELETE":
        return (
          <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case "LOGIN":
        return (
          <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        );
      case "BULK_UPDATE":
        return (
          <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateDetailed(dateString);
  };

  const columns = [
    {
      key: "timestamp",
      title: translationMounted ? t('auditTimestamp') : "Timestamp",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm font-mono text-[color:var(--text-muted)]">
          {formatDate(value)}
        </span>
      )
    },
    {
      key: "user",
      title: translationMounted ? t('auditUser') : "User",
      sortable: true,
      render: (value: string) => {
        const safe = value || '';
        const initial = safe ? safe.charAt(0).toUpperCase() : '?';
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[color:var(--primary)] rounded-full flex items-center justify-center text-xs text-white font-medium">
              {initial}
            </div>
            <span className="text-sm">{safe || '—'}</span>
          </div>
        );
      }
    },
    {
      key: "action",
      title: translationMounted ? t('auditAction') : "Action",
      sortable: true,
      render: (value: string, row: AuditLogEntry) => (
        <div className="flex items-center gap-2">
          {getActionIcon(value)}
          <span className="text-sm font-medium">{value}</span>
          {row.resource && (
            <Badge size="sm" variant="info">
              {row.resource}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: "details",
      title: translationMounted ? t('auditDetails') : "Details",
      render: (value: string, row: AuditLogEntry) => (
        <div>
          <div className="text-sm">{value}</div>
          {row.resourceId && (
            <div className="text-xs text-[color:var(--text-muted)] font-mono">
              ID: {row.resourceId}
            </div>
          )}
        </div>
      )
    },
    {
      key: "ipAddress",
      title: translationMounted ? t('auditIP') : "IP Address",
      render: (value: string) => (
        <span className="text-sm font-mono text-[color:var(--text-muted)]">
          {value}
        </span>
      )
    },
    {
      key: "status",
      title: translationMounted ? t('status') : "Status",
      sortable: true,
      render: (value: string) => {
        const safe = value || '';
        const text = safe ? safe.charAt(0).toUpperCase() + safe.slice(1) : '—';
        return (
          <Badge variant={getStatusBadgeVariant(safe)}>
            {text}
          </Badge>
        );
      }
    }
  ];

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{translationMounted ? t('auditLog') : 'Audit Log'}</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchAuditLogs} disabled={loading}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
{translationMounted ? t('refresh') : 'Refresh'}
          </Button>
          <Button variant="outline">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
{translationMounted ? t('export') : 'Export'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Input
          placeholder={translationMounted ? t('searchLogs') : 'Search logs...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <Select
          placeholder={translationMounted ? t('filterByAction') : 'Filter by action'}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          options={[
            { value: "", label: translationMounted ? t('allActions') : "All Actions" },
            { value: "CREATE", label: translationMounted ? t('create') : "Create" },
            { value: "UPDATE", label: translationMounted ? t('update') : "Update" },
            { value: "DELETE", label: translationMounted ? t('delete') : "Delete" },
            { value: "LOGIN", label: translationMounted ? t('login') : "Login" },
            { value: "BULK_UPDATE", label: translationMounted ? t('bulkUpdate') : "Bulk Update" }
          ]}
        />
        <Select
          placeholder={translationMounted ? t('filterByStatus') : 'Filter by status'}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: translationMounted ? t('allStatuses') : "All Statuses" },
            { value: "success", label: translationMounted ? t('success') : "Success" },
            { value: "failure", label: translationMounted ? t('failure') : "Failure" },
            { value: "warning", label: translationMounted ? t('warning') : "Warning" }
          ]}
        />
        <Input
          placeholder={translationMounted ? t('filterByUser') : 'Filter by user'}
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        />
        <div className="flex justify-end">
          <Button variant="outline" onClick={fetchAuditLogs} disabled={loading}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
{translationMounted ? t('clearFilters') : 'Clear Filters'}
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredAndSortedLogs}
        loading={loading}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDirection}
        empty={
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-[color:var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-[color:var(--text)]">{translationMounted ? t('noAuditLogs') : 'No audit logs'}</h3>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">{translationMounted ? t('noActivityRecorded') : 'No activity has been recorded yet.'}</p>
          </div>
        }
      />
      <Pagination page={page} size={size} total={total || auditLogs.length} onPageChange={(p)=>setPage(p)} onSizeChange={(s)=>{setPage(1); setSize(s);}} />
    </main>
  );
}
