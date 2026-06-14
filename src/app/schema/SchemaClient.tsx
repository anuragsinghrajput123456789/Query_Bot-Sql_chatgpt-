'use client';

import React, { useState, useEffect, useRef } from 'react';
import HeaderNavbar from '../HeaderNavbar';
import { 
  Database, 
  Upload, 
  X, 
  FileSpreadsheet, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Table2,
  Terminal,
  Activity
} from 'lucide-react';

interface SchemaClientProps {
  user: {
    id: number;
    username: string;
    role: 'user' | 'admin';
  } | null;
}

type UploadStatus = 'idle' | 'parsing' | 'previewing' | 'uploading' | 'success' | 'error';

// Helper to parse CSV without external dependencies
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
        reject(new Error('SheetJS XLSX is not present on window.'));
      }
    };
    script.onerror = (err) => reject(new Error('Failed to load SheetJS library: ' + err));
    document.head.appendChild(script);
  });
};

export default function SchemaClient({ user }: SchemaClientProps) {
  const [schema, setSchema] = useState('');
  const [metrics, setMetrics] = useState<any[]>([]);
  const [isSchemaLoading, setIsSchemaLoading] = useState(true);

  // Ingestion States
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [customTableName, setCustomTableName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSchemaDetails = async () => {
    setIsSchemaLoading(true);
    try {
      const res = await fetch('/api/schema');
      const data = await res.json();
      if (data.success) {
        setSchema(data.schema || '');
        setMetrics(data.metrics || []);
      }
    } catch (e) {
      console.error('Failed to load schema:', e);
    } finally {
      setIsSchemaLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemaDetails();
  }, []);

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
      setErrorMessage('Unsupported file format. Please upload .csv or .xlsx / .xls sheets.');
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    
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
            if (parsed.length === 0) throw new Error('File is empty.');
            const headers = parsed[0].map((h, i) => h.trim() || `column_${i + 1}`);
            setColumns(headers);
            setRows(parsed.slice(1));
            setStatus('previewing');
          } catch (err) {
            setStatus('error');
            setErrorMessage((err as Error).message);
          }
        };
        reader.readAsText(file);
      } else {
        const XLSX = await loadSheetJS();
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const cleanJson = json.filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
            if (cleanJson.length === 0) throw new Error('Spreadsheet is empty.');
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
        reader.readAsArrayBuffer(file);
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message);
    }
  };

  const handleUploadSubmit = async () => {
    if (!customTableName.trim()) {
      setErrorMessage('Please enter a table name.');
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
        fetchSchemaDetails();
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Failed to seed table.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message);
    }
  };

  const resetIngestion = () => {
    setStatus('idle');
    setFileName('');
    setFileSize('');
    setCustomTableName('');
    setColumns([]);
    setRows([]);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050508] text-foreground font-sans">
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl animate-pulse duration-[10000ms]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-accent-secondary/5 blur-3xl animate-pulse duration-[12000ms]" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" />

      <HeaderNavbar user={user} />

      <main className="relative z-10 flex-1 px-4 py-8 md:px-8 max-w-7xl mx-auto w-full space-y-8 select-none">
        
        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Database className="text-accent animate-pulse" size={24} />
              <span>Database Ingestion & Schema Hub</span>
            </h2>
            <p className="text-xs text-text-muted mt-1">Explore current SQLite tables, view schema models, or ingest new CSV/Excel tables.</p>
          </div>
          <button
            onClick={fetchSchemaDetails}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/3 hover:bg-white/5 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          >
            Refresh Tables
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Database Tables & Schemas */}
          <div className="space-y-6">
            
            {/* Table Metrics */}
            <div className="p-6 rounded-2xl border border-card-border bg-card-bg/45 backdrop-blur-xl space-y-4">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Live System Tables</span>
              
              {isSchemaLoading ? (
                <div className="flex items-center justify-center py-10 text-xs text-text-muted gap-2">
                  <RefreshCw size={14} className="animate-spin text-accent" />
                  <span>Loading tables...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {metrics.map((m) => {
                    const isCustom = m.table.startsWith('uploaded_');
                    return (
                      <div key={m.table} className={`p-3 rounded-xl border flex flex-col justify-between ${isCustom ? 'border-accent-secondary/35 bg-accent-secondary/5' : 'border-white/5 bg-white/2'}`}>
                        <span className="text-[10px] text-text-muted font-bold truncate capitalize">{m.table.replace(/^uploaded_/, '').replace(/_/g, ' ')}</span>
                        <div className="flex justify-between items-baseline mt-1.5">
                          <span className="text-xs font-extrabold text-white font-mono">{m.count.toLocaleString()} rows</span>
                          {isCustom && <span className="text-[8px] bg-accent-secondary/15 border border-accent-secondary/25 text-accent-secondary font-bold px-1 py-0.5 rounded">Custom</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Schema DDL */}
            <div className="p-6 rounded-2xl border border-card-border bg-card-bg/45 backdrop-blur-xl space-y-4">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">SQLite Master Tables Definition</span>
              <div className="p-4 rounded-xl bg-[#020204] border border-white/5 h-64 overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap scrollbar-thin">
                {isSchemaLoading ? 'Fetching Schema CREATE commands...' : schema || 'No custom schemas registered.'}
              </div>
            </div>

          </div>

          {/* Right Column: Spreadsheet Ingestion */}
          <div className="p-6 rounded-2xl border border-card-border bg-card-bg/45 backdrop-blur-xl space-y-6">
            
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Upload size={16} className="text-accent" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Spreadsheet Ingestion Wizard</span>
            </div>

            {status === 'idle' && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                  dragActive ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-accent/40 hover:bg-white/2'
                }`}
              >
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 shadow-inner">
                  <FileSpreadsheet size={28} className="animate-icon-float" />
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Drag & drop your file here, or click to browse</h4>
                <p className="text-[10px] text-text-muted">Supports CSV or Excel spreadsheets (.xlsx, .xls) up to 10MB</p>
              </div>
            )}

            {status === 'parsing' && (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-4">
                <RefreshCw size={32} className="text-accent animate-spin" />
                <div>
                  <p className="text-xs font-bold text-white">Parsing layout structures...</p>
                  <p className="text-[10px] text-text-muted mt-1">Reading column keys and preview lines</p>
                </div>
              </div>
            )}

            {status === 'previewing' && (
              <div className="space-y-6 animate-fade-in">
                
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/2 border border-white/5 text-xs">
                  <FileSpreadsheet size={20} className="text-accent shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-white truncate">{fileName}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{fileSize} • {columns.length} columns • {rows.length} rows</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Ingested Database Name</label>
                  <div className="relative flex items-center bg-[#020204] border border-white/5 rounded-xl px-4 py-3 text-xs focus-within:border-accent/50">
                    <span className="text-text-muted select-none mr-0.5">uploaded_</span>
                    <input 
                      type="text"
                      value={customTableName}
                      onChange={(e) => setCustomTableName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                      placeholder="user_signup_leads"
                      className="w-full bg-transparent focus:outline-none font-semibold text-white"
                    />
                  </div>
                  <p className="text-[9px] text-text-muted">Will register as table <strong className="text-accent">uploaded_{customTableName || 'leads'}</strong> inside the secure matrimonial database.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Ingestion Preview (First 4 Rows)</label>
                  <div className="border border-white/5 rounded-xl overflow-hidden bg-[#020204] max-h-40 overflow-y-auto">
                    <table className="w-full text-[10px] text-left border-collapse">
                      <thead>
                        <tr className="bg-white/3 border-b border-white/5">
                          {columns.map((col, i) => (
                            <th key={i} className="px-3 py-2 text-text-muted font-bold whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 4).map((rowArr, rIdx) => (
                          <tr key={rIdx} className="border-b border-white/2 hover:bg-white/2">
                            {columns.map((_, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 text-foreground truncate max-w-[100px] whitespace-nowrap">{rowArr[cIdx] ?? ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={resetIngestion}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-text-muted hover:text-white transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    Clear Ingest
                  </button>
                  <button
                    onClick={handleUploadSubmit}
                    className="px-6 py-2 text-xs font-bold rounded-xl bg-gradient-to-tr from-accent-secondary to-accent text-white shadow-md shadow-accent-secondary/15 transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    Import Spreadsheet
                  </button>
                </div>

              </div>
            )}

            {status === 'uploading' && (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-4">
                <RefreshCw size={32} className="text-accent animate-spin" />
                <div>
                  <p className="text-xs font-bold text-white">Importing spreadsheet tables...</p>
                  <p className="text-[10px] text-text-muted mt-1">Executing bulk INSERT transactions inside SQLite</p>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="py-10 text-center flex flex-col items-center justify-center gap-4 animate-fade-in">
                <div className="h-14 w-14 rounded-full bg-accent-green/10 border border-accent-green/20 text-accent-green flex items-center justify-center shadow-inner">
                  <CheckCircle size={28} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Ingestion Completed Successfully!</h4>
                  <p className="text-xs text-text-muted max-w-xs mx-auto mt-1">
                    Your table is now fully queryable conversationally as <strong className="text-accent">uploaded_{customTableName}</strong>.
                  </p>
                </div>
                <button
                  onClick={resetIngestion}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-tr from-accent-secondary to-accent text-white text-xs font-bold shadow-md shadow-accent-secondary/15 active:scale-95 transition-all cursor-pointer"
                >
                  Ingest Another File
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-200 text-xs flex items-start gap-2 leading-relaxed">
                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <strong className="block font-bold">Parsing Ingestion Failed</strong>
                  <span className="opacity-90">{errorMessage}</span>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
