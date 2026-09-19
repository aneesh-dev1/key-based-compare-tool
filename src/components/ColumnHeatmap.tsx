import React, { useState } from 'react';
import { BarChart3, Search, AlertCircle, ArrowUpDown, Filter } from 'lucide-react';
import { ColumnDiffStat } from '../types';

interface ColumnHeatmapProps {
  stats: ColumnDiffStat[];
  selectedColumnFilter: string | null;
  onSelectColumnFilter: (colName: string | null) => void;
}

export const ColumnHeatmap: React.FC<ColumnHeatmapProps> = ({
  stats,
  selectedColumnFilter,
  onSelectColumnFilter,
}) => {
  const [search, setSearch] = useState('');
  const [showOnlyMismatched, setShowOnlyMismatched] = useState(true);

  // Filter columns based on search and whether they have mismatches
  const filteredStats = stats.filter((s) => {
    if (showOnlyMismatched && s.mismatchCount === 0) return false;
    if (search && !s.column.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const maxMismatch = Math.max(1, ...stats.map((s) => s.mismatchCount));
  const columnsWithDiffsCount = stats.filter((s) => s.mismatchCount > 0).length;

  return (
    <div className="bg-[#0C2340] rounded-xl border border-[#183A66] p-4 space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-[#00A8CB]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Column Discrepancy Distribution ({columnsWithDiffsCount} columns with mismatches)
          </h3>
          {selectedColumnFilter && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#FAD702]/20 text-[#FAD702] border border-[#FAD702]/50 text-[10px] font-mono">
              <span>Filtered: {selectedColumnFilter}</span>
              <button
                onClick={() => onSelectColumnFilter(null)}
                className="ml-1 hover:text-white cursor-pointer"
              >
                ×
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3 h-3 text-[#94A3B8] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search column stats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1 bg-[#07172C] border border-[#183A66] rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00A8CB]"
            />
          </div>

          <label className="flex items-center space-x-1.5 text-xs text-[#94A3B8] cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showOnlyMismatched}
              onChange={(e) => setShowOnlyMismatched(e.target.checked)}
              className="rounded bg-[#07172C] border-[#183A66] text-[#00A8CB] focus:ring-0"
            />
            <span>Mismatches only</span>
          </label>
        </div>
      </div>

      {filteredStats.length > 0 ? (
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {filteredStats.map((item) => {
            const isSelected = selectedColumnFilter === item.column;
            const pctBar = Math.max(3, (item.mismatchCount / maxMismatch) * 100);

            return (
              <div
                key={item.column}
                onClick={() => onSelectColumnFilter(isSelected ? null : item.column)}
                className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#002D62] border-[#00A8CB] text-white'
                    : 'bg-[#07172C] border-[#183A66] hover:border-[#00A8CB]/50 text-slate-300'
                }`}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-medium truncate max-w-[260px] text-white">
                      {item.column}
                    </span>
                    <span className="font-mono text-[11px] text-[#94A3B8]">
                      <strong className="text-[#FAD702] font-semibold">{item.mismatchCount.toLocaleString()}</strong> diffs ({item.mismatchPct}%)
                    </span>
                  </div>

                  {/* Relative bar */}
                  <div className="w-full bg-[#0A1D36] rounded-full h-1.5 overflow-hidden">
                    <div
                      style={{ width: `${pctBar}%` }}
                      className={`h-full ${item.mismatchCount > 0 ? 'bg-[#FAD702]' : 'bg-[#183A66]'}`}
                    />
                  </div>
                </div>

                {item.sampleDiff && (
                  <div className="hidden md:flex items-center space-x-2 text-[10px] font-mono text-[#94A3B8] shrink-0 border-l border-[#183A66] pl-3">
                    <span className="text-rose-400 truncate max-w-[90px]" title={String(item.sampleDiff.valA)}>
                      A: {String(item.sampleDiff.valA)}
                    </span>
                    <span>→</span>
                    <span className="text-[#00A8CB] truncate max-w-[90px]" title={String(item.sampleDiff.valB)}>
                      B: {String(item.sampleDiff.valB)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-[#94A3B8] text-xs font-mono">
          {columnsWithDiffsCount === 0
            ? '✨ 100% Exact Match: Zero column discrepancies found across all evaluated columns!'
            : 'No matching columns found.'}
        </div>
      )}
    </div>
  );
};
