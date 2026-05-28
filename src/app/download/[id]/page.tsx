'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, FileSpreadsheet, FileText, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function DownloadPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadFile = async (format: 'excel' | 'pdf', shouldDelete: boolean) => {
    const response = await fetch(`/api/download/${params.id}?format=${format}&delete=${shouldDelete}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Download mislukt');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `reviewed_file.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      await downloadFile('excel', false);
      await new Promise(resolve => setTimeout(resolve, 600));
      await downloadFile('pdf', true);
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
      <Navbar />

      <div className="max-w-md mx-auto px-4 py-16 slide-up">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Terug naar Dashboard
        </button>

        <div className="card-modern p-8 text-center">
          {done ? (
            <>
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Download voltooid</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Bestanden zijn gedownload en verwijderd van de server. Je wordt doorgestuurd...
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Download className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>

              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Download bestand</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Je bestand is gereviewed en klaar voor download.
                <br />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Let op: na download wordt het bestand verwijderd.
                </span>
              </p>

              {/* Format cards */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-center">
                  <FileSpreadsheet className="w-7 h-7 mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
                  <div className="font-bold text-slate-900 dark:text-white text-sm">Excel</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">.xlsx spreadsheet</div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl text-center">
                  <FileText className="w-7 h-7 mx-auto mb-2 text-red-600 dark:text-red-400" />
                  <div className="font-bold text-slate-900 dark:text-white text-sm">PDF</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Portable document</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-600 mb-6">
                Beide bestanden worden tegelijk gedownload
              </p>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4 mb-5 text-left">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleDownload}
                disabled={loading}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Downloaden...
                  </>
                ) : (
                  <>
                    <Download size={17} />
                    Download Excel &amp; PDF
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
