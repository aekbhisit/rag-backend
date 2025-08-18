"use client";

import React from "react";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

interface DocumentFormProps {
  attributes: Record<string, any>;
  errors: Record<string, string>;
  onUpdate: (key: string, value: any) => void;
}

export function DocumentForm({ attributes, errors, onUpdate }: DocumentFormProps) {
  const [headingsList, setHeadingsList] = React.useState(() => Array.isArray(attributes.headings) ? attributes.headings.join('\n') : '');
  const [tagsList, setTagsList] = React.useState(() => Array.isArray(attributes.tags) ? attributes.tags.join(', ') : '');
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const autoDetect = attributes.analyze !== false;

  const handleHeadingsChange = (value: string) => {
    setHeadingsList(value);
    const headings = value.split('\n').map(h => h.trim()).filter(h => h);
    onUpdate("headings", headings.length > 0 ? headings : undefined);
  };

  const handleTagsChange = (value: string) => {
    setTagsList(value);
    const tags = value.split(',').map(t => t.trim()).filter(t => t);
    onUpdate("tags", tags.length > 0 ? tags : undefined);
  };

  return (
    <div className="space-y-4">
      {/* Source is handled by Quick Import (file or URL). If present, show reference only. */}
      {attributes.source_uri && (
        <div className="text-xs text-[color:var(--text-muted)]">
          Source: <span className="font-mono bg-gray-100 px-1 rounded">{attributes.source_uri}</span>
        </div>
      )}

      {/* Auto-extract toggle */}
      <div className="flex items-center gap-2">
        <input
          id="doc-analyze"
          type="checkbox"
          checked={attributes.analyze !== false}
          onChange={(e) => onUpdate("analyze", e.target.checked)}
        />
        <label htmlFor="doc-analyze" className="text-sm text-[color:var(--text)]">
          Auto-extract document details (recommended)
        </label>
      </div>

      {/* (Moved) Minimal Metadata will be shown inside Advanced section */}

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
          <div className="p-3 space-y-4">
            {/* Minimal Metadata */}
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Page Number"
                type="number"
                min="1"
                value={attributes.page || ""}
                onChange={(e) => onUpdate("page", e.target.value ? parseInt(e.target.value) : undefined)}
                error={errors["attributes.page"]}
                placeholder="1"
              />
              <Input
                label="Total Pages"
                type="number"
                min="1"
                value={attributes.total_pages || ""}
                onChange={(e) => onUpdate("total_pages", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="100"
              />
              <Input
                label="Chapter/Section"
                value={attributes.chapter || ""}
                onChange={(e) => onUpdate("chapter", e.target.value)}
                placeholder="Chapter 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Document Title" value={attributes.document_title || ""} onChange={(e) => onUpdate("document_title", e.target.value)} placeholder="Full document title" />
              <Input label="Document Type" value={attributes.document_type || ""} onChange={(e) => onUpdate("document_type", e.target.value)} placeholder="Manual, Guide, Report, etc." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Author" value={attributes.author || ""} onChange={(e) => onUpdate("author", e.target.value)} placeholder="Document author" />
              <Input label="Version" value={attributes.version || ""} onChange={(e) => onUpdate("version", e.target.value)} placeholder="1.0.0" />
              <Input label="Publication Date" type="date" value={attributes.publication_date || ""} onChange={(e) => onUpdate("publication_date", e.target.value)} />
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-[color:var(--text)] border-b border-[color:var(--border)] pb-2">Content Structure</h4>
              <Textarea
                label="Document Headings"
                value={headingsList}
                onChange={(e) => handleHeadingsChange(e.target.value)}
                placeholder="Chapter 1: Introduction&#10;Section 1.1: Overview&#10;Section 1.2: Getting Started"
                rows={4}
                hint="One heading per line - helps with content navigation"
              />
              <Input
                label="Tags"
                value={tagsList}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="documentation, guide, api, tutorial"
                hint="Comma-separated tags for categorization"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
