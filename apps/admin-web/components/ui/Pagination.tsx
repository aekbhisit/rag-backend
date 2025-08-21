"use client";

import React from "react";
import { Select } from "./Select";

type Props = {
  page: number;
  size: number;
  total: number;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  sizeOptions?: number[];
  className?: string;
};

export function Pagination({ page, size, total, onPageChange, onSizeChange, sizeOptions = [10, 20, 50, 100], className }: Props) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (size || 1)));
  const current = Math.min(Math.max(1, page), totalPages);

  // Build window of pages centered on current
  const windowSize = 5;
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - windowSize + 1);
  }
  const pages = [] as number[];
  for (let p = start; p <= end; p++) pages.push(p);

  const goto = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    if (clamped !== current) onPageChange(clamped);
  };

  return (
    <div className={`flex items-center justify-between gap-3 ${className || ''}`}>
      <div className="text-sm text-[color:var(--text-muted)]">Page {current} of {totalPages} • {total} rows</div>
      <div className="flex items-center gap-2">
        <button className="h-8 px-3 border rounded disabled:opacity-50" disabled={current <= 1} onClick={() => goto(1)} title="First">|&lt;</button>
        <button className="h-8 px-3 border rounded disabled:opacity-50" disabled={current <= 1} onClick={() => goto(current - 1)} title="Previous">&laquo;</button>
        {pages[0] > 1 && <span className="px-2">…</span>}
        {pages.map(p => (
          <button
            key={p}
            className={`h-8 min-w-8 px-3 border rounded ${p === current ? 'bg-[color:var(--surface-hover)] font-medium' : ''}`}
            onClick={() => goto(p)}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="px-2">…</span>}
        <button className="h-8 px-3 border rounded disabled:opacity-50" disabled={current >= totalPages} onClick={() => goto(current + 1)} title="Next">&raquo;</button>
        <button className="h-8 px-3 border rounded disabled:opacity-50" disabled={current >= totalPages} onClick={() => goto(totalPages)} title="Last">&gt;|</button>
        {onSizeChange && (
          <Select
            size="sm"
            placeholder="Page size"
            value={size.toString()}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            options={sizeOptions.map(n => ({
              value: n.toString(),
              label: `${n}/page`
            }))}
          />
        )}
      </div>
    </div>
  );
}


