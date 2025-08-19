"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../../components/config";
import { UserForm } from "../../../../components/forms/UserForm";
import { useTranslation } from "../../../../hooks/useTranslation";

type UserFormData = {
  id?: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  status: "active" | "inactive" | "pending";
  timezone: string;
  tenant_id?: string;
  password?: string;
};

export default function CreateUserPage() {
  const router = useRouter();
  const { t, mounted: translationMounted } = useTranslation();
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (formData: UserFormData) => {
    try {
      setSubmitting(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": (formData.tenant_id || getTenantId())
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        router.push("/admin/users");
      }
    } catch (error) {
      console.error("Failed to create user:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/users");
  };

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
          {translationMounted ? t('backToUsers') : 'Back to Users'}
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('createNewUser') : 'Create New User'}
        </h1>
        <p className="text-[color:var(--text-muted)] mt-1">
          {translationMounted ? t('userDescription') : 'Add a new user to the system with appropriate role and permissions.'}
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-6">
          <UserForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={submitting}
          />
        </div>
      </div>
    </main>
  );
}
