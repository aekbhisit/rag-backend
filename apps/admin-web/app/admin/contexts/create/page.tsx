"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../../components/config";
import { ContextForm } from "../../../../components/forms/ContextForm";

// Mock edit history data for template creation
const mockEditHistory = [
  {
    id: "1",
    action: "Template Created",
    user: "System",
    timestamp: "2024-01-15 10:30:00",
    details: "Initial context template created",
    changes: []
  },
  {
    id: "2",
    action: "Field Added",
    user: "Admin User",
    timestamp: "2024-01-15 10:32:15",
    details: "Added instruction field template",
    changes: [
      { field: "instruction", oldValue: "", newValue: "Template placeholder" }
    ]
  },
  {
    id: "3",
    action: "Validation Added",
    user: "System",
    timestamp: "2024-01-15 10:35:22",
    details: "Added form validation rules",
    changes: [
      { field: "title", oldValue: "", newValue: "Required field" },
      { field: "type", oldValue: "", newValue: "Required selection" }
    ]
  },
  {
    id: "4",
    action: "Type Templates",
    user: "Admin User", 
    timestamp: "2024-01-15 10:40:10",
    details: "Added context type templates",
    changes: [
      { field: "place", oldValue: "", newValue: "Location-based context template" },
      { field: "website", oldValue: "", newValue: "Web content template" },
      { field: "ticket", oldValue: "", newValue: "Support ticket template" },
      { field: "doc_chunk", oldValue: "", newValue: "Document chunk template" }
    ]
  }
];

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

export default function CreateContextPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (formData: ContextFormData) => {
    try {
      setSubmitting(true);
      
      const response = await fetch(`${BACKEND_URL}/api/admin/contexts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": getTenantId()
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        router.push("/admin/contexts");
      } else {
        console.error("Failed to create context");
      }
    } catch (error) {
      console.error("Failed to create context:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/contexts");
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
          Back to Contexts
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Create New Context</h1>
        <p className="text-[color:var(--text-muted)] mt-1">
          Add a new context to your knowledge base with type-specific attributes and instructions.
        </p>
      </div>

      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-6 w-full">
        <ContextForm
          initialData={{
            type: "website",
            trust_level: 3,
            status: "active",
            attributes: { analyze: true }
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={submitting}
        />
      </div>
    </main>
  );
}
