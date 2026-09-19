import React from 'react';
import { CheckCircle2, AlertTriangle, UserMinus, UserPlus, Layers, Hash, Percent } from 'lucide-react';
import { CompareResult } from '../types';

interface DiffSummaryCardsProps {
  result: CompareResult;
}

export const DiffSummaryCards: React.FC<DiffSummaryCardsProps> = ({ result }) => {
  const totalEvaluated = result.totalRowsA + result.onlyInBCount;
  const matchRatePct =
    totalEvaluated > 0
      ? Number(((result.identicalRowCount / totalEvaluated) * 100).toFixed(2))
      : 0;

  const totalCellsEvaluated = totalEvaluated * result.totalColumnsEvaluated;
  const cellErrorRatePct =
    totalCellsEvaluated > 0
      ? Number(((result.totalCellDiscrepancies / totalCellsEvaluated) * 100).toFixed(4))
      : 0;

  return (
    <div className="space-y-3">
      {/* Visual Reconciliation Ratio Bar */}
      <div className="bg-[#0C2340] rounded-xl border border-[#183A66] p-3 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white">Reconciliation Breakdown</span>
            <span className="text-[#94A3B8] font-mono text-[11px]">
              ({totalEvaluated.toLocaleString()} Total Unique Keys)
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] font-mono">
            <span className="text-[#00A8CB] font-semibold">
              ● Identical: {result.identicalRowCount.toLocaleString()} ({matchRatePct}%)
            </span>
            <span className="text-[#FAD702] font-semibold">
              ● Mismatch: {result.mismatchedRowCount.toLocaleString()}
            </span>
            <span className="text-rose-400 font-semibold">
              ● Missing in B: {result.onlyInACount.toLocaleString()}
            </span>
            <span className="text-cyan-300 font-semibold">
              ● Missing in A: {result.onlyInBCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Visual Stacked Bar */}
        <div className="h-3 w-full bg-[#07172C] rounded-full overflow-hidden flex border border-[#183A66]">
          {result.identicalRowCount > 0 && (
            <div
              style={{ width: `${(result.identicalRowCount / totalEvaluated) * 100}%` }}
              className="bg-[#00A8CB] h-full"
              title={`Identical: ${result.identicalRowCount.toLocaleString()}`}
            />
          )}
          {result.mismatchedRowCount > 0 && (
            <div
              style={{ width: `${(result.mismatchedRowCount / totalEvaluated) * 100}%` }}
              className="bg-[#FAD702] h-full"
              title={`Value Mismatch: ${result.mismatchedRowCount.toLocaleString()}`}
            />
          )}
          {result.onlyInACount > 0 && (
            <div
              style={{ width: `${(result.onlyInACount / totalEvaluated) * 100}%` }}
              className="bg-rose-500 h-full"
              title={`Missing in B (Only in A): ${result.onlyInACount.toLocaleString()}`}
            />
          )}
          {result.onlyInBCount > 0 && (
            <div
              style={{ width: `${(result.onlyInBCount / totalEvaluated) * 100}%` }}
              className="bg-cyan-400 h-full"
              title={`Missing in A (Only in B): ${result.onlyInBCount.toLocaleString()}`}
            />
          )}
        </div>
      </div>

      {/* 6 Executive Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Identical Rows */}
        <div className="p-3 rounded-xl bg-[#0C2340] border border-[#00A8CB]/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Identical Rows</span>
            <CheckCircle2 className="w-4 h-4 text-[#00A8CB]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#00A8CB]">
            {result.identicalRowCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1 flex items-center justify-between">
            <span>Match Rate:</span>
            <span className="font-mono text-[#00A8CB] font-bold">{matchRatePct}%</span>
          </div>
        </div>

        {/* Value Mismatches */}
        <div className="p-3 rounded-xl bg-[#0C2340] border border-[#FAD702]/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Mismatched Rows</span>
            <AlertTriangle className="w-4 h-4 text-[#FAD702]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#FAD702]">
            {result.mismatchedRowCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1 flex items-center justify-between">
            <span>Keys In Both:</span>
            <span className="font-mono text-slate-200">{result.matchedKeyCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Missing in B (Only in A) */}
        <div className="p-3 rounded-xl bg-[#0C2340] border border-rose-500/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Missing in B</span>
            <UserMinus className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            {result.onlyInACount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Deleted in Target Dataset</div>
        </div>

        {/* Missing in A (Only in B) */}
        <div className="p-3 rounded-xl bg-[#0C2340] border border-cyan-500/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Missing in A</span>
            <UserPlus className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {result.onlyInBCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Newly Inserted in Target</div>
        </div>

        {/* Cell Discrepancies */}
        <div className="p-3 rounded-xl bg-[#0C2340] border border-[#183A66] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Cell Discrepancies</span>
            <Hash className="w-4 h-4 text-[#00A8CB]" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {result.totalCellDiscrepancies.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1 flex items-center justify-between">
            <span>Cell Error Rate:</span>
            <span className="font-mono text-[#00A8CB]">{cellErrorRatePct}%</span>
          </div>
        </div>

        {/* Evaluated Columns */}
        <div className="p-3 rounded-xl bg-[#0C2340] border border-[#183A66] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Columns Evaluated</span>
            <Layers className="w-4 h-4 text-[#00A8CB]" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {result.totalColumnsEvaluated.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Across 32GB RAM Engine</div>
        </div>
      </div>
    </div>
  );
};
