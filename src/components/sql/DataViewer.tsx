'use client';

import React, { useState } from 'react';
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, Layers } from 'lucide-react';

interface DataViewerProps {
  rows: Record<string, unknown>[];
}

export default function DataViewer({ rows }: DataViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  if (!rows || rows.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-card-border bg-card-bg/80 p-8 text-center shadow-lg backdrop-blur-xl">
        <Layers size={32} className="text-text-muted mb-2 opacity-50" />
        <p className="text-sm font-semibold text-foreground">No records found</p>
        <p className="text-xs text-text-muted mt-1 max-w-xs">
          The query ran successfully, but returned 0 rows from the database.
        </p>
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  // Pagination Logic
  const totalPages = Math.ceil(rows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  // CSV Export Logic using URL.createObjectURL
  const exportToCSV = () => {
    try {
      const headers = columns.join(',');
      const body = rows.map((row) => {
        return columns
          .map((col) => {
            const val = row[col];
            // Escape double quotes by doubling them
            const escaped = ('' + (val ?? '')).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',');
      });

      const csvContent = [headers, ...body].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `querygpt_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const formatHeader = (header: string) => {
    return header
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-card-border bg-card-bg/85 shadow-2xl shadow-black/20 backdrop-blur-xl">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-muted bg-white/3 px-4 py-3 select-none">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Query Results</span>
        </div>
        <button
          onClick={exportToCSV}
          className="group flex items-center gap-1.5 rounded-lg bg-gradient-to-tr from-accent-secondary to-accent px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-accent-secondary/15 transition-all duration-200 hover:brightness-110 active:scale-95 cursor-pointer"
        >
          <Download size={12} className="icon-hover-scale" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto">
        <table className="custom-table min-w-full text-left text-xs">
          <thead>
            <tr className="select-none">
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-text-muted font-medium">
                  {formatHeader(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/2 transition-all duration-150">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 text-foreground border-b border-border-muted whitespace-nowrap">
                    {row[col] === null || row[col] === undefined ? (
                      <span className="text-text-muted italic">null</span>
                    ) : typeof row[col] === 'number' ? (
                      <span className="font-mono text-amber-300">{row[col]}</span>
                    ) : (
                      <span>{String(row[col])}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col gap-3 border-t border-border-muted bg-white/2 px-4 py-3 text-[11px] text-text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between select-none">
        {/* Row Range / Page Count info */}
        <div>
          Showing{' '}
          <strong className="text-foreground">
            {rows.length === 0 ? 0 : startIndex + 1}
          </strong>{' '}
          to{' '}
          <strong className="text-foreground">
            {Math.min(startIndex + pageSize, rows.length)}
          </strong>{' '}
          of <strong className="text-foreground">{rows.length}</strong> records
        </div>

        {/* Page navigation controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="bg-background border border-card-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:border-accent"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>

          <div className="flex items-center gap-1 sm:border-l sm:border-white/10 sm:pl-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded bg-white/5 border border-white/5 text-foreground hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2">
              Page <strong className="text-foreground">{currentPage}</strong> of{' '}
              <strong className="text-foreground">{totalPages}</strong>
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-white/5 border border-white/5 text-foreground hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
