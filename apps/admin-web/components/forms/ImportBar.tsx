"use client";

import React from "react";
import { BACKEND_URL, DEFAULT_TENANT_ID } from "../../components/config";
import { Button } from "../Button";

interface ImportBarProps {
  contextType: "place" | "website" | "ticket" | "document" | "text";
  onImport: (type: string, data: any) => void;
  loading?: boolean;
}

export function ImportBar({ contextType, onImport, loading = false }: ImportBarProps) {
  const [importUrl, setImportUrl] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [preferFirecrawlFirst, setPreferFirecrawlFirst] = React.useState(false);
  const [engine, setEngine] = React.useState<'auto_local_first' | 'auto_firecrawl_first' | 'local' | 'firecrawl'>('auto_local_first');
  const [ticketOcrUploading, setTicketOcrUploading] = React.useState(false);
  const documentInputRef = React.useRef<HTMLInputElement | null>(null);
  const ticketInputRef = React.useRef<HTMLInputElement | null>(null);

  const getPlaceholder = () => {
    switch (contextType) {
      case "place":
        return "Paste Google Maps URL (e.g., https://goo.gl/maps/...)";
      case "website":
        return "Enter website URL to scrape content";
      case "ticket":
        return "Enter event page URL (same as website import)";
      case "document":
        return "Enter document URL to import";
      case "text":
        return "Paste text or leave blank (no import)";
      default:
        return "Enter import source";
    }
  };

  const getImportLabel = () => {
    switch (contextType) {
      case "place":
        return "Import from Google Maps";
      case "website":
        return "Scrape Website";
      case "ticket":
        return "Import Event Detail";
      case "document":
        return "Import Document";
      case "text":
        return "Import Text";
      default:
        return "Import Data";
    }
  };

  const handleImport = async () => {
    // For documents, allow file OR URL
    if (contextType === 'document' && file) {
      const name = file.name;
      const sizeKB = Math.round(file.size / 1024);
      const type = file.type || '';
      onImport('document', { source_uri: name, file_format: type, file_size: sizeKB });
      setFile(null);
      setImportUrl("");
      return;
    }
    if (!importUrl.trim()) return;

    setImporting(true);
    try {
      // Call the appropriate import service based on context type
      const path = contextType === 'document' ? 'doc_chunk' : (contextType === 'ticket' ? 'website' : contextType);
      const response = await fetch(`${BACKEND_URL}/api/admin/import/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": DEFAULT_TENANT_ID
        },
        body: JSON.stringify(
          (contextType === 'website' || contextType === 'ticket')
            ? { url: importUrl, preferFirecrawlFirst, engine }
            : { url: importUrl }
        )
      });

      if (response.ok) {
        const data = await response.json();
        // For ticket: map website import fields to ticket attributes (source_url)
        if (contextType === 'ticket') {
          const mapped = {
            ...data,
            attributes: {
              ...data.attributes,
              source_url: data?.attributes?.url || importUrl,
            }
          };
          onImport('ticket', mapped);
        } else {
          onImport(contextType, data);
        }
        setImportUrl("");
      } else {
        console.error("Import failed:", await response.text());
        // TODO: Show error notification
      }
    } catch (error) {
      console.error("Import error:", error);
      // TODO: Show error notification
    } finally {
      setImporting(false);
    }
  };

  const handleTicketOcr = async (file: File) => {
    try {
      setTicketOcrUploading(true);
      // Convert file to data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch(`${BACKEND_URL}/api/admin/import/ticket-ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': DEFAULT_TENANT_ID
        },
        body: JSON.stringify({ imageDataUrl: dataUrl })
      });
      if (!response.ok) {
        console.error('Ticket OCR failed:', await response.text());
        return;
      }
      const data = await response.json();
      onImport('ticket', data);
    } catch (e) {
      console.error('Ticket OCR error:', e);
    } finally {
      setTicketOcrUploading(false);
    }
  };

  // Show Quick Import for Place, Website and Document. Document supports file or URL.
  const supportedTypes = ["place", "website", "document", "ticket"];
  if (!supportedTypes.includes(contextType)) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
        <h3 className="text-sm font-medium text-blue-900">Quick Import</h3>
      </div>
      
      <p className="text-sm text-blue-700 mb-3">
        {contextType === "place" && "Import location data directly from Google Maps URL"}
        {contextType === "website" && "Automatically extract and summarize website content"}
        {contextType === "ticket" && "Two options: 1) Import Event Detail via URL (same as website). 2) Upload Ticket Image for OCR to fill ticket fields."}
        {contextType === "document" && "Upload a document file or paste a document URL"}
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        {contextType === 'document' && (
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.html,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html,text/plain"
            onChange={async (e) => {
              const f = e.target.files?.[0] || null;
              if (!f) return;
              try {
                setImporting(true);
                const fileDataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(f);
                });
                const response = await fetch(`${BACKEND_URL}/api/admin/import/doc_upload`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': DEFAULT_TENANT_ID
                  },
                  body: JSON.stringify({ fileDataUrl, filename: f.name })
                });
                if (!response.ok) {
                  console.error('Document upload failed:', await response.text());
                } else {
                  const data = await response.json();
                  onImport('document', data);
                }
              } catch (err) {
                console.error('Document upload error:', err);
              } finally {
                setImporting(false);
                if (documentInputRef.current) documentInputRef.current.value = '';
              }
            }}
            className="text-sm"
            disabled={importing || loading}
          />
        )}
        {contextType === 'ticket' && (
          <input
            ref={ticketInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (f) handleTicketOcr(f);
              // reset the input for re-uploading same file
              if (ticketInputRef.current) ticketInputRef.current.value = '';
            }}
            className="text-sm"
            disabled={ticketOcrUploading || loading}
          />
        )}
        <input
          type="text"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          placeholder={getPlaceholder()}
          className="flex-1 px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={importing || loading}
        />
        {(contextType === 'website' || contextType === 'ticket') && (
          <select
            className="px-2 py-2 border border-blue-300 rounded-md text-sm bg-white"
            value={engine}
            onChange={(e) => setEngine(e.target.value as any)}
            disabled={importing || loading}
            aria-label="Scraper engine"
          >
            <option value="auto_local_first">Auto (Local → Firecrawl)</option>
            <option value="auto_firecrawl_first">Auto (Firecrawl → Local)</option>
            <option value="local">Local only</option>
            <option value="firecrawl">Firecrawl only</option>
          </select>
        )}
        <Button
          type="button"
          onClick={handleImport}
          loading={importing}
          disabled={loading || (!importUrl.trim() && !(contextType === 'document' && file))}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {getImportLabel()}
        </Button>
      </div>

      {(contextType === 'website' || contextType === 'ticket') && (
        <div className="mt-2 flex items-center gap-2 text-xs text-blue-900">
          <input
            id="prefer-firecrawl-first"
            type="checkbox"
            className="h-4 w-4"
            checked={preferFirecrawlFirst}
            onChange={(e) => setPreferFirecrawlFirst(e.target.checked)}
            disabled={importing || loading}
          />
          <label htmlFor="prefer-firecrawl-first">
            Use Firecrawl first (fallback to local scraper)
          </label>
        </div>
      )}

      {contextType === 'ticket' && (
        <div className="mt-2 text-xs text-blue-700">
          Ticket OCR upload uses your Generating Model API key from Settings. Supported: OpenAI vision models.
        </div>
      )}

      {contextType === "place" && (
        <div className="mt-2 text-xs text-blue-600">
          💡 Tip: Right-click on Google Maps and select "Share" to get the URL
        </div>
      )}
    </div>
  );
}
