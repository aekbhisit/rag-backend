"use client";

import React from "react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { BACKEND_URL } from "../config";
import { Button } from "../Button";
import { TIMEZONE_OPTIONS } from "../../utils/timezone";
import { useTranslation } from "../../hooks/useTranslation";

interface UserFormData {
  id?: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  status: "active" | "inactive" | "pending";
  timezone: string;
  tenant_id?: string;
  password?: string;
}

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const USER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operator" },
  { value: "viewer", label: "Viewer" }
];

const USER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" }
];

export function UserForm({ initialData, onSubmit, onCancel, loading = false }: UserFormProps) {
  const { t, mounted: translationMounted } = useTranslation();
  const [formData, setFormData] = React.useState<UserFormData>({
    name: "",
    email: "",
    role: "viewer",
    status: "pending",
    timezone: "UTC",
    password: "",
    ...initialData
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [tenants, setTenants] = React.useState<Array<{ id: string; name: string }>>([]);

  React.useEffect(() => {
    const fetchTenants = async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/admin/tenants`);
        const data = await r.json();
        setTenants(Array.isArray(data.items) ? data.items.map((t: any) => ({ id: t.id, name: t.name })) : []);
        if (!initialData?.tenant_id && data.items?.[0]?.id) {
          setFormData(prev => ({ ...prev, tenant_id: data.items[0].id }));
        }
      } catch {}
    };
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep form state in sync when initialData loads asynchronously
  React.useEffect(() => {
    if (!initialData) return;
    setFormData(prev => ({
      ...prev,
      id: initialData.id ?? prev.id,
      name: initialData.name ?? prev.name,
      email: initialData.email ?? prev.email,
      role: (initialData.role as any) ?? prev.role,
      status: (initialData.status as any) ?? prev.status,
      timezone: initialData.timezone ?? prev.timezone,
      tenant_id: initialData.tenant_id ?? prev.tenant_id,
      password: "",
    }));
  }, [initialData]);

  const updateField = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.tenant_id) newErrors.tenant_id = translationMounted ? t('tenantRequired') : "Tenant is required";

    if (!formData.name.trim()) newErrors.name = translationMounted ? t('nameRequired') : "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = translationMounted ? t('emailRequired') : "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = translationMounted ? t('validEmailAddress') : "Please enter a valid email address";
    }

    // password validation: required for create; optional for edit (if provided, min 6)
    const isEdit = Boolean(initialData?.id);
    if (!isEdit) {
      if (!(formData.password || "").trim()) newErrors.password = translationMounted ? t('passwordRequired') : "Password is required";
      else if ((formData.password || '').length < 6) newErrors.password = translationMounted ? t('atLeast6Characters') : "At least 6 characters";
    } else if ((formData.password || '').length > 0 && (formData.password || '').length < 6) {
      newErrors.password = translationMounted ? t('atLeast6Characters') : "At least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label={translationMounted ? t('name') : "Name *"}
        value={formData.name}
        onChange={(e) => updateField("name", e.target.value)}
        error={errors.name}
        placeholder={translationMounted ? t('enterFullName') : "Enter full name"}
      />

      <Input
        label={translationMounted ? t('email') : "Email *"}
        type="email"
        value={formData.email}
        onChange={(e) => updateField("email", e.target.value)}
        error={errors.email}
        placeholder={translationMounted ? t('userExampleEmail') : "user@example.com"}
      />

      <Select
        label={translationMounted ? t('tenant') : "Tenant *"}
        value={formData.tenant_id || ""}
        onChange={(e) => updateField("tenant_id", e.target.value)}
        options={[{ value: "", label: translationMounted ? t('selectTenant') : "Select tenant" }, ...tenants.map(t => ({ value: t.id, label: t.name }))]}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label={translationMounted ? t('role') : "Role *"}
          value={formData.role}
          onChange={(e) => updateField("role", e.target.value)}
          options={USER_ROLES}
        />
        <Select
          label={translationMounted ? t('status') : "Status *"}
          value={formData.status}
          onChange={(e) => updateField("status", e.target.value)}
          options={USER_STATUSES}
        />
      </div>

      <Select
        label={translationMounted ? t('timezone') : "Timezone *"}
        value={formData.timezone}
        onChange={(e) => updateField("timezone", e.target.value)}
        options={TIMEZONE_OPTIONS}
      />

      <Input
        label={initialData?.id ? (translationMounted ? t('password') : "Password") : (translationMounted ? t('password') : "Password *")}
        type="password"
        value={formData.password || ""}
        onChange={(e) => updateField("password", e.target.value)}
        error={errors.password}
        placeholder={initialData?.id ? (translationMounted ? t('leaveBlankToKeep') : "Leave blank to keep current password") : (translationMounted ? t('enterNewPassword') : "Enter a new password")}
        hint={initialData?.id ? (translationMounted ? t('leaveBlankToKeep') : "Leave blank to keep current password") : undefined}
      />

      <div className="flex justify-end space-x-3 pt-4 border-t border-[color:var(--border)]">
        <Button type="button" variant="outline" onClick={onCancel}>
          {translationMounted ? t('cancel') : "Cancel"}
        </Button>
        <Button type="submit" loading={loading}>
          {initialData?.id ? (translationMounted ? t('updateUser') : "Update") : (translationMounted ? t('createUser') : "Create")} {translationMounted ? t('auditUser') : "User"}
        </Button>
      </div>
    </form>
  );
}
