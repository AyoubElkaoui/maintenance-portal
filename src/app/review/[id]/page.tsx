'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare, X, AlertTriangle, CheckCircle, Search, Filter, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

interface RowData extends Record<string, unknown> {
  _comments?: string;
  _rejected?: boolean;
  _herinnering?: boolean;
  _herinneringOpmerking?: string;
}

interface UploadData {
  upload: {
    id: string;
    filename: string;
    status: string;
    uploadedAt: string;
    comments?: string;
  };
  data: RowData[];
}

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function ReviewPage() {
  const params = useParams();
  const uploadId = params.id as string;

  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState('');
  const [reviewedData, setReviewedData] = useState<RowData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [tempComment, setTempComment] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColleagueModal, setShowColleagueModal] = useState(false);
  const [selectedColleague, setSelectedColleague] = useState('');
  
  // Action buttons state
  const [selectedAction, setSelectedAction] = useState<'herinnering' | 'bellen' | null>(null);
  const [actionName, setActionName] = useState('');
  
  // New state for filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebtor, setFilterDebtor] = useState(''); // Filter voor debiteurnummer
  const [filterCompany, setFilterCompany] = useState(''); // Filter voor bedrijfsnaam
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filterRejected, setFilterRejected] = useState<'all' | 'rejected' | 'accepted'>('all');
  const [filterDaysOpen, setFilterDaysOpen] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const calculateDaysOpen = (row: RowData) => {
    const invoiceDate = row['Factuurdatum'] || row['factuurdatum'];
    const paymentTerm = row['Betalingstermijn'] || row['betalingstermijn'] || row['Termijn'] || row['termijn'];

    if (!invoiceDate || !paymentTerm) return null;

    try {
      const invoiceDateObj = new Date(invoiceDate as string);
      const currentDate = new Date();
      const paymentTermDays = parseInt(paymentTerm as string);

      if (isNaN(paymentTermDays)) return null;

      // Calculate due date
      const dueDate = new Date(invoiceDateObj);
      dueDate.setDate(dueDate.getDate() + paymentTermDays);

      // Calculate days remaining until due date (positive) or days overdue (negative)
      const timeDiff = dueDate.getTime() - currentDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return daysDiff;
    } catch {
      return null;
    }
  };

  // Check if column is a currency column and format with € symbol
  const isCurrencyColumn = (columnName: string) => {
    const currencyKeywords = ['bedrag', 'Bedrag', 'totaal', 'Totaal', 'prijs', 'Prijs', 'kosten', 'Kosten', 'waarde', 'Waarde'];
    // Exclude columns that contain these keywords
    const excludeKeywords = ['verwerking', 'Verwerking', 'valuta', 'Valuta'];
    if (excludeKeywords.some(keyword => columnName.includes(keyword))) return false;
    return currencyKeywords.some(keyword => columnName.includes(keyword));
  };

  const formatCellValue = (columnName: string, value: unknown) => {
    if (isCurrencyColumn(columnName) && value) {
      const numValue = String(value).replace(/[^\d.,]/g, '');
      return `€ ${numValue}`;
    }
    return String(value || '-');
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchUploadData = useCallback(async () => {
    try {
      const response = await fetch(`/api/review/${uploadId}`);
      if (response.ok) {
        const data = await response.json();
        setUploadData(data);
        // Initialize reviewed data with empty comments and auto-reject negative days
        const initializedData = data.data.map((row: RowData) => {
          // Check both calculated and existing column for days open
          let daysOpen = calculateDaysOpen(row);
          
          // If calculation fails, check if there's an existing "Aantal dagen openstaand" column
          if (daysOpen === null) {
            const existingDays = row['Aantal dagen openstaand'] || row['aantal dagen openstaand'];
            if (existingDays) {
              const parsedDays = parseInt(String(existingDays));
              if (!isNaN(parsedDays)) {
                daysOpen = parsedDays;
              }
            }
          }
          
          const autoReject = daysOpen !== null && daysOpen < 0; // Auto-reject overdue invoices
          
          return {
            ...row,
            _comments: row._comments || '',
            _rejected: row._rejected ?? autoReject,
            _herinnering: row._herinnering || false,
            _herinneringOpmerking: row._herinneringOpmerking || '',
          };
        });
        
        // Sort by debtor number (ascending) automatically
        initializedData.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
          const debtorA = String(a['Debiteurnummer'] || a['debiteurnummer'] || a['Debiteur'] || a['debiteur'] || '');
          const debtorB = String(b['Debiteurnummer'] || b['debiteurnummer'] || b['Debiteur'] || b['debiteur'] || '');
          return debtorA.localeCompare(debtorB, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        setReviewedData(initializedData);
        setComments(data.upload.comments || '');
      }
    } catch (error) {
      console.error('Failed to fetch upload data:', error);
    } finally {
      setLoading(false);
    }
  }, [uploadId]);

  useEffect(() => {
    fetchUploadData();
  }, [fetchUploadData]);

  // Filtered and paginated data with useMemo for performance - MUST be before early returns
  const filteredAndPaginatedData = useMemo(() => {
    if (!reviewedData || reviewedData.length === 0) {
      return {
        data: [],
        totalRows: 0,
        totalPages: 0,
        startIndex: 0,
        endIndex: 0,
      };
    }

    let filtered = [...reviewedData];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row => {
        return Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply debtor number filter
    if (filterDebtor) {
      const debtorLower = filterDebtor.toLowerCase();
      filtered = filtered.filter(row => {
        const debtorField = row['Debiteurnummer'] || row['debiteurnummer'] || row['Debiteur'] || row['debiteur'];
        return String(debtorField).toLowerCase().includes(debtorLower);
      });
    }

    // Apply company name filter
    if (filterCompany) {
      const companyLower = filterCompany.toLowerCase();
      filtered = filtered.filter(row => {
        const companyField = row['Bedrijfsnaam'] || row['bedrijfsnaam'] || row['Naam'] || row['naam'] || row['Relatie'] || row['relatie'];
        return String(companyField).toLowerCase().includes(companyLower);
      });
    }

    // Apply rejection filter
    if (filterRejected === 'rejected') {
      filtered = filtered.filter(row => row._rejected);
    } else if (filterRejected === 'accepted') {
      filtered = filtered.filter(row => !row._rejected);
    }

    // Apply days open filter
    if (filterDaysOpen !== 'all') {
      filtered = filtered.filter(row => {
        const daysOpen = calculateDaysOpen(row);
        if (daysOpen === null) return false;
        if (filterDaysOpen === 'overdue') return daysOpen < 0;
        if (filterDaysOpen === 'upcoming') return daysOpen >= 0;
        return true;
      });
    }

    // Calculate pagination
    const totalRows = filtered.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      totalRows,
      totalPages,
      startIndex,
      endIndex: Math.min(endIndex, totalRows),
    };
  }, [reviewedData, searchTerm, filterDebtor, filterCompany, filterRejected, filterDaysOpen, currentPage, rowsPerPage]);

  // Get all column names from the data (excluding internal fields and unwanted columns)
  const allColumns = useMemo(() => {
    if (!reviewedData || reviewedData.length === 0) return [];
    const firstRow = reviewedData[0];
    return Object.keys(firstRow).filter(key =>
      !key.startsWith('_') &&
      !['Achterstallige dagen', 'Aantal dagen open', 'BTW-verwerking', 'btw-verwerking', 'Btw-verwerking', 'Valuta', 'valuta'].includes(key)
    );
  }, [reviewedData]);

  const issuesCount = useMemo(() => {
    return reviewedData.filter(row => row._status === 'issue').length;
  }, [reviewedData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDebtor, filterCompany, filterRejected, filterDaysOpen, rowsPerPage]);

  // Update row operations to work with absolute indices
  const getAbsoluteIndex = useCallback((relativeIndex: number) => {
    return filteredAndPaginatedData.startIndex + relativeIndex;
  }, [filteredAndPaginatedData.startIndex]);

  const updateRowComments = (index: number, comments: string) => {
    const newData = [...reviewedData];
    newData[index] = { ...newData[index], _comments: comments };
    setReviewedData(newData);
  };

  const toggleRowRejection = (index: number) => {
    const newData = [...reviewedData];
    newData[index] = { ...newData[index], _rejected: !newData[index]._rejected };
    setReviewedData(newData);
  };

  const toggleHerinnering = (index: number) => {
    const newData = [...reviewedData];
    newData[index] = { ...newData[index], _herinnering: !newData[index]._herinnering };
    if (!newData[index]._herinnering) {
      newData[index]._herinneringOpmerking = '';
    }
    setReviewedData(newData);
  };

  const updateHerinneringOpmerking = (index: number, opmerking: string) => {
    const newData = [...reviewedData];
    newData[index] = { ...newData[index], _herinneringOpmerking: opmerking };
    setReviewedData(newData);
  };

  const handleRowClick = (index: number) => {
    setSelectedRowIndex(index);
    setTempComment(reviewedData[index]._comments || '');
    setSelectedAction(null); // Reset action
    setActionName(''); // Reset name
    setCommentModalOpen(true);
    // Automatically reject the row when clicking on comment
    toggleRowRejection(index);
  };

  const handleCommentSave = () => {
    if (selectedRowIndex !== null) {
      let finalComment = tempComment;
      
      // If action button was clicked, format the comment
      if (selectedAction) {
        const actionText = selectedAction === 'herinnering' 
          ? 'Herinnering sturen'
          : `Bellen: ${actionName}`;
        finalComment = actionText;
      }
      
      updateRowComments(selectedRowIndex, finalComment);
    }
    setCommentModalOpen(false);
    setSelectedRowIndex(null);
    setSelectedAction(null);
    setActionName('');
    setTempComment('');
  };

  const handleCommentCancel = () => {
    setCommentModalOpen(false);
    setSelectedRowIndex(null);
    setTempComment('');
    setSelectedAction(null);
    setActionName('');
  };

  const addQuickComment = (comment: string) => {
    if (selectedRowIndex !== null) {
      const currentComment = reviewedData[selectedRowIndex]._comments || '';
      const newComment = currentComment ? `${currentComment}; ${comment}` : comment;
      updateRowComments(selectedRowIndex, newComment);
    }
  };

  const quickActions = [
    { label: 'Herinnering sturen', value: 'Herinnering verstuurd naar debiteur' },
    { label: 'Bellen', value: 'Telefoongesprek gevoerd met debiteur' },
    { label: 'Namen', value: 'Overgedragen aan: ' },
  ];

  const colleagues = [
    'Jan Jansen',
    'Marieke de Vries',
    'Peter Bakker',
    'Sandra Visser',
    'Robert Mulder',
    'Linda Smit'
  ];

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/review/${uploadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comments,
          reviewedData,
        }),
      });

      if (response.ok) {
        addToast('success', 'Review voltooid! Upload is gemarkeerd als reviewed.');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        addToast('error', 'Review opslaan mislukt');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      addToast('error', 'Review opslaan mislukt');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="animate-pulse bg-slate-200 dark:bg-slate-800 h-8 w-64 rounded-xl mb-8" />
          <div className="animate-pulse bg-slate-200 dark:bg-slate-800 h-28 rounded-2xl mb-5" />
          <div className="animate-pulse bg-slate-200 dark:bg-slate-800 h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!uploadData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Upload niet gevonden</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">De opgevraagde upload bestaat niet of is verwijderd.</p>
          <a href="/dashboard" className="btn-primary inline-flex items-center">
            Terug naar Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toast Notifications */}
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
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Review</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm">{uploadData.upload.filename}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="btn-secondary text-sm py-2">
              {isFullscreen ? 'Verkleinen' : 'Vergroten'}
            </button>
            <button onClick={() => window.location.href = '/dashboard'} className="btn-ghost text-sm py-2">
              Terug
            </button>
          </div>
        </div>

        <div className="card-modern p-5 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Totaal rijen', value: reviewedData.length },
              { label: 'Gefilterd', value: filteredAndPaginatedData.totalRows },
              { label: 'Afgewezen', value: reviewedData.filter(r => r._rejected).length },
              { label: 'Geaccepteerd', value: reviewedData.filter(r => !r._rejected).length },
            ].map(stat => (
              <div key={stat.label} className="text-center p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
          {issuesCount > 0 && (
            <div className="mt-4 flex items-center gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm font-semibold text-amber-800 dark:text-amber-400">
              <AlertTriangle size={16} />
              {issuesCount} rij(en) met problemen gedetecteerd
            </div>
          )}
        </div>

        {/* Search and Filter Section */}
        <div className="card-modern p-4 mb-5">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            {/* Search Bar */}
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Zoeken in alle kolommen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all"
                />
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                showFilters ? 'bg-blue-600 text-white' : 'btn-secondary'
              }`}
            >
              <Filter size={15} />
              {showFilters ? 'Verberg' : 'Filters'}
            </button>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-500 whitespace-nowrap">Per pagina:</label>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800/80 focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Debtor Number Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Debiteurnummer</label>
                  <input
                    type="text"
                    placeholder="Filter op debiteurnummer..."
                    value={filterDebtor}
                    onChange={(e) => setFilterDebtor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white bg-white dark:bg-slate-700"
                  />
                </div>

                {/* Company Name Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bedrijfsnaam</label>
                  <input
                    type="text"
                    placeholder="Filter op bedrijfsnaam..."
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white bg-white dark:bg-slate-700"
                  />
                </div>

                {/* Rejection Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status Filter</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterRejected('all')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filterRejected === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setFilterRejected('rejected')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filterRejected === 'rejected'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      Afgewezen
                    </button>
                    <button
                      onClick={() => setFilterRejected('accepted')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filterRejected === 'accepted'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      Geaccepteerd
                    </button>
                  </div>
                </div>

                {/* Days Open Filter */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dagen Open Filter</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterDaysOpen('all')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filterDaysOpen === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setFilterDaysOpen('overdue')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filterDaysOpen === 'overdue'
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      Achterstallig
                    </button>
                    <button
                      onClick={() => setFilterDaysOpen('upcoming')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filterDaysOpen === 'upcoming'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      Niet Verlopen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`card-modern p-6 mb-6 ${isFullscreen ? 'fixed inset-4 z-40 bg-white dark:bg-slate-800 overflow-auto' : ''}`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Review</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Rijen {filteredAndPaginatedData.startIndex + 1} - {filteredAndPaginatedData.endIndex} van {filteredAndPaginatedData.totalRows}
                {filteredAndPaginatedData.totalRows !== reviewedData.length && ` (gefilterd van ${reviewedData.length} totaal)`}
              </p>
            </div>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn-primary text-sm"
            >
              {isFullscreen ? 'Verkleinen' : 'Vergroten'}
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Klik op een rij om opmerkingen toe te voegen. Gebruik de checkbox om rijen af te wijzen.
          </p>

        {/* Mobile View - Card Layout with All Data */}
        <div className="block md:hidden space-y-4">
          {filteredAndPaginatedData.data.map((row, relativeIndex) => {
            const absoluteIndex = getAbsoluteIndex(relativeIndex);
            const daysOpen = calculateDaysOpen(row);
            const isOverdue = daysOpen !== null && daysOpen < 0;
            return (
            <div key={absoluteIndex} className={`bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border ${isOverdue ? 'border-red-400 dark:border-red-500 bg-red-100 dark:bg-red-900/30' : row._rejected ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {String(row['Factuurnummer'] || row['factuurnummer'] || `Rij ${absoluteIndex + 1}`)}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {String(row['Relatienaam'] || row['relatienaam'] || '')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    {formatCellValue('Factuurbedrag', row['Factuurbedrag'] || row['factuurbedrag'] || '0')}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={row._rejected || false}
                      onChange={() => toggleRowRejection(absoluteIndex)}
                      className="rounded border-slate-200 dark:border-slate-600 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-xs text-red-600 dark:text-red-400">Afwijzen</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={row._herinnering || false}
                      onChange={() => toggleHerinnering(absoluteIndex)}
                      className="rounded border-slate-200 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-blue-600 dark:text-blue-400">Herinnering</span>
                  </label>
                  <button
                    onClick={() => handleRowClick(absoluteIndex)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>

              {/* Show all columns in mobile view */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3">
                {allColumns.slice(0, 6).map((column) => (
                  <div key={column} className="truncate">
                    <span className="font-medium">{column}:</span> {formatCellValue(column, row[column])}
                  </div>
                ))}
                {allColumns.length > 6 && (
                  <div className="col-span-2 text-center text-blue-600 dark:text-blue-400 text-sm mt-2">
                    + {allColumns.length - 6} meer kolommen - klik voor details
                  </div>
                )}
              </div>

              {row._herinnering && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={String(row._herinneringOpmerking || '')}
                    onChange={(e) => updateHerinneringOpmerking(absoluteIndex, e.target.value)}
                    placeholder="Herinnering opmerking..."
                    className="w-full px-2 py-1 text-xs border border-blue-200 dark:border-blue-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {row._comments && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-800 dark:text-blue-400">
                  <strong>Opmerking:</strong> {row._comments}
                </div>
              )}
            </div>
          );
          })}
        </div>

        {/* Desktop View - Dynamic Table with All Columns */}
        <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-600 rounded-lg" style={{ maxHeight: isFullscreen ? 'calc(100vh - 300px)' : '600px' }}>
          <table className="w-full table-auto border-collapse text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 dark:bg-slate-700">
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-600 w-12 sticky left-0 bg-slate-100 dark:bg-slate-700 z-30">
                  #
                </th>
                {allColumns.map((column) => (
                  <th key={column} className="px-2 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-600" style={{ minWidth: '120px', maxWidth: '200px' }}>
                    {column}
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-600 w-16">
                  Afwijzen
                </th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-600 w-24">
                  Herinnering
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-600" style={{ minWidth: '150px' }}>
                  Herinnering Opmerking
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 border-b w-24 sticky right-0 bg-slate-100 dark:bg-slate-700 z-30">
                  Opmerking
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800">
              {filteredAndPaginatedData.data.map((row, relativeIndex) => {
                const absoluteIndex = getAbsoluteIndex(relativeIndex);
                const daysOpen = calculateDaysOpen(row);
                const isOverdue = daysOpen !== null && daysOpen < 0;
                return (
                <tr
                  key={absoluteIndex}
                  className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : row._rejected ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                >
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700 text-center sticky left-0 bg-white dark:bg-slate-800 z-20">
                    {absoluteIndex + 1}
                  </td>
                  {allColumns.map((column) => (
                    <td key={column} className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                      <div className="truncate" style={{ maxWidth: '180px' }} title={String(row[column] || '')}>
                        {formatCellValue(column, row[column])}
                      </div>
                    </td>
                  ))}
                  <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">
                    <input
                      type="checkbox"
                      checked={row._rejected || false}
                      onChange={() => toggleRowRejection(absoluteIndex)}
                      className="rounded border-slate-200 dark:border-slate-600 text-red-600 focus:ring-red-500"
                    />
                  </td>
                  <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">
                    <input
                      type="checkbox"
                      checked={row._herinnering || false}
                      onChange={() => toggleHerinnering(absoluteIndex)}
                      className="rounded border-slate-200 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-700">
                    {row._herinnering && (
                      <input
                        type="text"
                        value={String(row._herinneringOpmerking || '')}
                        onChange={(e) => updateHerinneringOpmerking(absoluteIndex, e.target.value)}
                        placeholder="Extra opmerking..."
                        className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                  </td>
                  <td className="px-2 py-2 sticky right-0 bg-white dark:bg-slate-800 z-20">
                    <button
                      onClick={() => handleRowClick(absoluteIndex)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                    >
                      <MessageSquare size={12} />
                      <span>{row._comments ? 'Edit' : 'Add'}</span>
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredAndPaginatedData.totalPages > 1 && (
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              Pagina {currentPage} van {filteredAndPaginatedData.totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Eerste
              </button>
              
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Vorige
              </button>
              
              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, filteredAndPaginatedData.totalPages) }, (_, i) => {
                  let pageNum;
                  if (filteredAndPaginatedData.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= filteredAndPaginatedData.totalPages - 2) {
                    pageNum = filteredAndPaginatedData.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-md transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(filteredAndPaginatedData.totalPages, prev + 1))}
                disabled={currentPage === filteredAndPaginatedData.totalPages}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                Volgende
                <ChevronRight size={16} />
              </button>
              
              <button
                onClick={() => setCurrentPage(filteredAndPaginatedData.totalPages)}
                disabled={currentPage === filteredAndPaginatedData.totalPages}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Laatste
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card-modern p-6">
        <h2 className="font-bold mb-4 text-slate-900 dark:text-white">Algemene opmerkingen</h2>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Algemene opmerkingen over deze upload..."
          className="w-full h-28 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all resize-none text-sm"
        />

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSubmitReview}
            disabled={submitting}
            className="btn-primary flex items-center gap-2"
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Opslaan...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Review voltooien</>
            )}
          </button>

          <button
            onClick={() => window.location.href = '/dashboard'}
            className="btn-secondary"
          >
            Annuleren
          </button>
        </div>
      </div>

      {/* Comment Modal */}
      {commentModalOpen && selectedRowIndex !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-modern bg-white dark:bg-[#111827] max-w-md w-full mx-4 fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Opmerking toevoegen</h3>
              <button
                onClick={handleCommentCancel}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Rij {selectedRowIndex + 1} - Alle gegevens:</p>
              <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded text-sm max-h-48 overflow-y-auto">
                <div className="grid grid-cols-1 gap-1">
                  {allColumns.map((column) => (
                    <div key={column} className="flex justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{column}:</span>
                      <span className="text-slate-900 dark:text-white ml-2 truncate">{formatCellValue(column, reviewedData[selectedRowIndex]?.[column])}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Dagen open:</span>
                    {(() => {
                      const daysOpen = calculateDaysOpen(reviewedData[selectedRowIndex] || {});
                      return daysOpen !== null ? (
                        <span className={`font-semibold ml-2 ${daysOpen < 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'}`}>
                          {daysOpen > 0 ? `+${daysOpen}` : daysOpen}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 ml-2">-</span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reviewedData[selectedRowIndex]?._rejected || false}
                  onChange={() => {
                    if (selectedRowIndex !== null) {
                      toggleRowRejection(selectedRowIndex);
                    }
                  }}
                  className="rounded border-slate-200 dark:border-slate-600 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Deze rij afwijzen</span>
              </label>
            </div>

            {/* Action Buttons - Herinnering / Bellen */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Actie selecteren:
              </label>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => {
                    setSelectedAction('herinnering');
                    setActionName('');
                  }}
                  className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedAction === 'herinnering'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                  }`}
                >
                  <Mail size={18} />
                  Herinnering
                </button>
                <button
                  onClick={() => {
                    setSelectedAction('bellen');
                    setActionName('');
                  }}
                  className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedAction === 'bellen'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                  }`}
                >
                  <MessageSquare size={18} />
                  Bellen
                </button>
              </div>

              {/* Show name input when Bellen is selected */}
              {selectedAction === 'bellen' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Naam invoeren:
                  </label>
                  <input
                    type="text"
                    value={actionName}
                    onChange={(e) => setActionName(e.target.value)}
                    placeholder="Voer naam in..."
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    autoFocus
                  />
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Dit wordt opgeslagen als: &quot;Bellen: {actionName || '[naam]'}&quot;
                  </p>
                </div>
              )}

              {/* Show confirmation for Herinnering */}
              {selectedAction === 'herinnering' && (
                <div className="mb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                    Dit wordt opgeslagen als: &quot;Herinnering sturen&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Only show quick actions and comment textarea if no action is selected */}
            {!selectedAction && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Snelle acties:
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => {
                          if (action.label === 'Namen') {
                            setShowColleagueModal(true);
                          } else {
                            addQuickComment(action.value);
                          }
                        }}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Opmerking (handmatig toevoegen/bewerken)
                  </label>
                  <textarea
                    value={tempComment}
                    onChange={(e) => setTempComment(e.target.value)}
                    placeholder="Voeg een opmerking toe bij deze rij..."
                    className="w-full h-24 p-3 border border-slate-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-slate-900 dark:text-white bg-white dark:bg-slate-700"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCommentSave}
                disabled={selectedAction === 'bellen' && !actionName.trim()}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Opslaan
              </button>
              <button
                onClick={handleCommentCancel}
                className="flex-1 bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-4 py-2 rounded transition-colors font-medium"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Colleague Selection Modal */}
      {showColleagueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-modern bg-white dark:bg-[#111827] max-w-md w-full fade-in">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Selecteer Collega
                </h3>
                <button
                  onClick={() => {
                    setShowColleagueModal(false);
                    setSelectedColleague('');
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-2 mb-6">
                {colleagues.map((colleague) => (
                  <button
                    key={colleague}
                    onClick={() => setSelectedColleague(colleague)}
                    className={`w-full px-4 py-3 text-left rounded-lg transition-colors ${
                      selectedColleague === colleague
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 text-blue-900 dark:text-blue-100'
                        : 'bg-slate-50 dark:bg-slate-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600 text-slate-900 dark:text-white'
                    }`}
                  >
                    {colleague}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (selectedColleague) {
                      addQuickComment(`Overgedragen aan: ${selectedColleague}`);
                      setShowColleagueModal(false);
                      setSelectedColleague('');
                    }
                  }}
                  disabled={!selectedColleague}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => {
                    setShowColleagueModal(false);
                    setSelectedColleague('');
                  }}
                  className="flex-1 bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded transition-colors font-medium"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}