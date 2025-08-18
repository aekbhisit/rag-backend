"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../../../components/config";
import { ContextForm } from "../../../../../components/forms/ContextForm";

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

type ContextFormData = {
  id?: string;
  type: "place" | "website" | "ticket" | "document" | "text";
  title: string;
  body: string;
  instruction?: string;
  trust_level: number;
  language?: string;
  attributes: Record<string, any>;
  intent_scopes?: string[];
};

type EditLogEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  description: string;
};

export default function EditContextPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Unwrap Next.js app router params Promise
  const { id } = React.use(params);
  const [context, setContext] = React.useState<Context | null>(null);
  const [editHistory, setEditHistory] = React.useState<EditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetchContext();
    fetchEditHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchContext = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/contexts/${id}`, {
        headers: { "X-Tenant-ID": getTenantId() },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setContext(data as Context);
      if (Array.isArray((data as any)._edit_history)) {
        setEditHistory((data as any)._edit_history.map((h: any) => ({
          id: h.id,
          timestamp: h.created_at,
          user: h.user_email || 'system',
          action: h.action || 'UPDATE',
          field: h.field || undefined,
          oldValue: h.old_value || undefined,
          newValue: h.new_value || undefined,
          description: h.description || ''
        })));
      }
    } catch (error) {
      console.error("Failed to fetch context:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEditHistory = async () => {
    try {
      // Mock edit history data
      const mockHistory: EditLogEntry[] = [
        {
          id: "1",
          timestamp: "2024-01-15T14:30:00Z",
          user: "admin@example.com",
          action: "UPDATE",
          field: "instruction",
          oldValue: "Basic shopping mall information",
          newValue: "Mention opening hours and location when discussing this place",
          description: "Updated instruction field with more specific guidance"
        },
        {
          id: "2",
          timestamp: "2024-01-15T12:15:00Z",
          user: "operator@example.com",
          action: "UPDATE",
          field: "trust_level",
          oldValue: "3",
          newValue: "4",
          description: "Increased trust level after verification"
        },
        {
          id: "3",
          timestamp: "2024-01-15T10:30:00Z",
          user: "admin@example.com",
          action: "UPDATE",
          field: "attributes.phone",
          oldValue: "+66 2 635 1000",
          newValue: "+66 2 635 1111",
          description: "Corrected phone number"
        },
        {
          id: "4",
          timestamp: "2024-01-15T10:00:00Z",
          user: "admin@example.com",
          action: "CREATE",
          description: "Initial context creation"
        }
      ];
      setEditHistory(mockHistory);
    } catch (error) {
      console.error("Failed to fetch edit history:", error);
    }
  };

  const handleSubmit = async (formData: ContextFormData) => {
    try {
      setSubmitting(true);
      
      const response = await fetch(`${BACKEND_URL}/api/admin/contexts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": getTenantId()
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        router.push("/admin/contexts");
      } else {
        console.error("Failed to update context");
      }
    } catch (error) {
      console.error("Failed to update context:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/contexts");
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
      default:
        return (
          <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-[color:var(--surface-muted)] rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-[color:var(--surface-muted)] rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-96 bg-[color:var(--surface-muted)] rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-64 bg-[color:var(--surface-muted)] rounded"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-[color:var(--text)]">Context Not Found</h1>
          <p className="text-[color:var(--text-muted)] mt-2">The context you're looking for doesn't exist.</p>
          <button
            onClick={handleCancel}
            className="mt-4 px-4 py-2 bg-[color:var(--primary)] text-[color:var(--on-primary)] rounded-lg"
          >
            Back to Contexts
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
          Back to Contexts
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Edit Context</h1>
        <p className="text-[color:var(--text-muted)] mt-1">
          Modify context details and view edit history.
        </p>
      </div>

      <div className="w-full">
        {/* Main Form */}
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-6 w-full">
          <ContextForm
            initialData={context}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={submitting}
            editHistory={editHistory}
          />
        </div>
      </div>
    </main>
  );
}
