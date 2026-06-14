'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Sparkles, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

type UploadStatus = 'idle' | 'parsing' | 'previewing' | 'uploading' | 'success' | 'error';

// Custom parser to parse CSV without external dependencies
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(currentVal.trim());
      lines.push(row);
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    lines.push(row);
  }
  // Remove trailing empty rows
  return lines.filter(line => line.some(cell => cell !== ''));
}

interface WindowWithXLSX extends Window {
  XLSX?: {
    read: (data: Uint8Array, options: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
    utils: {
      sheet_to_json: (sheet: unknown, options: { header: number }) => unknown[][];
    };
  };
}

// Dynamically load SheetJS from CDN for Excel parsing
const loadSheetJS = (): Promise<NonNullable<WindowWithXLSX['XLSX']>> => {
  return new Promise((resolve, reject) => {
    const win = window as unknown as WindowWithXLSX;
    if (win.XLSX) return resolve(win.XLSX);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => {
      if (win.XLSX) {
        resolve(win.XLSX);
      } else {
        reject(new Error('SheetJS loaded from CDN but XLSX is not present on window.'));
      }
    };
    script.onerror = (err) => reject(new Error('Failed to load SheetJS library: ' + err));
    document.head.appendChild(script);
  });
};

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [customTableName, setCustomTableName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      setStatus('error');
      setErrorMessage('Unsupported file type. Please upload a .csv or .xlsx / .xls spreadsheet.');
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    
    // Auto-generate a clean database table name base
    const baseName = file.name.substring(0, file.name.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    setCustomTableName(baseName);
    
    setStatus('parsing');
    setErrorMessage('');

    try {
      if (ext === 'csv') {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            if (parsed.length === 0) {
              throw new Error('CSV file is empty or invalid.');
            }
            const headers = parsed[0].map((h, i) => h.trim() || `column_${i + 1}`);
            const dataRows = parsed.slice(1);
            setColumns(headers);
            setRows(dataRows);
            setStatus('previewing');
          } catch (err) {
            setStatus('error');
            setErrorMessage((err as Error).message);
          }
        };
        reader.onerror = () => {
          setStatus('error');
          setErrorMessage('FileReader read error.');
        };
        reader.readAsText(file);
      } else {
        // Excel file
        const XLSX = await loadSheetJS();
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            // Filter empty rows
            const cleanJson = json.filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
            
            if (cleanJson.length === 0) {
              throw new Error('Selected Excel spreadsheet contains no data rows.');
            }
            const headers = cleanJson[0].map((h, i) => String(h || `column_${i + 1}`).trim());
            const dataRows = cleanJson.slice(1).map(row => 
              row.map(cell => cell === null || cell === undefined ? '' : String(cell).trim())
            );
            
            setColumns(headers);
            setRows(dataRows);
            setStatus('previewing');
          } catch (err) {
            setStatus('error');
            setErrorMessage((err as Error).message);
          }
        };
        reader.onerror = () => {
          setStatus('error');
          setErrorMessage('FileReader read error.');
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message);
    }
  };

  const handleUploadSubmit = async () => {
    if (!customTableName.trim()) {
      setErrorMessage('Please provide a valid table name.');
      return;
    }
    
    setStatus('uploading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: customTableName.trim(),
          columns,
          rows,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setStatus('success');
        onUploadSuccess();
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Failed to seed table into SQLite database.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message);
    }
  };

  const resetModal = () => {
    setStatus('idle');
    setFileName('');
    setFileSize('');
    setCustomTableName('');
    setColumns([]);
    setRows([]);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Preview Grid Helper
  const previewRows = rows.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-muted bg-white/2 select-none">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-accent" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Upload Custom Dataset</h3>
          </div>
          <button 
            onClick={() => { resetModal(); onClose(); }}
            className="p-1 rounded-md text-text-muted hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Status 1: Idle (Dropzone) */}
          {status === 'idle' && (
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                dragActive 
                  ? 'border-accent bg-accent/5' 
                  : 'border-white/10 hover:border-accent/40 hover:bg-white/2'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden" 
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 text-accent mb-4 shadow-inner">
                <FileSpreadsheet size={24} className="animate-icon-float" />
              </div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Drag and drop file here, or click to browse</h4>
              <p className="text-[10px] text-text-muted">Supports CSV or Excel (.xlsx, .xls) files up to 10MB</p>
            </div>
          )}

          {/* Status 2: Parsing (Loader) */}
          {status === 'parsing' && (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-4 select-none">
              <RefreshCw size={28} className="text-accent animate-spin" />
              <div>
                <p className="text-xs font-semibold text-foreground">Parsing dataset file...</p>
                <p className="text-[10px] text-text-muted mt-1">Extracting spreadsheet headers and rows in browser context</p>
              </div>
            </div>
          )}

          {/* Status 3: Previewing (Table Name & First Rows) */}
          {status === 'previewing' && (
            <div className="space-y-4">
              {/* Info summary */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/2 border border-white/5 text-xs select-none">
                <FileSpreadsheet size={16} className="text-accent shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-foreground truncate">{fileName}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{fileSize} • {columns.length} columns • {rows.length} rows detected</p>
                </div>
              </div>

              {/* Table Name Config */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted select-none">Target SQLite Table Name</label>
                <div className="relative flex items-center bg-background border border-card-border rounded-xl px-4 py-2 text-xs text-foreground focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10">
                  <span className="text-text-muted select-none mr-0.5">uploaded_</span>
                  <input 
                    type="text"
                    value={customTableName}
                    onChange={(e) => setCustomTableName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                    placeholder="sales_data"
                    className="w-full bg-transparent focus:outline-none font-semibold text-foreground"
                  />
                </div>
                <p className="text-[9px] text-text-muted select-none">Table will be isolated as <strong>uploaded_{customTableName || 'sales_data'}</strong>. Only select query reads will be permitted.</p>
              </div>

              {/* Data Preview */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted select-none">Dataset Preview (First 5 Rows)</label>
                <div className="border border-card-border rounded-xl overflow-hidden bg-background max-h-[160px] overflow-y-auto">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="bg-white/3 border-b border-card-border select-none">
                        {columns.map((col, i) => (
                          <th key={i} className="px-3 py-2 text-text-muted font-semibold border-r border-card-border/40 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((rowArr, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-card-border/40 hover:bg-white/1">
                          {columns.map((_, colIdx) => (
                            <td key={colIdx} className="px-3 py-1.5 text-foreground border-r border-card-border/40 truncate max-w-[120px] whitespace-nowrap">{rowArr[colIdx] ?? ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Status 4: Uploading (Loader) */}
          {status === 'uploading' && (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-4 select-none">
              <RefreshCw size={28} className="text-accent animate-spin" />
              <div>
                <p className="text-xs font-semibold text-foreground">Importing data into local SQLite database...</p>
                <p className="text-[10px] text-text-muted mt-1">Executing CREATE TABLE and transaction bulk insertions</p>
              </div>
            </div>
          )}

          {/* Status 5: Success Screen */}
          {status === 'success' && (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-3 select-none">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-green/10 border border-accent-green/20 text-accent-green mb-2 shadow-inner">
                <CheckCircle size={24} className="animate-pulse" />
              </div>
              <h4 className="text-sm font-bold text-white">Import Completed Successfully!</h4>
              <p className="text-xs text-text-muted max-w-xs leading-normal">
                Your file has been imported as <strong className="text-accent font-mono">uploaded_{customTableName}</strong>.
              </p>
              <div className="p-3 bg-white/2 border border-white/5 rounded-xl text-[10px] text-text-muted grid grid-cols-2 gap-x-8 gap-y-1 text-left w-64 mt-2">
                <span>Table:</span> <span className="font-semibold text-foreground text-right">uploaded_{customTableName}</span>
                <span>Columns created:</span> <span className="font-semibold text-foreground text-right">{columns.length}</span>
                <span>Rows inserted:</span> <span className="font-semibold text-foreground text-right">{rows.length}</span>
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-200 text-xs flex items-start gap-2 leading-relaxed">
              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <strong className="block font-bold select-none">Import Failed</strong>
                <span className="opacity-90">{errorMessage}</span>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border-muted bg-white/2 flex items-center justify-end gap-2 shrink-0 select-none">
          {status === 'previewing' && (
            <>
              <button
                onClick={resetModal}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 text-text-muted"
              >
                Clear File
              </button>
              <button
                onClick={handleUploadSubmit}
                className="group flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-tr from-accent-secondary to-accent text-white shadow-md shadow-accent-secondary/15 transition-all duration-200 cursor-pointer active:scale-95"
              >
                <Sparkles size={12} className="icon-hover-scale" />
                <span>Import Table</span>
              </button>
            </>
          )}

          {status === 'success' && (
            <button
              onClick={() => { resetModal(); onClose(); }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-tr from-accent-secondary to-accent text-white transition-all duration-200 cursor-pointer active:scale-95"
            >
              Close Window
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={resetModal}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-tr from-accent-secondary to-accent text-white transition-all duration-200 cursor-pointer active:scale-95"
            >
              Try Again
            </button>
          )}

          {status === 'idle' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-text-muted hover:text-white transition-all duration-200 cursor-pointer active:scale-95"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
