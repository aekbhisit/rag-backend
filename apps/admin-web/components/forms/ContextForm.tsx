"use client";

import React from "react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { SimpleHtmlEditor } from "../ui/SimpleHtmlEditor";
import { Button } from "../Button";
import { Badge } from "../ui/Badge";
import { ImportBar } from "./ImportBar";
import { PlaceForm } from "./PlaceForm";
import { WebsiteForm } from "./WebsiteForm";
import { TicketForm } from "./TicketForm";
import { DocumentForm } from "./DocumentForm";

// import { KeywordEditor } from "../ui/KeywordEditor";
import { CategorySelector } from "../ui/CategorySelector";
import { IntentSelector } from "../ui/IntentSelector";

interface ContextFormData {
  id?: string;
  type: "place" | "website" | "ticket" | "document" | "text";
  title: string;
  body: string;
  instruction?: string;
  trust_level: number;
  status: "active" | "inactive";
  keywords?: string[];
  categories?: string[];
  intent_scopes?: string[];
  intent_actions?: string[];
  attributes: Record<string, any>;
}

interface EditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  description?: string;
}

interface ContextFormProps {
  initialData?: Partial<ContextFormData>;
  onSubmit: (data: ContextFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  editHistory?: EditLogEntry[];
}

const CONTEXT_TYPES = [
  { value: "place", label: "Place" },
  { value: "website", label: "Website" },
  { value: "ticket", label: "Ticket" },
  { value: "document", label: "Document" },
  { value: "text", label: "Text" }
];

const TRUST_LEVELS = [
  { value: "1", label: "1 - Low" },
  { value: "2", label: "2 - Medium" },
  { value: "3", label: "3 - High" },
  { value: "4", label: "4 - Verified" },
  { value: "5", label: "5 - Official" }
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

const TICKET_STATUSES = [
  { value: "on_sale", label: "On Sale" },
  { value: "sold_out", label: "Sold Out" },
  { value: "canceled", label: "Canceled" },
  { value: "past", label: "Past" }
];

export function ContextForm({ initialData, onSubmit, onCancel, loading = false, editHistory = [] }: ContextFormProps) {
  const [changeHistory, setChangeHistory] = React.useState<Array<{ id: string; field: string; oldValue: any; newValue: any; timestamp: string }>>([]);
  const [formData, setFormData] = React.useState<ContextFormData>({
    type: "place",
    title: "",
    body: "",
    instruction: "",
    trust_level: 3,
    status: "active",
    keywords: [],
    categories: [],
    intent_scopes: [],
    intent_actions: [],
    attributes: {},
    ...initialData
  });

  // Update form when initialData changes (for edit mode)
  React.useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Ensure attributes is properly merged
        attributes: {
          ...prev.attributes,
          ...initialData.attributes
        },
        // Ensure arrays are properly set
        keywords: initialData.keywords || [],
        categories: initialData.categories || [],
        intent_scopes: initialData.intent_scopes || [],
        intent_actions: initialData.intent_actions || []
      }));
      // Reset last committed snapshot to the loaded data so blur comparisons work
      lastCommittedRef.current = {
        title: initialData.title ?? '',
        body: initialData.body ?? '',
        instruction: initialData.instruction ?? '',
        type: (initialData as any).type ?? 'text',
        status: (initialData as any).status ?? 'active',
        trust_level: (initialData as any).trust_level ?? 0,
        keywords: initialData.keywords || [],
      } as Partial<ContextFormData>;
    }
  }, [initialData]);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  // Embedding input size guardrails (OpenAI text-embedding-3-small default ≈ 8191 tokens ≈ ~32k chars)
  // Hard combined character limit (Title + Keywords + Body)
  const MAX_COMBINED_CHARS = 10000;
  // Token estimate helpers (kept for user feedback)
  const MAX_EMBED_TOKENS = 8191;
  const CHARS_PER_TOKEN_APPROX = 4; // rough average
  const SAFETY_FACTOR = 0.95; // keep a 5% headroom for tokens
  const MAX_ALLOWED_TOKENS = Math.floor(MAX_EMBED_TOKENS * SAFETY_FACTOR);
  // Keep a snapshot of last committed values
  const lastCommittedRef = React.useRef<Partial<ContextFormData>>({
    title: formData.title,
    body: formData.body,
    instruction: formData.instruction,
    type: formData.type,
    status: formData.status,
    trust_level: formData.trust_level,
    keywords: formData.keywords,
  });

  const handleImport = (type: string, importedData: any) => {
    setFormData(prev => {
      const importedTitle = importedData?.title || '';
      const importedBody = (importedData?.body || '').toString();
      const isTicket = (type === 'ticket' || prev.type === 'ticket');
      const isOcr = !!importedData?.attributes?.ocr_provider;

      // Combine body for ticket: append new content instead of overwriting
      let combinedBody = prev.body || '';
      if (isTicket) {
        if (importedBody && combinedBody.trim().length > 0) {
          // Avoid duplicate exact content
          if (combinedBody.trim() !== importedBody.trim()) {
            const sectionTitle = isOcr ? 'Ticket OCR' : 'Event Page';
            const sectionHeader = `\n\n---\n\n## ${sectionTitle}\n\n`;
            combinedBody = combinedBody + sectionHeader + importedBody;
          }
        } else if (importedBody) {
          combinedBody = importedBody;
        }
      } else {
        // Non-ticket: default overwrite behavior only if imported body provided
        combinedBody = importedBody || prev.body || '';
      }

      return {
        ...prev,
        title: prev.title && prev.title.trim().length > 0 ? prev.title : importedTitle || prev.title,
        body: combinedBody,
        attributes: {
          ...prev.attributes,
          ...(importedData?.attributes || {})
        }
      };
    });
  };

  const updateField = (field: keyof ContextFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const commitField = (field: keyof ContextFormData, value: any) => {
    const prev = (lastCommittedRef.current as any)[field];
    if (JSON.stringify(prev ?? null) !== JSON.stringify(value ?? null)) {
      setChangeHistory(h => [
        {
          id: Math.random().toString(36).slice(2),
          field: String(field),
          oldValue: prev,
          newValue: value,
          timestamp: new Date().toISOString()
        },
        ...h
      ].slice(0, 50));
      (lastCommittedRef.current as any)[field] = value;
    }
  };
  const parseKeywords = (text: string): string[] => {
    const plain = text
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');
    return plain
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
  };

  const getPlainText = (html: string): string => {
    return (html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const estimateTokens = (s: string): number => {
    const chars = (s || '').length;
    return Math.ceil(chars / CHARS_PER_TOKEN_APPROX);
  };

  const getKeywordsPlain = (): string => (formData.keywords || []).join(', ');

  const updateAttribute = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value }
    }));
  };



  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.body.trim()) newErrors.body = "Body is required";
    if (formData.trust_level < 1 || formData.trust_level > 5) {
      newErrors.trust_level = "Trust level must be between 1 and 5";
    }

    // Type-specific validation
    if (formData.type === "place") {
      const { lat, lon, address } = formData.attributes;
      if (!address) newErrors["attributes.address"] = "Address is required for places";
      if (lat !== undefined && (lat < -90 || lat > 90)) {
        newErrors["attributes.lat"] = "Latitude must be between -90 and 90";
      }
      if (lon !== undefined && (lon < -180 || lon > 180)) {
        newErrors["attributes.lon"] = "Longitude must be between -180 and 180";
      }
    }

    if (formData.type === "website") {
      const { url } = formData.attributes;
      if (!url) newErrors["attributes.url"] = "URL is required for websites";
      else if (!/^https?:\/\/.+/.test(url)) {
        newErrors["attributes.url"] = "URL must start with http:// or https://";
      }
    }

    if (formData.type === "ticket") {
      const { price, location, event_time } = formData.attributes;
      if (price !== undefined && price < 0) {
        newErrors["attributes.price"] = "Price cannot be negative";
      }
      if (!location) newErrors["attributes.location"] = "Location is required for tickets";
      if (!event_time) newErrors["attributes.event_time"] = "Event time is required for tickets";
    }

    if (formData.type === "document") {
      const { source_uri, page } = formData.attributes;
      if (!source_uri) newErrors["attributes.source_uri"] = "Source URI is required for document chunks";
      if (page !== undefined && page < 1) {
        newErrors["attributes.page"] = "Page number must be positive";
      }
    }

    // Combined character constraint: Title + Keywords + Body
    const combinedPlain = [formData.title, getKeywordsPlain(), getPlainText(formData.body)].filter(Boolean).join(' \n\n');
    if (combinedPlain.length > MAX_COMBINED_CHARS) {
      newErrors["body"] = `Combined Title/Keywords/Body exceeds ${MAX_COMBINED_CHARS} characters (currently ${combinedPlain.length}). Please shorten content.`;
    }
    // Embedding token constraint (advisory)
    const approxTokens = estimateTokens(combinedPlain);
    if (approxTokens > MAX_ALLOWED_TOKENS) {
      newErrors["body"] = `Combined Title/Keywords/Body is too long for embedding (~${approxTokens} tokens > ${MAX_ALLOWED_TOKENS} allowed). Please shorten content.`;
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

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case "place":
        return (
          <PlaceForm
            attributes={formData.attributes}
            errors={errors}
            onUpdate={updateAttribute}
          />
        );

      case "website":
        return (
          <WebsiteForm
            attributes={formData.attributes}
            errors={errors}
            onUpdate={updateAttribute}
          />
        );

      case "ticket":
        return (
          <TicketForm
            attributes={formData.attributes}
            errors={errors}
            onUpdate={updateAttribute}
          />
        );

      case "document":
        return (
          <DocumentForm
            attributes={formData.attributes}
            errors={errors}
            onUpdate={updateAttribute}
          />
        );
      case "text":
        // No extra fields beyond general ones
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      {/* Main Form - Left Side */}
      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Type *"
            value={formData.type}
            onChange={(e) => updateField("type", e.target.value)}
            onBlur={(e) => commitField("type", e.target.value)}
            options={CONTEXT_TYPES}
          />
          <Select
            label="Trust Level *"
            value={String(formData.trust_level)}
            onChange={(e) => updateField("trust_level", parseInt(e.target.value))}
            onBlur={(e) => commitField("trust_level", parseInt(e.target.value))}
            options={TRUST_LEVELS}
            error={errors.trust_level}
          />
          <Select
            label="Status *"
            value={formData.status}
            onChange={(e) => updateField("status", e.target.value)}
            onBlur={(e) => commitField("status", e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>

        {/* Import Bar - Show after type selection */}
        <ImportBar
          contextType={formData.type}
          onImport={handleImport}
          loading={loading}
        />

        {/* Common Fields for All Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[color:var(--text)] border-b border-[color:var(--border)] pb-2">
            Basic Information
          </h3>
          <div className="text-xs text-[color:var(--text-muted)]">
            Limit: {MAX_COMBINED_CHARS.toLocaleString()} characters combined (Title + Keywords + Body). Also ~{MAX_ALLOWED_TOKENS} tokens with headroom.
          </div>
          
          <Input
            label="Title *"
            value={formData.title}
            onChange={(e) => updateField("title", e.target.value)}
            onBlur={(e) => commitField("title", e.target.value)}
            error={errors.title}
            placeholder="Enter a descriptive title"
          />

          <SimpleHtmlEditor
            label="Body *"
            value={formData.body}
            onChange={(v) => updateField("body", v)}
            onBlurCapture={() => commitField("body", formData.body)}
            error={errors.body}
            placeholder="Write content here..."
            rows={5}
          />
          <div className="flex justify-between text-xs text-[color:var(--text-muted)]">
            <span>Body chars: {getPlainText(formData.body).length.toLocaleString()} / {MAX_COMBINED_CHARS.toLocaleString()}</span>
            <span>~{estimateTokens([formData.title, getKeywordsPlain(), getPlainText(formData.body)].filter(Boolean).join(' \n\n'))} tokens</span>
          </div>

          <SimpleHtmlEditor
            label="Keywords"
            value={(formData.keywords || []).join(", ")}
            onChange={(v) => updateField("keywords", parseKeywords(v))}
            onBlurCapture={() => commitField("keywords", formData.keywords)}
            placeholder="Comma/newline separated keywords"
            hint="Separate by comma or newline. Duplicates are removed automatically."
            rows={5}
          />
          <div className="text-right text-xs text-[color:var(--text-muted)]">
            Keywords chars: {getKeywordsPlain().length.toLocaleString()} / {MAX_COMBINED_CHARS.toLocaleString()}
          </div>

          <SimpleHtmlEditor
            label="Instruction"
            value={formData.instruction || ""}
            onChange={(v) => updateField("instruction", v)}
            onBlurCapture={() => commitField("instruction", formData.instruction)}
            placeholder="Guidance for AI"
            hint="Use toolbar to format"
            rows={5}
          />
        </div>

        {/* Type-Specific Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[color:var(--text)] border-b border-[color:var(--border)] pb-2">
            {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} Specific Details
          </h3>
          {renderTypeSpecificFields()}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-[color:var(--border)]">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {initialData?.id ? "Update" : "Create"} Context
          </Button>
        </div>
      </form>

      {/* Right Sidebar */}
      <div className="space-y-6">
        {/* Category & Intent Configuration */}
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Classification</h3>
          
          <div className="space-y-4">
            {/* Category Selection */}
            <CategorySelector
              label="Categories"
              selectedCategories={formData.categories || []}
              onCategoriesChange={(categories) => updateField("categories", categories)}
              maxSelections={5}
            />

            {/* Intent Configuration */}
            <IntentSelector
              selectedScopes={formData.intent_scopes || []}
              selectedActions={formData.intent_actions || []}
              onScopesChange={(scopes) => updateField("intent_scopes", scopes)}
              onActionsChange={(actions) => updateField("intent_actions", actions)}
              maxScopes={3}
              maxActions={10}
            />

            {/* Change History (this session) */}
            <div className="mt-4 border-t border-[color:var(--border)] pt-3">
              <h4 className="text-sm font-medium text-[color:var(--text)] mb-2">Recent Changes (this session)</h4>
              {changeHistory.length === 0 ? (
                <div className="text-xs text-[color:var(--text-muted)]">No changes yet</div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {changeHistory.map(item => (
                    <div key={item.id} className="text-xs text-[color:var(--text-muted)]">
                      <span className="font-medium text-[color:var(--text)]">{item.field}</span>
                      : updated at {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edit History (server) */}
            <div className="mt-4 border-t border-[color:var(--border)] pt-3">
              <h4 className="text-sm font-medium text-[color:var(--text)] mb-2">Edit History</h4>
              {(!editHistory || editHistory.length === 0) ? (
                <div className="text-xs text-[color:var(--text-muted)]">No edit history</div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {editHistory.map((entry) => (
                    <div key={entry.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[color:var(--text)]">{entry.action}</span>
                        <span className="text-[color:var(--text-muted)]">{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      {entry.field && (
                        <div className="text-[color:var(--text-muted)]">Field: {entry.field}</div>
                      )}
                      {entry.description && (
                        <div className="text-[color:var(--text)]">{entry.description}</div>
                      )}
                      {(entry.oldValue || entry.newValue) && (
                        <div className="mt-1">
                          {entry.oldValue && <div className="text-red-600">- {entry.oldValue}</div>}
                          {entry.newValue && <div className="text-green-600">+ {entry.newValue}</div>}
                        </div>
                      )}
                      <div className="text-[color:var(--text-muted)]">{entry.user}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
