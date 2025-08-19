"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Table } from "../../../components/ui/Table";
import { Button } from "../../../components/Button";
import { useDialog } from "../../../components/ui/DialogProvider";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Badge } from "../../../components/ui/Badge";
import { Pagination } from "../../../components/ui/Pagination";
import { useTranslation } from "../../../hooks/useTranslation";

type Context = {
  id: string;
  type: "place" | "website" | "ticket" | "document" | "text";
  title: string;
  body: string;
  instruction?: string;
  trust_level: number;
  language?: string;
  attributes: Record<string, any>;
  intent_scopes?: string[];
  created_at: string;
  updated_at: string;
};

export default function ContextsPage() {
  const { t, mounted: translationMounted } = useTranslation();
  const router = useRouter();
  const [contexts, setContexts] = React.useState<Context[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [trustFilter, setTrustFilter] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string>("created_at");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");
  const dialog = useDialog();
  const [isBusy, setIsBusy] = React.useState(false);
  const [busyMessage, setBusyMessage] = React.useState<string>("");

  React.useEffect(() => {
    fetchContexts();
  }, [page, size]);

  const fetchContexts = async () => {
    try {
      setLoading(true);
      const url = `${BACKEND_URL}/api/admin/contexts?page=${page}&size=${size}`;
      const tenantId = getTenantId();
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          "X-Tenant-ID": tenantId,
          // rely on backend no-store; avoid custom cache headers to satisfy CORS
        }
      });
      if (response.ok) {
        const data = await response.json();
        setContexts(data.items || []);
        setTotal(data.total || 0);
      } else {
        // Mock data for development
        setContexts([
          {
            id: "1",
            type: "place",
            title: "Central World Bangkok",
            body: "Large shopping mall in the heart of Bangkok",
            instruction: "Mention opening hours and location when discussing this place",
            trust_level: 4,
            language: "en",
            attributes: {
              address: "999/9 Rama I Rd, Pathum Wan, Bangkok 10330",
              lat: 13.7472,
              lon: 100.5398,
              phone: "+66 2 635 1111",
              hours: { "mon": "10:00-22:00", "tue": "10:00-22:00" }
            },
            intent_scopes: ["shopping", "location"],
            created_at: "2024-01-15T10:00:00Z",
            updated_at: "2024-01-15T10:00:00Z"
          },
          {
            id: "2",
            type: "website",
            title: "Company Homepage",
            body: "Official company website with product information",
            trust_level: 5,
            language: "en",
            attributes: {
              url: "https://example.com",
              domain: "example.com",
              last_crawled: "2024-01-14T15:30:00Z",
              status_code: 200
            },
            intent_scopes: ["general", "support"],
            created_at: "2024-01-14T15:30:00Z",
            updated_at: "2024-01-14T15:30:00Z"
          }
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch contexts:", error);
      // Mock data fallback
      setContexts([]);
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({ 
      title: translationMounted ? `ลบ${t('contexts')}` : 'Delete Context', 
      description: translationMounted ? `คุณแน่ใจหรือไม่ที่จะลบ${t('contexts')}นี้?` : 'Are you sure you want to delete this context?', 
      confirmText: translationMounted ? t('delete') : 'Delete', 
      variant: 'danger' 
    });
    if (!ok) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/contexts/${id}`, {
        method: "DELETE",
        headers: { "X-Tenant-ID": getTenantId() }
      });
      
      if (response.ok) {
        await fetchContexts();
      }
    } catch (error) {
      console.error("Failed to delete context:", error);
    }
  };

  const handleEdit = (context: Context) => {
    router.push(`/admin/contexts/edit/${context.id}`);
  };

  const handleCreate = () => {
    router.push("/admin/contexts/create");
  };

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const filteredAndSortedContexts = React.useMemo(() => {
    let filtered = contexts.filter(context => {
      const matchesSearch = !searchTerm || 
        context.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        context.body.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !typeFilter || context.type === typeFilter;
      const matchesTrust = !trustFilter || context.trust_level === parseInt(trustFilter);
      
      return matchesSearch && matchesType && matchesTrust;
    });

    return filtered.sort((a, b) => {
      const aVal = a[sortKey as keyof Context];
      const bVal = b[sortKey as keyof Context];
      
      if (sortDirection === "asc") {
        return (aVal || '') < (bVal || '') ? -1 : (aVal || '') > (bVal || '') ? 1 : 0;
      } else {
        return (aVal || '') > (bVal || '') ? -1 : (aVal || '') < (bVal || '') ? 1 : 0;
      }
    });
  }, [contexts, searchTerm, typeFilter, trustFilter, sortKey, sortDirection]);

  const columns = [
    {
      key: "title",
      title: translationMounted ? t('title') : "Title",
      sortable: true,
      render: (value: string, row: Context) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-[color:var(--text-muted)]">
            {row.body.length > 60 ? `${row.body.substring(0, 60)}...` : row.body}
          </div>
        </div>
      )
    },
    {
      key: "type",
      title: translationMounted ? t('type') : "Type",
      sortable: true,
      render: (value: string) => (
        <Badge variant="info">{value.replace("_", " ")}</Badge>
      )
    },
    {
      key: "trust_level",
      title: translationMounted ? t('trust') : "Trust",
      sortable: true,
      render: (value: number) => (
        <Badge variant={value >= 4 ? "success" : value >= 3 ? "info" : "warning"}>
          {value}
        </Badge>
      )
    },
    {
      key: "intent_scopes",
      title: translationMounted ? t('intents') : "Intents",
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {(value || []).slice(0, 2).map(scope => (
            <Badge key={scope} size="sm">{scope}</Badge>
          ))}
          {(value || []).length > 2 && (
            <Badge size="sm" variant="default">+{(value || []).length - 2}</Badge>
          )}
        </div>
      )
    },
    {
      key: "attributes",
      title: translationMounted ? t('keyAttributes') : "Key Attributes",
      render: (value: Record<string, any>, row: Context) => {
        const keyAttrs = [];
        if (row.type === "place" && value.address) keyAttrs.push(value.address);
        if (row.type === "website" && value.domain) keyAttrs.push(value.domain);
        if (row.type === "ticket" && value.location) keyAttrs.push(value.location);
        if ((row.type as any) === "doc_chunk" && value.source_uri) keyAttrs.push(value.source_uri);
        
        return (
          <div className="text-sm text-[color:var(--text-muted)] max-w-xs truncate">
            {keyAttrs.join(", ") || "—"}
          </div>
        );
      }
    },
    {
      key: "actions",
      title: translationMounted ? t('actions') : "Actions",
      render: (_: any, row: Context) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            {translationMounted ? t('edit') : 'Edit'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="whitespace-nowrap"
            onClick={async () => {
              try {
                const res = await fetch(`${BACKEND_URL}/api/admin/contexts/${row.id}/duplicate`, {
                  method: 'POST',
                  headers: { 'X-Tenant-ID': getTenantId(), 'Content-Type': 'application/json' }
                });
                if (res.ok) {
                  await fetchContexts();
                }
              } catch {}
            }}
          >
            {translationMounted ? t('duplicate') : 'Duplicate'}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleDelete(row.id)}
            className="text-[color:var(--error)] hover:bg-red-50"
          >
            {translationMounted ? t('delete') : 'Delete'}
          </Button>
        </div>
      )
    }
  ];

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('contexts') : 'Contexts'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={async () => {
            setIsBusy(true);
            setBusyMessage(translationMounted ? t('createMissingEmbeddings') : 'Creating missing embeddings...');
            try {
              const res = await fetch(`${BACKEND_URL}/api/admin/contexts/embedding/missing`, {
                method: 'POST',
                headers: { 'X-Tenant-ID': getTenantId(), 'Content-Type': 'application/json' },
              });
              const data = await res.json().catch(() => ({}));
              await fetchContexts();
              await dialog.alert({
                title: translationMounted ? t('done') : 'Done',
                description: `${translationMounted ? t('createMissingEmbeddings') : 'Created missing embeddings'}: ${data.updated ?? 0}/${data.total_missing ?? 0}`,
              });
            } catch (e: any) {
              await dialog.alert({ title: translationMounted ? t('error') : 'Error', description: String(e?.message || e) });
            } finally {
              setIsBusy(false);
              setBusyMessage("");
            }
          }} disabled={isBusy}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
            </svg>
            {translationMounted ? t('createMissingEmbeddings') : 'Create Missing Embeddings'}
          </Button>
          <Button variant="outline" onClick={async () => {
            setIsBusy(true);
            setBusyMessage(translationMounted ? t('rebuildAllEmbeddings') : 'Rebuilding all embeddings...');
            try {
              const res = await fetch(`${BACKEND_URL}/api/admin/contexts/embedding/rebuild`, {
                method: 'POST',
                headers: { 'X-Tenant-ID': getTenantId(), 'Content-Type': 'application/json' },
              });
              const data = await res.json().catch(() => ({}));
              await fetchContexts();
              await dialog.alert({
                title: translationMounted ? t('done') : 'Done',
                description: `${translationMounted ? t('rebuildAllEmbeddings') : 'Rebuilt embeddings'}: ${data.updated ?? 0}/${data.total ?? 0}`,
              });
            } catch (e: any) {
              await dialog.alert({ title: translationMounted ? t('error') : 'Error', description: String(e?.message || e) });
            } finally {
              setIsBusy(false);
              setBusyMessage("");
            }
          }} disabled={isBusy}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {translationMounted ? t('rebuildAllEmbeddings') : 'Rebuild All Embeddings'}
          </Button>
          <Button onClick={handleCreate}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {translationMounted ? t('createContext') : 'Create Context'}
          </Button>
        </div>
      </div>

      {isBusy && (
        <div className="rounded border px-3 py-2 text-sm bg-yellow-50 border-yellow-200 text-yellow-800">
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" strokeWidth="2" className="opacity-75" />
            </svg>
            {busyMessage || (translationMounted ? t('processing') : 'Processing...')}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder={translationMounted ? `ค้นหา${t('contexts')}...` : "Search contexts..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <Select
          placeholder="Filter by type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: "", label: translationMounted ? t('allTypes') : "All Types" },
            { value: "place", label: translationMounted ? t('place') : "Place" },
            { value: "website", label: translationMounted ? t('website') : "Website" },
            { value: "ticket", label: translationMounted ? t('ticket') : "Ticket" },
            { value: "document", label: translationMounted ? t('document') : "Document" },
            { value: "text", label: translationMounted ? t('text') : "Text" }
          ]}
        />
        <Select
          placeholder="Filter by trust level"
          value={trustFilter}
          onChange={(e) => setTrustFilter(e.target.value)}
          options={[
            { value: "", label: translationMounted ? t('allTrustLevels') : "All Trust Levels" },
            { value: "1", label: `1 - ${translationMounted ? t('low') : "Low"}` },
            { value: "2", label: `2 - ${translationMounted ? t('medium') : "Medium"}` },
            { value: "3", label: `3 - ${translationMounted ? t('high') : "High"}` },
            { value: "4", label: `4 - ${translationMounted ? t('verified') : "Verified"}` },
            { value: "5", label: `5 - ${translationMounted ? t('official') : "Official"}` }
          ]}
        />
        <div className="flex justify-end">
          <Button variant="outline" onClick={fetchContexts} disabled={loading}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredAndSortedContexts}
        loading={loading}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDirection}
        className="w-full"
        empty={
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-[color:var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-[color:var(--text)]">No contexts</h3>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">Get started by creating a new context.</p>
            <div className="mt-6">
              <Button onClick={handleCreate}>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Context
              </Button>
            </div>
          </div>
        }
      />
      <Pagination
        page={page}
        size={size}
        total={total}
        onPageChange={(p)=>setPage(p)}
        onSizeChange={(s)=>{setPage(1); setSize(s);}}
      />


    </main>
  );
}