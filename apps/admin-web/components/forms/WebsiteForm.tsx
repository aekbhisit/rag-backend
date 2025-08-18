"use client";

import React from "react";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

interface WebsiteFormProps {
  attributes: Record<string, any>;
  errors: Record<string, string>;
  onUpdate: (key: string, value: any) => void;
}

export function WebsiteForm({ attributes, errors, onUpdate }: WebsiteFormProps) {
  const [urlPreview, setUrlPreview] = React.useState<string>("");
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (attributes.url) {
      try {
        const url = new URL(attributes.url);
        onUpdate("domain", url.hostname);
        setUrlPreview(url.origin);
      } catch {
        // Invalid URL
        setUrlPreview("");
      }
    }
  }, [attributes.url]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          label="URL *"
          value={attributes.url || ""}
          onChange={(e) => onUpdate("url", e.target.value)}
          error={errors["attributes.url"]}
          placeholder="https://example.com/page"
        />
        {urlPreview && (
          <div className="text-xs text-[color:var(--text-muted)]">
            Preview: <span className="font-mono bg-gray-100 px-1 rounded">{urlPreview}</span>
          </div>
        )}
      </div>
      {/* Simple toggle */}
      <div className="flex items-center gap-2">
        <input
          id="website-analyze"
          type="checkbox"
          checked={attributes.analyze !== false}
          onChange={(e) => onUpdate("analyze", e.target.checked)}
        />
        <label htmlFor="website-analyze" className="text-sm text-[color:var(--text)]">
          Auto-extract content and metadata (recommended)
        </label>
      </div>

      {/* Advanced - collapsed by default */}
      <div className="border border-[color:var(--border)] rounded-md">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-hover)]"
          onClick={() => setShowAdvanced((s) => !s)}
        >
          Advanced
          <span>{showAdvanced ? "▲" : "▼"}</span>
        </button>
        {showAdvanced && (
          <div className="p-3 space-y-3">
            <Input label="Domain" value={attributes.domain || ""} onChange={(e) => onUpdate("domain", e.target.value)} placeholder="example.com" hint="Auto-extracted from URL" />
            <Input label="Page Title" value={attributes.page_title || ""} onChange={(e) => onUpdate("page_title", e.target.value)} placeholder="<title>" />
            <Textarea label="Meta Description" value={attributes.meta_description || ""} onChange={(e) => onUpdate("meta_description", e.target.value)} rows={2} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="Content Type" value={attributes.content_type || ""} onChange={(e) => onUpdate("content_type", e.target.value)} placeholder="text/html" />
              <Input label="Charset" value={attributes.charset || ""} onChange={(e) => onUpdate("charset", e.target.value)} placeholder="utf-8" />
              <Input label="Status Code" type="number" value={attributes.status_code || ""} onChange={(e) => onUpdate("status_code", e.target.value ? parseInt(e.target.value) : undefined)} placeholder="200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Last Crawled" type="datetime-local" value={attributes.last_crawled || ""} onChange={(e) => onUpdate("last_crawled", e.target.value)} />
              <Input label="Response Time (ms)" type="number" value={attributes.response_time || ""} onChange={(e) => onUpdate("response_time", e.target.value ? parseInt(e.target.value) : undefined)} placeholder="250" />
            </div>
            <Input label="User Agent" value={attributes.user_agent || ""} onChange={(e) => onUpdate("user_agent", e.target.value)} placeholder="Custom UA (optional)" />
          </div>
        )}
      </div>
    </div>
  );
}
