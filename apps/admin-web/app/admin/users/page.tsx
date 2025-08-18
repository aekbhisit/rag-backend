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

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  status: "active" | "inactive" | "pending";
  tenant_id: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
};

export default function UsersPage() {
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
    const ok = await dialog.confirm({ title: 'Delete User', description: 'Are you sure you want to delete this user?', confirmText: 'Delete', variant: 'danger' });
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
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const columns = [
    {
      key: "name",
      title: "Name",
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
      title: "Role",
      sortable: true,
      render: (value: string) => {
        const safe = value || '';
        const text = safe ? safe.charAt(0).toUpperCase() + safe.slice(1) : '—';
        return (
          <Badge variant={getRoleBadgeVariant(safe)}>
            {text}
          </Badge>
        );
      }
    },
    {
      key: "status",
      title: "Status",
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
    },
    {
      key: "last_login",
      title: "Last Login",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-[color:var(--text-muted)]">
          {formatDate(value)}
        </span>
      )
    },
    {
      key: "created_at",
      title: "Created",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-[color:var(--text-muted)]">
          {formatDate(value)}
        </span>
      )
    },
    {
      key: "actions",
      title: "Actions",
      render: (_: any, row: User) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleDelete(row.id)}
            className="text-[color:var(--error)] hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button onClick={handleCreate}>
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <Select
          placeholder="Filter by role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: "", label: "All Roles" },
            { value: "admin", label: "Admin" },
            { value: "operator", label: "Operator" },
            { value: "viewer", label: "Viewer" }
          ]}
        />
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Statuses" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "pending", label: "Pending" }
          ]}
        />
        <div className="flex justify-end">
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
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
            <h3 className="mt-2 text-sm font-medium text-[color:var(--text)]">No users</h3>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">Get started by creating a new user.</p>
            <div className="mt-6">
              <Button onClick={handleCreate}>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create User
              </Button>
            </div>
          </div>
        }
      />
      <Pagination page={page} size={size} total={total || users.length} onPageChange={(p)=>setPage(p)} onSizeChange={(s)=>{setPage(1); setSize(s);}} />

    </main>
  );
}