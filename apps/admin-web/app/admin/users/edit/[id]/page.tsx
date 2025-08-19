"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { BACKEND_URL, DEFAULT_TENANT_ID, getTenantId } from "../../../../../components/config";
import { UserForm } from "../../../../../components/forms/UserForm";
import { useTranslation } from "../../../../../hooks/useTranslation";

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

type UserFormData = {
  id?: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  status: "active" | "inactive" | "pending";
  tenant_id?: string;
  password?: string;
};

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { t, mounted: translationMounted } = useTranslation();
  const id = React.useMemo(() => {
    const raw: any = (params as any)?.id;
    if (Array.isArray(raw)) return raw[0] as string;
    return (raw as string) || "";
  }, [params]);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      if (!id) return;
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${id}`, {
        headers: { "X-Tenant-ID": getTenantId() }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.item);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: UserFormData) => {
    try {
      setSubmitting(true);
      // Only include password if it has a value (for updates)
      const { password, ...rest } = formData;
      const payload = password && password.trim().length > 0 ? formData : rest;
      
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": getTenantId()
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        router.push("/admin/users");
      }
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/users");
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-[color:var(--surface-muted)] rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-[color:var(--surface-muted)] rounded w-1/2 mb-8"></div>
          <div className="max-w-2xl">
            <div className="h-96 bg-[color:var(--surface-muted)] rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-[color:var(--text)]">
            {translationMounted ? t('userNotFound') : "User Not Found"}
          </h1>
          <p className="text-[color:var(--text-muted)] mt-2">
            {translationMounted ? t('userNotFoundMessage') : "The user you're looking for doesn't exist."}
          </p>
          <button
            onClick={handleCancel}
            className="mt-4 px-4 py-2 bg-[color:var(--primary)] text-[color:var(--on-primary)] rounded-lg"
          >
            {translationMounted ? t('backToUsers') : "Back to Users"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {translationMounted ? t('backToUsers') : "Back to Users"}
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('editUser') : "Edit User"}
        </h1>
        <p className="text-[color:var(--text-muted)] mt-1">
          {translationMounted ? t('modifyUserDetails') : "Modify user details and permissions."}
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-6">
          <UserForm
            initialData={user}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={submitting}
          />
        </div>
      </div>
    </main>
  );
}
