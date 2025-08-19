"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Table } from "../../../components/ui/Table";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Badge } from "../../../components/ui/Badge";
import { useDialog } from "../../../components/ui/DialogProvider";
import { Pagination } from "../../../components/ui/Pagination";
import { formatDateForTable } from "../../../utils/timezone";
import { useTranslation } from "../../../hooks/useTranslation";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  status: "active" | "inactive" | "pending";
  timezone: string;
  tenant_id: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
};

export default function UsersPage() {
  const { t, mounted: translationMounted } = useTranslation();
  const router = useRouter();
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string>("created_at");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");
  const dialog = useDialog();
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    fetchUsers();
  }, [page, size]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/users?page=${page}&size=${size}`, {
        headers: { "X-Tenant-ID": getTenantId() }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers((data.items || []).map((u: any) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          role: u.role || 'viewer',
          status: u.status || 'active',
          timezone: u.timezone || 'UTC',
          tenant_id: u.tenant_id,
          last_login: u.last_login || undefined,
          created_at: u.created_at,
          updated_at: u.updated_at || u.created_at,
        })));
        if (typeof data.total === 'number') setTotal(data.total);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({ 
      title: translationMounted ? t('deleteUser') : 'Delete User', 
      description: translationMounted ? t('deleteUserConfirm') : 'Are you sure you want to delete this user?', 
      confirmText: translationMounted ? t('delete') : 'Delete', 
      variant: 'danger' 
    });
    if (!ok) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { "X-Tenant-ID": getTenantId() }
      });
      if (response.status === 204) {
        setUsers(prev => prev.filter(user => user.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const handleEdit = (user: User) => {
    router.push(`/admin/users/edit/${user.id}`);
  };

  const handleCreate = () => {
    router.push("/admin/users/create");
  };

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const filteredAndSortedUsers = React.useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const aVal = a[sortKey as keyof User];
      const bVal = b[sortKey as keyof User];
      
      if (sortDirection === "asc") {
        return (aVal || '') < (bVal || '') ? -1 : (aVal || '') > (bVal || '') ? 1 : 0;
      } else {
        return (aVal || '') > (bVal || '') ? -1 : (aVal || '') < (bVal || '') ? 1 : 0;
      }
    });
  }, [users, searchTerm, roleFilter, statusFilter, sortKey, sortDirection]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "error";
      case "operator": return "warning";
      case "viewer": return "info";
      default: return "default";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "inactive": return "default";
      case "pending": return "warning";
      default: return "default";
    }
  };

  const formatDate = (dateString?: string, userTimezone?: string) => {
    return formatDateForTable(dateString, userTimezone);
  };

  const columns = [
    {
      key: "name",
      title: translationMounted ? t('name') : "Name",
      sortable: true,
      render: (value: string, row: User) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-[color:var(--text-muted)]">{row.email}</div>
        </div>
      )
    },
    {
      key: "role",
      title: translationMounted ? t('role') : "Role",
      sortable: true,
      render: (value: string) => {
        const safe = value || '';
        let text = safe ? safe.charAt(0).toUpperCase() + safe.slice(1) : '—';
        if (translationMounted && safe) {
          text = t(safe as any) || text;
        }
        return (
          <Badge variant={getRoleBadgeVariant(safe)}>
            {text}
          </Badge>
        );
      }
    },
    {
      key: "status",
      title: translationMounted ? t('status') : "Status",
      sortable: true,
      render: (value: string) => {
        const safe = value || '';
        let text = safe ? safe.charAt(0).toUpperCase() + safe.slice(1) : '—';
        if (translationMounted && safe) {
          text = t(safe as any) || text;
        }
        return (
          <Badge variant={getStatusBadgeVariant(safe)}>
            {text}
          </Badge>
        );
      }
    },
    {
      key: "timezone",
      title: translationMounted ? t('timezone') : "Timezone",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm font-mono text-[color:var(--text-muted)]">
          {value || 'UTC'}
        </span>
      )
    },
    {
      key: "last_login",
      title: translationMounted ? t('lastLogin') : "Last Login",
      sortable: true,
      render: (value: string, row: User) => (
        <span className="text-sm text-[color:var(--text-muted)]">
          {formatDate(value, row.timezone)}
        </span>
      )
    },
    {
      key: "created_at",
      title: translationMounted ? t('created') : "Created",
      sortable: true,
      render: (value: string, row: User) => (
        <span className="text-sm text-[color:var(--text-muted)]">
          {formatDate(value, row.timezone)}
        </span>
      )
    },
    {
      key: "actions",
      title: translationMounted ? t('actions') : "Actions",
      render: (_: any, row: User) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            {translationMounted ? t('edit') : 'Edit'}
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
          {translationMounted ? t('users') : 'Users'}
        </h1>
        <Button onClick={handleCreate}>
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {translationMounted ? t('createUser') : 'Create User'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder={translationMounted ? t('searchUsers') : "Search users..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <Select
          placeholder={translationMounted ? t('filterByRole') : "Filter by role"}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: "", label: translationMounted ? t('allRoles') : "All Roles" },
            { value: "admin", label: translationMounted ? t('admin') : "Admin" },
            { value: "operator", label: translationMounted ? t('operator') : "Operator" },
            { value: "viewer", label: translationMounted ? t('viewer') : "Viewer" }
          ]}
        />
        <Select
          placeholder={translationMounted ? t('filterByStatus') : "Filter by status"}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: translationMounted ? t('allStatuses') : "All Statuses" },
            { value: "active", label: translationMounted ? t('active') : "Active" },
            { value: "inactive", label: translationMounted ? t('inactive') : "Inactive" },
            { value: "pending", label: translationMounted ? t('pending') : "Pending" }
          ]}
        />
        <div className="flex justify-end">
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {translationMounted ? t('refresh') : 'Refresh'}
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredAndSortedUsers}
        loading={loading}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDirection}
        empty={
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-[color:var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-[color:var(--text)]">
              {translationMounted ? `ไม่มี${t('users')}` : 'No users'}
            </h3>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              {translationMounted ? t('getStartedCreateUser') : 'Get started by creating a new user.'}
            </p>
            <div className="mt-6">
              <Button onClick={handleCreate}>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {translationMounted ? t('createUser') : 'Create User'}
              </Button>
            </div>
          </div>
        }
      />
      <Pagination page={page} size={size} total={total || users.length} onPageChange={(p)=>setPage(p)} onSizeChange={(s)=>{setPage(1); setSize(s);}} />

    </main>
  );
}