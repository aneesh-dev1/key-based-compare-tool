import React, { useState, useMemo } from 'react';
import {
  Table,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  UserMinus,
  UserPlus,
  Copy,
  Check,
} from 'lucide-react';
import { DiscrepancyRow, DiffRowStatus } from '../types';

interface DiffTableViewerProps {
  discrepancies: DiscrepancyRow[];
  selectedColumnFilter: string | null;
  onClearColumnFilter: () => void;
}

export const DiffTableViewer: React.FC<DiffTableViewerProps> = ({
  discrepancies,
  selectedColumnFilter,
  onClearColumnFilter,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | DiffRowStatus>('all');
  const [searchKey, setSearchKey] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter discrepancies
  const filteredRows = useMemo(() => {
    return discrepancies.filter((row) => {
      // Status filter
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;

      // Column filter
      if (selectedColumnFilter) {
        const hasCol = row.discrepancies.some((d) => d.column === selectedColumnFilter);
        if (!hasCol && row.status === 'value_mismatch') return false;
      }

      // Key search
      if (searchKey) {
        const q = searchKey.toLowerCase();
        const keyMatches = row.key.toLowerCase().includes(q);
        const colMatches = row.discrepancies.some((d) => d.column.toLowerCase().includes(q));
        if (!keyMatches && !colMatches) return false;
      }

      return true;
    });
  }, [discrepancies, statusFilter, selectedColumnFilter, searchKey]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const toggleExpand = (key: string) => {
    const next = new Set(expandedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedKeys(next);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Export handlers
  const exportCsv = () => {
    const headers = ['Row_Key', 'Diff_Status', 'Column_Name', 'Value_Dataset_A', 'Value_Dataset_B', 'Delta', 'Reason'];
    const rows: string[] = [headers.join(',')];

    discrepancies.forEach((row) => {
      if (row.discrepancies.length === 0) {
        rows.push([`"${row.key}"`, row.status, 'N/A', 'N/A', 'N/A', 'N/A', row.status].join(','));
      } else {
        row.discrepancies.forEach((d) => {
          rows.push(
            [
              `"${row.key}"`,
              row.status,
              `"${d.column}"`,
              `"${String(d.valA ?? '')}"`,
              `"${String(d.valB ?? '')}"`,
              d.delta !== undefined ? d.delta : '',
              `"${d.reason}"`,
            ].join(',')
          );
        });
      }
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dataset_diff_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(discrepancies, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dataset_diff_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: DiffRowStatus) => {
    switch (status) {
      case 'value_mismatch':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#FAD702]/15 text-[#FAD702] border border-[#FAD702]/40">
            <AlertTriangle className="w-3 h-3 mr-1 text-[#FAD702]" />
            Value Mismatch
          </span>
        );
      case 'only_in_a':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950/80 text-rose-300 border border-rose-800">
            <UserMinus className="w-3 h-3 mr-1" />
            Missing in Target (Only in A)
          </span>
        );
      case 'only_in_b':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#00A8CB]/15 text-[#00A8CB] border border-[#00A8CB]/40">
            <UserPlus className="w-3 h-3 mr-1 text-[#00A8CB]" />
            Missing in Baseline (Only in B)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#0C2340] rounded-xl border border-[#183A66] overflow-hidden shadow-md space-y-4 p-4">
      {/* Table Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#183A66] pb-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#00A8CB] text-[#002D62] font-bold'
                : 'bg-[#07172C] text-[#94A3B8] hover:text-white border border-[#183A66]'
            }`}
          >
            All Discrepancies ({discrepancies.length.toLocaleString()})
          </button>

          <button
            onClick={() => {
              setStatusFilter('value_mismatch');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'value_mismatch'
                ? 'bg-[#FAD702] text-[#002D62] font-bold border border-[#FAD702]'
                : 'bg-[#07172C] text-[#94A3B8] hover:text-white border border-[#183A66]'
            }`}
          >
            Value Mismatches
          </button>

          <button
            onClick={() => {
              setStatusFilter('only_in_a');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'only_in_a'
                ? 'bg-rose-900 text-rose-100 font-bold border border-rose-700'
                : 'bg-[#07172C] text-[#94A3B8] hover:text-white border border-[#183A66]'
            }`}
          >
            Only in A
          </button>

          <button
            onClick={() => {
              setStatusFilter('only_in_b');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'only_in_b'
                ? 'bg-[#00A8CB]/30 text-[#00A8CB] font-bold border border-[#00A8CB]'
                : 'bg-[#07172C] text-[#94A3B8] hover:text-white border border-[#183A66]'
            }`}
          >
            Only in B
          </button>

          {selectedColumnFilter && (
            <button
              onClick={onClearColumnFilter}
              className="px-2 py-1 rounded-lg text-xs font-mono bg-[#FAD702]/20 text-[#FAD702] border border-[#FAD702]/50 flex items-center space-x-1 cursor-pointer"
            >
              <span>Col: {selectedColumnFilter}</span>
              <span className="font-bold">×</span>
            </button>
          )}
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by key or column..."
              value={searchKey}
              onChange={(e) => {
                setSearchKey(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2 py-1 bg-[#07172C] border border-[#183A66] rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00A8CB]"
            />
          </div>

          <button
            onClick={exportCsv}
            className="px-2.5 py-1 rounded bg-[#07172C] hover:bg-[#102C52] border border-[#183A66] text-xs font-medium text-slate-200 flex items-center space-x-1 transition-colors cursor-pointer"
            title="Export discrepancy rows to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={exportJson}
            className="px-2.5 py-1 rounded bg-[#07172C] hover:bg-[#102C52] border border-[#183A66] text-xs font-medium text-slate-200 flex items-center space-x-1 transition-colors cursor-pointer"
            title="Export discrepancy rows to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Rows Table */}
      {paginatedRows.length > 0 ? (
        <div className="space-y-2">
          {paginatedRows.map((row) => {
            const isExpanded = expandedKeys.has(row.key);

            return (
              <div
                key={row.key}
                className="bg-[#07172C] rounded-lg border border-[#183A66] overflow-hidden text-xs transition-colors hover:border-[#00A8CB]/50"
              >
                {/* Row Header */}
                <div
                  onClick={() => toggleExpand(row.key)}
                  className="p-3 flex items-center justify-between cursor-pointer select-none bg-[#09203C] hover:bg-[#0C294D]"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(row.key);
                      }}
                      className="text-[#94A3B8] hover:text-white cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-[#94A3B8] text-[10px] uppercase font-mono">Key:</span>
                      <span className="font-mono font-semibold text-white truncate max-w-[280px]" title={row.key}>
                        {row.key}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(row.key);
                        }}
                        className="text-[#94A3B8] hover:text-slate-200 p-0.5 cursor-pointer"
                        title="Copy Key"
                      >
                        {copiedKey === row.key ? (
                          <Check className="w-3 h-3 text-[#00A8CB]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {getStatusBadge(row.status)}
                  </div>

                  <div className="flex items-center space-x-4 text-xs font-mono shrink-0">
                    {row.status === 'value_mismatch' && (
                      <span className="text-[#FAD702] font-semibold">
                        {row.discrepancies.length} column diff{row.discrepancies.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-3 bg-[#07172C] border-t border-[#183A66] space-y-3">
                    {row.discrepancies.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-[#0C2340] text-[#94A3B8] border-b border-[#183A66]">
                              <th className="p-2">Column Name</th>
                              <th className="p-2">Baseline Value (A)</th>
                              <th className="p-2">Target Value (B)</th>
                              <th className="p-2">Delta (Δ)</th>
                              <th className="p-2">Mismatch Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.discrepancies.map((d, idx) => (
                              <tr key={idx} className="border-b border-[#183A66]/60 hover:bg-[#0C2340]/60">
                                <td className="p-2 font-semibold text-white">{d.column}</td>
                                <td className="p-2 text-rose-400 bg-rose-950/20 max-w-[200px] truncate">
                                  {d.valA !== undefined && d.valA !== null ? String(d.valA) : 'NULL'}
                                </td>
                                <td className="p-2 text-[#00A8CB] bg-[#00A8CB]/10 max-w-[200px] truncate">
                                  {d.valB !== undefined && d.valB !== null ? String(d.valB) : 'NULL'}
                                </td>
                                <td className="p-2 text-slate-300">
                                  {d.delta !== undefined ? (
                                    <span>
                                      {d.delta > 0 ? `+${d.delta}` : d.delta}{' '}
                                      {d.pctDelta !== undefined && (
                                        <span className="text-[#94A3B8] font-sans text-[10px]">
                                          ({d.pctDelta}%)
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="p-2 text-[#94A3B8] font-sans text-[11px]">{d.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-2 text-[#94A3B8] text-xs font-mono">
                        {row.status === 'only_in_a'
                          ? 'This row key is present in Baseline Dataset A, but missing in Target Dataset B (Row Deleted).'
                          : 'This row key is present in Target Dataset B, but missing in Baseline Dataset A (Row Inserted).'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-[#183A66] gap-2 text-xs">
            <div className="text-[#94A3B8] font-mono text-[11px]">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length.toLocaleString()} rows
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-[#07172C] border border-[#183A66] rounded text-slate-300 text-xs"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-[#07172C] hover:bg-[#102C52] text-slate-300 disabled:opacity-40 border border-[#183A66] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-[#94A3B8] font-mono text-[11px]">
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded bg-[#07172C] hover:bg-[#102C52] text-slate-300 disabled:opacity-40 border border-[#183A66] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-[#94A3B8] text-xs font-mono space-y-1">
          <div>No discrepancies match your search or filter criteria.</div>
          <div className="text-[11px] text-slate-500">Try changing the status filter or clearing your search.</div>
        </div>
      )}
    </div>
  );
};
