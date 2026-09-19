import React, { useState, useMemo } from 'react';
import {
  Key,
  Sliders,
  Cpu,
  CheckSquare,
  Square,
  Search,
  Settings,
  Play,
  Filter,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { CompareConfig, DatasetMeta } from '../types';

interface ConfigurationPanelProps {
  datasetA: DatasetMeta | null;
  datasetB: DatasetMeta | null;
  config: CompareConfig;
  onChangeConfig: (newConfig: CompareConfig) => void;
  onExecute: () => void;
  isExecuting: boolean;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  datasetA,
  datasetB,
  config,
  onChangeConfig,
  onExecute,
  isExecuting,
}) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'columns' | 'rules' | 'ram'>('keys');
  const [colSearchQuery, setColSearchQuery] = useState('');

  // Identify common columns between A and B
  const commonColumns = useMemo(() => {
    if (!datasetA || !datasetB) return [];
    const setB = new Set(datasetB.columns);
    return datasetA.columns.filter((col) => setB.has(col));
  }, [datasetA, datasetB]);

  const filteredColumns = useMemo(() => {
    if (!colSearchQuery) return commonColumns;
    const q = colSearchQuery.toLowerCase();
    return commonColumns.filter((col) => col.toLowerCase().includes(q));
  }, [commonColumns, colSearchQuery]);

  const toggleKeyColumn = (col: string) => {
    const isKey = config.keyColumns.includes(col);
    let newKeys: string[];
    if (isKey) {
      newKeys = config.keyColumns.filter((k) => k !== col);
    } else {
      newKeys = [...config.keyColumns, col];
    }
    onChangeConfig({
      ...config,
      keyColumns: newKeys,
    });
  };

  const toggleExcludeColumn = (col: string) => {
    const isExcluded = config.excludedColumns.includes(col);
    let newExcluded: string[];
    if (isExcluded) {
      newExcluded = config.excludedColumns.filter((c) => c !== col);
    } else {
      newExcluded = [...config.excludedColumns, col];
    }
    onChangeConfig({
      ...config,
      excludedColumns: newExcluded,
    });
  };

  const selectAllColumns = () => {
    onChangeConfig({
      ...config,
      excludedColumns: [],
    });
  };

  const excludeTimestamps = () => {
    const timeCols = commonColumns.filter(
      (c) =>
        c.toLowerCase().includes('time') ||
        c.toLowerCase().includes('date') ||
        c.toLowerCase().includes('created') ||
        c.toLowerCase().includes('updated') ||
        c.toLowerCase().includes('batch')
    );
    onChangeConfig({
      ...config,
      excludedColumns: Array.from(new Set([...config.excludedColumns, ...timeCols])),
    });
  };

  const hasValidSetup = datasetA && datasetB && config.keyColumns.length > 0;

  return (
    <div className="bg-[#0C2340] rounded-xl border border-[#183A66] shadow-md overflow-hidden">
      {/* Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#183A66] px-4 pt-2 bg-[#0A1D36] gap-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 cursor-pointer ${
              activeTab === 'keys'
                ? 'border-[#00A8CB] text-[#00A8CB] bg-[#07172C] font-bold'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Key Selection ({config.keyColumns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('columns')}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 cursor-pointer ${
              activeTab === 'columns'
                ? 'border-[#00A8CB] text-[#00A8CB] bg-[#07172C] font-bold'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>
              Column Matrix ({commonColumns.length - config.excludedColumns.length}/{commonColumns.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 cursor-pointer ${
              activeTab === 'rules'
                ? 'border-[#00A8CB] text-[#00A8CB] bg-[#07172C] font-bold'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tolerances & Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('ram')}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 cursor-pointer ${
              activeTab === 'ram'
                ? 'border-[#00A8CB] text-[#00A8CB] bg-[#07172C] font-bold'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>32GB Engine Params</span>
          </button>
        </div>

        {/* Big Execution CTA */}
        <div className="pb-2">
          <button
            disabled={!hasValidSetup || isExecuting}
            onClick={onExecute}
            className="px-5 py-2 rounded-lg bg-[#00A8CB] hover:bg-[#0091AF] disabled:opacity-40 disabled:hover:bg-[#00A8CB] text-[#002D62] font-bold text-xs transition-all flex items-center space-x-2 shadow-lg shadow-[#00A8CB]/20 cursor-pointer disabled:cursor-not-allowed"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? 'animate-pulse' : ''}`} />
            <span>{isExecuting ? 'Comparing Workload...' : 'Execute Key-Based Comparison'}</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-4">
        {/* TAB 1: KEYS */}
        {activeTab === 'keys' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">Select Primary / Composite Key(s)</h4>
                <p className="text-[11px] text-[#94A3B8]">
                  Rows will be joined and matched on these unique or composite attributes.
                </p>
              </div>
              {config.keyColumns.length === 0 && (
                <div className="flex items-center space-x-1 text-[#FAD702] text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>At least one key is required to reconcile rows</span>
                </div>
              )}
            </div>

            {commonColumns.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                {commonColumns.map((col) => {
                  const isSelected = config.keyColumns.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => toggleKeyColumn(col)}
                      className={`p-2 rounded-lg border text-left text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#002D62] border-[#00A8CB] text-[#00A8CB] font-bold shadow-sm'
                          : 'bg-[#07172C] border-[#183A66] text-slate-300 hover:border-[#00A8CB]/50'
                      }`}
                    >
                      <span className="truncate pr-1" title={col}>
                        {col}
                      </span>
                      {isSelected ? (
                        <CheckCircle className="w-3.5 h-3.5 text-[#00A8CB] shrink-0" />
                      ) : (
                        <Key className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                Upload or generate datasets above to select key attributes.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COLUMNS MATRIX */}
        {activeTab === 'columns' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-white">
                  Column Evaluation Matrix ({commonColumns.length - config.excludedColumns.length} evaluated)
                </h4>
                <p className="text-[11px] text-[#94A3B8]">
                  Exclude transient columns like ETL timestamps or batch run IDs from diffing.
                </p>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3 h-3 text-[#94A3B8] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search 2,000 columns..."
                    value={colSearchQuery}
                    onChange={(e) => setColSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 bg-[#07172C] border border-[#183A66] rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00A8CB]"
                  />
                </div>
                <button
                  onClick={selectAllColumns}
                  className="px-2 py-1 rounded bg-[#07172C] hover:bg-[#102C52] text-slate-300 text-[11px] border border-[#183A66] cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={excludeTimestamps}
                  className="px-2 py-1 rounded bg-[#07172C] hover:bg-[#102C52] text-slate-300 text-[11px] border border-[#183A66] cursor-pointer"
                >
                  Skip Timestamps
                </button>
              </div>
            </div>

            {filteredColumns.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                {filteredColumns.map((col) => {
                  const isExcluded = config.excludedColumns.includes(col);
                  const isKey = config.keyColumns.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => !isKey && toggleExcludeColumn(col)}
                      disabled={isKey}
                      className={`p-2 rounded-lg border text-left text-xs font-mono transition-all flex items-center justify-between ${
                        isKey
                          ? 'bg-[#07172C]/40 border-[#183A66] text-slate-500 cursor-not-allowed'
                          : isExcluded
                          ? 'bg-[#07172C] border-[#183A66]/60 text-slate-600 line-through'
                          : 'bg-[#07172C] border-[#183A66] text-slate-200 hover:border-[#00A8CB]/50 cursor-pointer'
                      }`}
                    >
                      <span className="truncate pr-1" title={col}>
                        {col}
                      </span>
                      {isKey ? (
                        <span className="text-[10px] text-[#00A8CB] font-sans font-bold">KEY</span>
                      ) : isExcluded ? (
                        <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      ) : (
                        <CheckSquare className="w-3.5 h-3.5 text-[#00A8CB] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No matching columns found.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RULES & TOLERANCES */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Numeric Precision */}
            <div className="space-y-3 bg-[#07172C] p-3 rounded-lg border border-[#183A66]">
              <h5 className="font-semibold text-white uppercase tracking-wider text-[11px]">
                Floating Point & Numeric Tolerances
              </h5>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Absolute Tolerance (±ε):</span>
                  <span className="font-mono text-[#00A8CB] font-bold">
                    {config.rules.numericToleranceAbs}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={config.rules.numericToleranceAbs}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      rules: { ...config.rules, numericToleranceAbs: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-2 py-1 bg-[#0A1D36] border border-[#183A66] rounded text-xs text-white focus:outline-none focus:border-[#00A8CB]"
                />
                <p className="text-[10px] text-[#94A3B8] mt-1">
                  Differences ≤ this threshold (e.g. rounding noise) are treated as identical.
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Relative Tolerance (%):</span>
                  <span className="font-mono text-[#00A8CB] font-bold">
                    {config.rules.numericToleranceRelPct}%
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.rules.numericToleranceRelPct}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      rules: { ...config.rules, numericToleranceRelPct: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-2 py-1 bg-[#0A1D36] border border-[#183A66] rounded text-xs text-white focus:outline-none focus:border-[#00A8CB]"
                />
                <p className="text-[10px] text-[#94A3B8] mt-1">
                  Permissible percentage deviation for scaled quantities.
                </p>
              </div>
            </div>

            {/* String & Null Rules */}
            <div className="space-y-3 bg-[#07172C] p-3 rounded-lg border border-[#183A66]">
              <h5 className="font-semibold text-white uppercase tracking-wider text-[11px]">
                String Normalization & Null Equivalence
              </h5>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={config.rules.trimWhitespace}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        rules: { ...config.rules, trimWhitespace: e.target.checked },
                      })
                    }
                    className="rounded bg-[#0A1D36] border-[#183A66] text-[#00A8CB] focus:ring-0"
                  />
                  <span>Trim leading & trailing whitespace</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={config.rules.ignoreCase}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        rules: { ...config.rules, ignoreCase: e.target.checked },
                      })
                    }
                    className="rounded bg-[#0A1D36] border-[#183A66] text-[#00A8CB] focus:ring-0"
                  />
                  <span>Case-insensitive comparison (A == a)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={config.rules.nullEqualsEmptyString}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        rules: { ...config.rules, nullEqualsEmptyString: e.target.checked },
                      })
                    }
                    className="rounded bg-[#0A1D36] border-[#183A66] text-[#00A8CB] focus:ring-0"
                  />
                  <span>Treat empty string (&quot;&quot;) as NULL</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={config.rules.treatNaNAsNull}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        rules: { ...config.rules, treatNaNAsNull: e.target.checked },
                      })
                    }
                    className="rounded bg-[#0A1D36] border-[#183A66] text-[#00A8CB] focus:ring-0"
                  />
                  <span>Treat NaN as NULL</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={config.rules.ignoreLeadingZeros}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        rules: { ...config.rules, ignoreLeadingZeros: e.target.checked },
                      })
                    }
                    className="rounded bg-[#0A1D36] border-[#183A66] text-[#00A8CB] focus:ring-0"
                  />
                  <span>Ignore leading zeros in numeric codes (&quot;0012&quot; == &quot;12&quot;)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 32GB RAM ENGINE */}
        {activeTab === 'ram' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5 p-3 rounded-lg bg-[#07172C] border border-[#183A66]">
              <span className="text-[#94A3B8] block">Workstation RAM Budget</span>
              <div className="font-mono text-sm font-bold text-[#00A8CB]">
                {config.engine.ramBudgetGB} GB
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Hard ceiling for hash tables, streaming buffers, and join indexes.
              </p>
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-[#07172C] border border-[#183A66]">
              <span className="text-[#94A3B8] block">Streaming Chunk Batch Size</span>
              <div className="font-mono text-sm font-bold text-white">
                {config.engine.chunkSizeRows.toLocaleString()} rows
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Optimized for L3 CPU cache locality and zero memory accumulation.
              </p>
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-[#07172C] border border-[#183A66]">
              <span className="text-[#94A3B8] block">Row Fingerprint Hash Mode</span>
              <div className="font-mono text-sm font-bold text-[#FAD702] uppercase">
                {config.engine.hashAlgorithm} (64-Bit)
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Uniform dispersion: collision probability &lt; 1 in 1.8 × 10¹⁹ across 10M rows.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
