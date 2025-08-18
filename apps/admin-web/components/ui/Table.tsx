"use client";

import React from "react";
import { Button } from "./Button";

interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  empty?: React.ReactNode;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  className?: string;
}

export function Table<T extends Record<string, any>>({ 
  columns, 
  data, 
  loading = false,
  empty,
  onSort,
  sortKey,
  sortDirection,
  className = ""
}: TableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return;
    
    const newDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    onSort(key, newDirection);
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) {
      return (
        <svg className="h-4 w-4 text-[color:var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === "asc" ? (
      <svg className="h-4 w-4 text-[color:var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="h-4 w-4 text-[color:var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="border border-[color:var(--border)] rounded-lg">
        <div className="p-8 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-[color:var(--primary)] border-t-transparent rounded-full"></div>
          <p className="mt-2 text-[color:var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border border-[color:var(--border)] rounded-lg">
        <div className="p-8 text-center">
          {empty || (
            <>
              <svg className="mx-auto h-12 w-12 text-[color:var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-2 text-[color:var(--text-muted)]">No data available</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden border border-[color:var(--border)] rounded-lg ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[color:var(--border)]">
          <thead className="bg-[color:var(--surface-muted)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`
                    px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider
                    ${column.sortable ? 'cursor-pointer hover:bg-[color:var(--surface-hover)]' : ''}
                    ${column.width ? `w-${column.width}` : ''}
                  `}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && getSortIcon(String(column.key))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[color:var(--surface)] divide-y divide-[color:var(--border)]">
            {data.map((row, index) => (
              <tr key={String((row as any)?.id ?? index)} className="hover:bg-[color:var(--surface-hover)]">
                {columns.map((column) => (
                  <td key={`${String(column.key)}:${String((row as any)?.id ?? index)}`} className="px-6 py-4 text-sm text-[color:var(--text)] align-top whitespace-normal break-words">
                    {column.render 
                      ? column.render(row[column.key as keyof T], row)
                      : String(row[column.key as keyof T] || '')
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
