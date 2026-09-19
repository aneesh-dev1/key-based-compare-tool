import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Database,
  Sparkles,
  CheckCircle2,
  Trash2,
  Eye,
  Table,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { DatasetMeta } from '../types';
import { loadDatasetFile, generateSyntheticPair } from '../utils/fileParsers';

interface DatasetInputProps {
  datasetA: DatasetMeta | null;
  datasetB: DatasetMeta | null;
  onSetDatasetA: (meta: DatasetMeta | null, rawRows?: Record<string, any>[]) => void;
  onSetDatasetB: (meta: DatasetMeta | null, rawRows?: Record<string, any>[]) => void;
  onLoadSyntheticBenchmark: (rows: number, cols: number) => void;
  isLoading: boolean;
}

export const DatasetInput: React.FC<DatasetInputProps> = ({
  datasetA,
  datasetB,
  onSetDatasetA,
  onSetDatasetB,
  onLoadSyntheticBenchmark,
  isLoading,
}) => {
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  const [previewDataset, setPreviewDataset] = useState<DatasetMeta | null>(null);
  const [showCustomSize, setShowCustomSize] = useState<boolean>(false);
  const [customRows, setCustomRows] = useState<number>(100000);
  const [customCols, setCustomCols] = useState<number>(2000);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'file_a' | 'file_b') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const meta = await loadDatasetFile(file, side);
      if (side === 'file_a') {
        onSetDatasetA(meta, meta.previewRows);
      } else {
        onSetDatasetB(meta, meta.previewRows);
      }
    } catch (err: any) {
      alert(`Error loading file: ${err.message || String(err)}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleRunGenerator = (rows: number, cols: number) => {
    setIsGenerating(true);
    setTimeout(() => {
      onLoadSyntheticBenchmark(rows, cols);
      setIsGenerating(false);
    }, 50);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'parquet':
        return <Database className="w-4 h-4 text-sky-400" />;
      case 'xlsx':
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileText className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1-Click High-Scale Synthetic Benchmark Bar */}
      <div className="bg-[#0C2340] p-4 rounded-xl border border-[#183A66] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-[#00A8CB]/15 text-[#00A8CB] border border-[#00A8CB]/40 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white">Instant Large-Scale Test Bench</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#00A8CB]/20 text-[#00A8CB] border border-[#00A8CB]/40">
                1-Click Load
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              No files ready? Generate synthetic paired datasets with 2,000 columns and realistic discrepancies.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Requested 100K x 2000 Cols Benchmark Button */}
          <button
            id="btn-synthetic-100k-2000col"
            disabled={isLoading || isGenerating}
            onClick={() => handleRunGenerator(100000, 2000)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FAD702] to-[#FFE853] hover:from-[#E6C602] hover:to-[#FAD702] text-[#0C2340] font-bold text-xs transition-all flex items-center space-x-1.5 shadow-md shadow-amber-950/20 disabled:opacity-50 cursor-pointer border border-[#FAD702]/80 ring-2 ring-[#FAD702]/30"
            title="Generate 100,000 Rows × 2,000 Columns (200 Million Total Cells) Out-of-Core Benchmark"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0C2340]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#0C2340]" />
            )}
            <span>100K × 2,000 cols</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0C2340]/20 font-mono tracking-tight font-extrabold uppercase">
              200M Cells
            </span>
          </button>

          <button
            disabled={isLoading || isGenerating}
            onClick={() => handleRunGenerator(5000, 250)}
            className="px-2.5 py-1.5 rounded-lg bg-[#07172C] hover:bg-[#102C52] border border-[#183A66] text-xs font-medium text-slate-200 hover:text-white transition-colors disabled:opacity-50"
          >
            5,000 × 250 cols
          </button>
          <button
            disabled={isLoading || isGenerating}
            onClick={() => handleRunGenerator(2500, 50)}
            className="px-2.5 py-1.5 rounded-lg bg-[#07172C] hover:bg-[#102C52] border border-[#183A66] text-xs font-medium text-slate-200 hover:text-white transition-colors disabled:opacity-50"
          >
            2,500 × 50 cols
          </button>
          <button
            disabled={isLoading || isGenerating}
            onClick={() => handleRunGenerator(2000, 2000)}
            className="px-2.5 py-1.5 rounded-lg bg-[#102C52] hover:bg-[#183A66] text-[#00A8CB] border border-[#00A8CB]/30 font-medium text-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            title="Simulate 10 Lakh (1M) Rows × 2,000 Cols 6GB Workload Profile"
          >
            <Database className="w-3.5 h-3.5" />
            <span>10 Lakh Profile</span>
          </button>
          <button
            disabled={isLoading || isGenerating}
            onClick={() => setShowCustomSize(!showCustomSize)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center space-x-1 ${
              showCustomSize
                ? 'bg-[#00A8CB] text-[#002D62] border-[#00A8CB]'
                : 'bg-[#07172C] hover:bg-[#102C52] border-[#183A66] text-slate-300'
            }`}
            title="Configure custom row and column dimensions"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Custom...</span>
          </button>
        </div>
      </div>

      {/* Custom Dimensions Drawer */}
      {showCustomSize && (
        <div className="bg-[#0C2340]/90 p-3.5 rounded-xl border border-[#00A8CB]/40 shadow-inner flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <SlidersHorizontal className="w-4 h-4 text-[#00A8CB]" />
            <span className="font-semibold text-white">Custom Synthetic Dimension Configurator:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <label className="text-[#94A3B8]">Rows:</label>
              <input
                type="number"
                min="100"
                max="500000"
                step="1000"
                value={customRows}
                onChange={(e) => setCustomRows(Math.max(10, parseInt(e.target.value) || 100))}
                className="w-28 px-2 py-1 rounded bg-[#07172C] border border-[#183A66] text-white font-mono text-xs focus:border-[#00A8CB] focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <label className="text-[#94A3B8]">Columns:</label>
              <input
                type="number"
                min="10"
                max="2500"
                step="50"
                value={customCols}
                onChange={(e) => setCustomCols(Math.max(5, parseInt(e.target.value) || 50))}
                className="w-24 px-2 py-1 rounded bg-[#07172C] border border-[#183A66] text-white font-mono text-xs focus:border-[#00A8CB] focus:outline-none"
              />
            </div>
            <div className="text-[11px] text-[#94A3B8] font-mono">
              Total Cells:{' '}
              <span className="text-[#00A8CB] font-bold">
                {(customRows * customCols).toLocaleString()}
              </span>
            </div>
            <button
              disabled={isLoading || isGenerating}
              onClick={() => handleRunGenerator(customRows, customCols)}
              className="px-3 py-1 rounded-lg bg-[#00A8CB] hover:bg-[#0091AF] text-[#002D62] font-bold text-xs transition-colors flex items-center space-x-1 shadow-sm disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Generate ({customRows.toLocaleString()} × {customCols.toLocaleString()})</span>
            </button>
          </div>
        </div>
      )}

      {/* Dataset A & B Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dataset A Card */}
        <div className="bg-[#0C2340] rounded-xl border border-[#183A66] p-4 space-y-3 relative shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00A8CB]/20 text-[#00A8CB] font-mono text-xs font-bold border border-[#00A8CB]/50">
                A
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Dataset A (Baseline / Golden)</h3>
                <p className="text-[11px] text-[#94A3B8]">CSV, Parquet, or Excel format</p>
              </div>
            </div>

            {datasetA && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPreviewDataset(datasetA)}
                  className="p-1.5 rounded text-[#94A3B8] hover:text-white hover:bg-[#102C52] transition-colors"
                  title="Preview sample rows"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSetDatasetA(null)}
                  className="p-1.5 rounded text-[#94A3B8] hover:text-rose-400 hover:bg-[#102C52] transition-colors"
                  title="Remove dataset A"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {datasetA ? (
            <div className="bg-[#07172C] rounded-lg p-3 border border-[#183A66] space-y-2">
              <div className="flex items-center space-x-2">
                {getFormatIcon(datasetA.format)}
                <span className="font-medium text-xs text-white truncate max-w-[280px]" title={datasetA.name}>
                  {datasetA.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#102C52] text-[#00A8CB] font-semibold border border-[#183A66]">
                  {datasetA.format}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1 border-t border-[#183A66]">
                <div>
                  <span className="text-[10px] text-[#94A3B8] block font-sans">Rows</span>
                  <span className="text-slate-200 font-semibold">{datasetA.rowCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] block font-sans">Columns</span>
                  <span className="text-[#00A8CB] font-semibold">{datasetA.columnCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] block font-sans">Size</span>
                  <span className="text-slate-300">{formatFileSize(datasetA.sizeBytes)}</span>
                </div>
              </div>

              {datasetA.syntheticSpec && (
                <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-[#00A8CB]/10 border border-[#00A8CB]/30 text-[#00A8CB]">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3 h-3 text-[#00A8CB]" />
                    <span>Synthetic Benchmark: {datasetA.syntheticSpec.totalRows.toLocaleString()} rows × {datasetA.syntheticSpec.totalColumns.toLocaleString()} cols</span>
                  </div>
                  <span className="font-mono text-[10px] bg-[#00A8CB]/20 px-1 rounded font-bold">
                    {((datasetA.syntheticSpec.totalRows * datasetA.syntheticSpec.totalColumns) / 1000000).toFixed(0)}M Cells
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputARef.current?.click()}
              className="border-2 border-dashed border-[#183A66] hover:border-[#00A8CB] rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group bg-[#07172C]/40"
            >
              <Upload className="w-7 h-7 text-[#94A3B8] group-hover:text-[#00A8CB] mb-2 transition-colors" />
              <span className="text-xs font-medium text-slate-300 group-hover:text-white">
                Drop CSV, Parquet, or Excel file here
              </span>
              <span className="text-[11px] text-[#94A3B8] mt-1">or click to browse local files</span>
            </div>
          )}

          <input
            ref={fileInputARef}
            type="file"
            accept=".csv,.tsv,.parquet,.xlsx,.xls,.xlsm"
            onChange={(e) => handleFileUpload(e, 'file_a')}
            className="hidden"
          />
        </div>

        {/* Dataset B Card */}
        <div className="bg-[#0C2340] rounded-xl border border-[#183A66] p-4 space-y-3 relative shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FAD702]/20 text-[#FAD702] font-mono text-xs font-bold border border-[#FAD702]/50">
                B
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Dataset B (Target / Comparison)</h3>
                <p className="text-[11px] text-[#94A3B8]">CSV, Parquet, or Excel format</p>
              </div>
            </div>

            {datasetB && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPreviewDataset(datasetB)}
                  className="p-1.5 rounded text-[#94A3B8] hover:text-white hover:bg-[#102C52] transition-colors"
                  title="Preview sample rows"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSetDatasetB(null)}
                  className="p-1.5 rounded text-[#94A3B8] hover:text-rose-400 hover:bg-[#102C52] transition-colors"
                  title="Remove dataset B"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {datasetB ? (
            <div className="bg-[#07172C] rounded-lg p-3 border border-[#183A66] space-y-2">
              <div className="flex items-center space-x-2">
                {getFormatIcon(datasetB.format)}
                <span className="font-medium text-xs text-white truncate max-w-[280px]" title={datasetB.name}>
                  {datasetB.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#102C52] text-[#FAD702] font-semibold border border-[#183A66]">
                  {datasetB.format}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1 border-t border-[#183A66]">
                <div>
                  <span className="text-[10px] text-[#94A3B8] block font-sans">Rows</span>
                  <span className="text-slate-200 font-semibold">{datasetB.rowCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] block font-sans">Columns</span>
                  <span className="text-[#FAD702] font-semibold">{datasetB.columnCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] block font-sans">Size</span>
                  <span className="text-slate-300">{formatFileSize(datasetB.sizeBytes)}</span>
                </div>
              </div>

              {datasetB.syntheticSpec && (
                <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-[#FAD702]/10 border border-[#FAD702]/30 text-[#FAD702]">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3 h-3 text-[#FAD702]" />
                    <span>Synthetic Benchmark: {datasetB.syntheticSpec.totalRows.toLocaleString()} rows × {datasetB.syntheticSpec.totalColumns.toLocaleString()} cols</span>
                  </div>
                  <span className="font-mono text-[10px] bg-[#FAD702]/20 px-1 rounded font-bold">
                    {((datasetB.syntheticSpec.totalRows * datasetB.syntheticSpec.totalColumns) / 1000000).toFixed(0)}M Cells
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputBRef.current?.click()}
              className="border-2 border-dashed border-[#183A66] hover:border-[#FAD702] rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group bg-[#07172C]/40"
            >
              <Upload className="w-7 h-7 text-[#94A3B8] group-hover:text-[#FAD702] mb-2 transition-colors" />
              <span className="text-xs font-medium text-slate-300 group-hover:text-white">
                Drop CSV, Parquet, or Excel file here
              </span>
              <span className="text-[11px] text-[#94A3B8] mt-1">or click to browse local files</span>
            </div>
          )}

          <input
            ref={fileInputBRef}
            type="file"
            accept=".csv,.tsv,.parquet,.xlsx,.xls,.xlsm"
            onChange={(e) => handleFileUpload(e, 'file_b')}
            className="hidden"
          />
        </div>
      </div>

      {/* Sample Data Preview Modal */}
      {previewDataset && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-5xl w-full text-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Table className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Sample Data Preview: {previewDataset.name} ({previewDataset.columnCount} columns)
                </h3>
              </div>
              <button
                onClick={() => setPreviewDataset(null)}
                className="px-3 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-x-auto overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-300 sticky top-0">
                    <th className="p-2 border border-slate-700 text-slate-500">#</th>
                    {previewDataset.columns.slice(0, 25).map((col) => (
                      <th key={col} className="p-2 border border-slate-700 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                    {previewDataset.columnCount > 25 && (
                      <th className="p-2 border border-slate-700 text-slate-500 italic">
                        +{previewDataset.columnCount - 25} more columns...
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewDataset.previewRows.slice(0, 15).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 border-b border-slate-800">
                      <td className="p-2 border border-slate-800 text-slate-500">{idx + 1}</td>
                      {previewDataset.columns.slice(0, 25).map((col) => (
                        <td key={col} className="p-2 border border-slate-800 whitespace-nowrap text-slate-300">
                          {row[col] !== undefined && row[col] !== null ? String(row[col]) : <span className="text-slate-600">NULL</span>}
                        </td>
                      ))}
                      {previewDataset.columnCount > 25 && (
                        <td className="p-2 border border-slate-800 text-slate-600 italic">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
