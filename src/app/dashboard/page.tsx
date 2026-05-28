'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  FileText, Eye, Download, Trash2, Mail, AlertTriangle, X,
  CheckCircle2, Maximize2, Upload, RefreshCw, Clock, User2
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';

type UploadItem = {
  id: string;
  filename: string;
  status: string;
  uploadedAt: string;
  user: { name: string | null; email: string } | null;
  emailSent?: boolean;
};

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [uploadToDelete, setUploadToDelete] = useState<UploadItem | null>(null);
  const [fullscreenModalOpen, setFullscreenModalOpen] = useState(false);
  const [fullscreenUpload, setFullscreenUpload] = useState<UploadItem | null>(null);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchUploads = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch('/api/uploads');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUploads(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch uploads:', err);
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/signin');
  }, [status, router]);

  useEffect(() => {
    fetchUploads();
    const interval = setInterval(() => fetchUploads(), 30000);
    return () => clearInterval(interval);
  }, [fetchUploads]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const isReviewer = session.user?.role === 'reviewer';
  const isUploader = session.user?.role === 'uploader';
  const filteredUploads = isUploader ? uploads.filter(u => u.status === 'reviewed') : uploads;
  const canUpload = isUploader && uploads.length < 5;

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const openFullscreen = async (upload: UploadItem) => {
    setFullscreenUpload(upload);
    setFullscreenModalOpen(true);
    setLoadingTable(true);
    try {
      const response = await fetch(`/api/uploads/${upload.id}`);
      if (response.ok) {
        const data = await response.json();
        setTableData(data.data || []);
      }
    } catch {
      addToast('error', 'Fout bij het laden van tabelgegevens');
    } finally {
      setLoadingTable(false);
    }
  };

  const closeFullscreen = () => {
    setFullscreenModalOpen(false);
    setFullscreenUpload(null);
    setTableData([]);
  };

  const handleDelete = (upload: UploadItem) => {
    setUploadToDelete(upload);
    setDeleteModalOpen(true);
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setUploadToDelete(null);
  };

  const confirmDelete = async () => {
    if (!uploadToDelete) return;
    setDeleting(uploadToDelete.id);
    try {
      const response = await fetch(`/api/uploads/${uploadToDelete.id}`, { method: 'DELETE' });
      if (response.ok) {
        addToast('success', 'Upload succesvol verwijderd');
        fetchUploads();
        setDeleteModalOpen(false);
        setUploadToDelete(null);
      } else {
        addToast('error', 'Fout bij het verwijderen');
      }
    } catch {
      addToast('error', 'Fout bij het verwijderen');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-2xl border text-sm font-medium shadow-lg fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="slide-up">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isReviewer ? 'Review Dashboard' : 'Mijn Uploads'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isReviewer
                ? 'Review de facturen en keur ze goed of markeer problemen'
                : 'Beheer je uploads en download gereviewde bestanden'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-slate-400 dark:text-slate-600 hidden sm:block">
                {lastRefresh.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => fetchUploads(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 transition-all disabled:opacity-40"
              title="Vernieuwen"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            {canUpload && (
              <Link href="/upload" className="btn-primary flex items-center gap-2 text-sm py-2.5 px-4">
                <Upload size={15} />
                Upload
              </Link>
            )}
          </div>
        </div>

        {/* Info banner */}
        {isUploader && !canUpload && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-amber-800 dark:text-amber-300">
              Maximum van 5 bestanden bereikt. Download eerst een bestand om nieuwe uploads te doen.
            </p>
          </div>
        )}

        {filteredUploads.length === 0 ? (
          <div className="card-modern p-16 text-center fade-in">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <FileText className="w-8 h-8 text-slate-400 dark:text-slate-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {isReviewer ? 'Geen bestanden om te reviewen' : 'Geen bestanden beschikbaar'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">
              {isReviewer
                ? 'Er zijn momenteel geen uploads die wachten op review. Je ontvangt een e-mail zodra er een nieuw bestand is.'
                : canUpload
                ? 'Upload een bestand om aan de slag te gaan.'
                : 'Zodra je bestand is gereviewed, verschijnt het hier.'}
            </p>
            {canUpload && (
              <Link href="/upload" className="btn-primary inline-flex items-center gap-2">
                <Upload size={16} />
                Upload bestand
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUploads.map((upload, index) => (
              <div
                key={upload.id}
                className="card-modern fade-in"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="p-6">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-slate-900 dark:text-white truncate text-sm leading-tight" title={upload.filename}>
                          {upload.filename}
                        </h2>
                        <div className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">#{upload.id.slice(-8)}</div>
                      </div>
                    </div>
                    <div className={`status-badge shrink-0 ${
                      upload.status === 'reviewed' ? 'status-reviewed' :
                      upload.status === 'uploaded' ? 'status-uploaded' : 'status-processing'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        upload.status === 'reviewed' ? 'bg-emerald-500' :
                        upload.status === 'uploaded' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      {upload.status === 'reviewed' ? 'Gereviewed' :
                       upload.status === 'uploaded' ? 'Wacht op review' : upload.status}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-4 mb-5 text-xs text-slate-500 dark:text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <User2 size={13} />
                      {upload.user?.name || upload.user?.email || 'Onbekend'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} />
                      {new Date(upload.uploadedAt).toLocaleString('nl-NL', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                      <Mail size={13} />
                      Email verzonden
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5">
                    {upload.status === 'reviewed' ? (
                      <>
                        {isUploader && (
                          <button
                            onClick={() => router.push(`/download/${upload.id}`)}
                            className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
                          >
                            <Download size={15} />
                            Download
                          </button>
                        )}
                        <button
                          onClick={() => openFullscreen(upload)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors border border-slate-200 dark:border-slate-700"
                          title="Bekijken"
                        >
                          <Maximize2 size={16} />
                        </button>
                        {isUploader && (
                          <button
                            onClick={() => handleDelete(upload)}
                            disabled={deleting === upload.id}
                            className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors border border-red-200 dark:border-red-800/50 disabled:opacity-40"
                            title="Verwijderen"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {isReviewer && (
                          <button
                            onClick={() => router.push(`/review/${upload.id}`)}
                            className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
                          >
                            <Eye size={15} />
                            Starten met review
                          </button>
                        )}
                        <button
                          onClick={() => openFullscreen(upload)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors border border-slate-200 dark:border-slate-700"
                          title="Bekijken"
                        >
                          <Maximize2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && uploadToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-modern bg-white dark:bg-[#111827] max-w-md w-full fade-in">
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Upload verwijderen</h3>
                </div>
                <button
                  onClick={cancelDelete}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Weet je zeker dat je dit wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-xl mb-6">
                <p className="font-semibold text-sm text-slate-900 dark:text-white truncate mb-1">{uploadToDelete.filename}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {new Date(uploadToDelete.uploadedAt).toLocaleString('nl-NL')}
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={cancelDelete} className="flex-1 btn-secondary py-2.5">
                  Annuleren
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting === uploadToDelete.id}
                  className="flex-1 btn-danger flex items-center justify-center gap-2 py-2.5"
                >
                  {deleting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verwijderen...</>
                  ) : (
                    <><Trash2 size={16} /> Verwijderen</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {fullscreenModalOpen && fullscreenUpload && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-modern bg-white dark:bg-[#111827] w-full max-w-6xl max-h-[90vh] flex flex-col fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate">{fullscreenUpload.filename}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {new Date(fullscreenUpload.uploadedAt).toLocaleString('nl-NL')}
                  </p>
                </div>
              </div>
              <button
                onClick={closeFullscreen}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {loadingTable ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Gegevens laden...</p>
                </div>
              ) : tableData.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        {Object.keys(tableData[0]).map((key) => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.slice(0, 50).map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="max-w-48 truncate" title={String(value ?? '')}>
                              {String(value ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tableData.length > 50 && (
                    <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
                      Toont eerste 50 van {tableData.length} rijen
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 dark:text-slate-600">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Geen data beschikbaar</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
              <button onClick={closeFullscreen} className="btn-secondary py-2.5">
                Sluiten
              </button>
              {fullscreenUpload.status === 'reviewed' ? (
                <button
                  onClick={() => { closeFullscreen(); router.push(`/download/${fullscreenUpload.id}`); }}
                  className="btn-primary flex items-center gap-2 py-2.5"
                >
                  <Download size={15} /> Download
                </button>
              ) : isReviewer && (
                <button
                  onClick={() => { closeFullscreen(); router.push(`/review/${fullscreenUpload.id}`); }}
                  className="btn-primary flex items-center gap-2 py-2.5"
                >
                  <Eye size={15} /> Reviewen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
