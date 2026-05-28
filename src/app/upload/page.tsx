'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, AlertTriangle, CheckCircle2, X, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/Skeleton';
import { Navbar } from '@/components/Navbar';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [canUpload, setCanUpload] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const checkUploadStatus = async () => {
      try {
        const res = await fetch('/api/uploads');
        if (res.ok) {
          const uploads = await res.json();
          setCanUpload(uploads.length < 5);
        }
      } catch {
        // ignore
      } finally {
        setCheckingStatus(false);
      }
    };
    checkUploadStatus();
  }, []);

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(
      f => /\.(csv|xlsx|xls)$/i.test(f.name)
    );
    setFiles(prev => {
      const combined = [...prev, ...arr];
      const unique = combined.filter((f, i, a) => a.findIndex(x => x.name === f.name) === i);
      return unique.slice(0, 5);
    });
  };

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setUploadProgress(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload) return;
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setMessage('Selecteer minimaal één bestand.');
      return;
    }
    if (!canUpload) return;

    setUploading(true);
    setMessage('Bestanden verwerken...');
    setUploadProgress({});

    try {
      let successCount = 0;
      let failCount = 0;

      for (const file of files) {
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 'Verwerken...' }));

          let parsedData: Record<string, unknown>[] = [];
          let fileType = 'csv';

          if (/\.(xlsx|xls)$/i.test(file.name)) {
            fileType = 'excel';
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as unknown[][];

            if (jsonData.length === 0) {
              setUploadProgress(prev => ({ ...prev, [file.name]: 'Bestand is leeg' }));
              failCount++;
              continue;
            }

            const headers = jsonData[0] as string[];
            parsedData = jsonData.slice(1).map((row) => {
              const obj: Record<string, unknown> = {};
              headers.forEach((header, index) => {
                const value = row[index];
                obj[header] = value instanceof Date ? value.toISOString().split('T')[0] : (value ?? '');
              });
              return obj;
            });
          } else {
            const fileContent = await file.text();
            const parsed = Papa.parse(fileContent, {
              header: true,
              delimiter: ',',
              skipEmptyLines: true,
              dynamicTyping: true,
            });

            if (parsed.errors.length > 0) {
              setUploadProgress(prev => ({ ...prev, [file.name]: 'Parsing fout' }));
              failCount++;
              continue;
            }
            parsedData = parsed.data as Record<string, unknown>[];
          }

          if (parsedData.length === 0) {
            setUploadProgress(prev => ({ ...prev, [file.name]: 'Geen data gevonden' }));
            failCount++;
            continue;
          }

          setUploadProgress(prev => ({ ...prev, [file.name]: 'Uploaden...' }));

          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, fileType, data: parsedData }),
          });

          const data = await res.json();
          if (res.ok) {
            setUploadProgress(prev => ({ ...prev, [file.name]: 'success' }));
            successCount++;
          } else {
            setUploadProgress(prev => ({ ...prev, [file.name]: 'error:' + data.error }));
            failCount++;
          }
        } catch {
          setUploadProgress(prev => ({ ...prev, [file.name]: 'error:Fout bij verwerken' }));
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        setMessage(`success:Alle ${successCount} bestand(en) succesvol geüpload!`);
        setFiles([]);
        setTimeout(() => router.push('/dashboard'), 1800);
      } else if (successCount > 0) {
        setMessage(`partial:${successCount} succesvol, ${failCount} mislukt.`);
      } else {
        setMessage('error:Alle uploads zijn mislukt. Probeer het opnieuw.');
      }
    } catch {
      setMessage('error:Er is een fout opgetreden.');
    }

    setUploading(false);
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size={36} />
        </div>
      </div>
    );
  }

  const messageType = message.startsWith('success:') ? 'success' : message.startsWith('partial:') ? 'partial' : message.startsWith('error:') ? 'error' : '';
  const messageText = message.replace(/^(success|partial|error):/, '');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-12 slide-up">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {canUpload ? 'Bestand uploaden' : 'Upload geblokkeerd'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {canUpload
              ? 'Selecteer of sleep CSV / Excel bestanden hiernaartoe'
              : 'Maximum van 5 bestanden bereikt. Download eerst een bestand.'}
          </p>
        </div>

        {!canUpload && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 flex gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Upload geblokkeerd</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                Je hebt 5 bestanden in de wachtrij. Download of verwijder een bestand om door te gaan.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 hover:gap-2 transition-all"
              >
                Naar Dashboard <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); if (canUpload) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => canUpload && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer ${
              !canUpload
                ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800'
                : dragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-[1.01]'
                : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              multiple
              className="hidden"
              disabled={!canUpload}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
              dragOver ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              <Upload className={`w-7 h-7 transition-colors ${dragOver ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}`} />
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {dragOver ? 'Loslaten om te uploaden' : 'Sleep bestanden hierheen'}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-600 mb-4">of klik om bestanden te selecteren</p>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
              <FileSpreadsheet size={13} />
              CSV, XLSX, XLS &middot; max 5 bestanden
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f) => {
                const status = uploadProgress[f.name];
                const isSuccess = status === 'success';
                const isError = status?.startsWith('error:');
                const isPending = status === 'Verwerken...' || status === 'Uploaden...';
                return (
                  <div
                    key={f.name}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                      isSuccess ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50' :
                      isError ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50' :
                      'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50'
                    }`}
                  >
                    <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isSuccess ? 'text-emerald-500' : isError ? 'text-red-500' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">{f.name}</span>
                    {status && (
                      <span className={`text-xs font-medium shrink-0 ${
                        isSuccess ? 'text-emerald-600 dark:text-emerald-400' :
                        isError ? 'text-red-600 dark:text-red-400' :
                        isPending ? 'text-blue-600 dark:text-blue-400' :
                        'text-slate-500'
                      }`}>
                        {isSuccess ? 'Geüpload' : isError ? status.replace('error:', '') : status}
                      </span>
                    )}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                        className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="submit"
            disabled={files.length === 0 || uploading || !canUpload}
            className="w-full btn-primary py-3.5 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <LoadingSpinner className="mr-1" size={17} />
                Bezig met uploaden...
              </>
            ) : (
              <>
                <Upload size={17} />
                {files.length > 0
                  ? `Upload ${files.length} bestand${files.length > 1 ? 'en' : ''}`
                  : 'Upload bestanden'}
              </>
            )}
          </button>
        </form>

        {messageText && (
          <div className={`mt-5 px-5 py-4 rounded-2xl flex items-start gap-3 border text-sm ${
            messageType === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400'
              : messageType === 'partial'
              ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-400'
              : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-400'
          }`}>
            {messageType === 'success'
              ? <CheckCircle2 className="w-5 h-5 shrink-0" />
              : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span className="font-medium">{messageText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
