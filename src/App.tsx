/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DatasetInput } from './components/DatasetInput';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { ExecutionProgressBar } from './components/ExecutionProgressBar';
import { DiffSummaryCards } from './components/DiffSummaryCards';
import { ColumnHeatmap } from './components/ColumnHeatmap';
import { DiffTableViewer } from './components/DiffTableViewer';
import { ProductionCodeExport } from './components/ProductionCodeExport';
import { MemoryArchitectureModal } from './components/MemoryArchitectureModal';
import {
  DatasetMeta,
  CompareConfig,
  ExecutionTelemetry,
  CompareResult,
} from './types';
import { generateSyntheticPair } from './utils/fileParsers';
import { executeComparison } from './utils/engineSimulator';

export default function App() {
  const [datasetA, setDatasetA] = useState<DatasetMeta | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetMeta | null>(null);
  const [rawRowsA, setRawRowsA] = useState<Record<string, any>[]>([]);
  const [rawRowsB, setRawRowsB] = useState<Record<string, any>[]>([]);

  const [config, setConfig] = useState<CompareConfig>({
    keyColumns: ['account_id', 'transaction_id'],
    compareColumns: [],
    excludedColumns: [],
    rules: {
      numericToleranceAbs: 0.0001,
      numericToleranceRelPct: 0.01,
      ignoreCase: false,
      trimWhitespace: true,
      nullEqualsEmptyString: true,
      treatNaNAsNull: true,
      ignoreLeadingZeros: false,
      dateTimeIgnoreSeconds: true,
    },
    engine: {
      ramBudgetGB: 32,
      chunkSizeRows: 50000,
      workerConcurrency: 8,
      spillThresholdPct: 75,
      hashAlgorithm: 'xxhash64',
      strategy: 'two_pass_digest',
      maxDiscrepanciesToStore: 2000,
    },
  });

  const [telemetry, setTelemetry] = useState<ExecutionTelemetry>({
    stage: 'idle',
    progressPct: 0,
    stageMessage: 'Ready to compare',
    rowsReadA: 0,
    rowsReadB: 0,
    throughputRowsPerSec: 0,
    estimatedMemoryMB: 24,
    spillCount: 0,
    elapsedMs: 0,
  });

  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Initialize with a realistic starter paired dataset on load
  useEffect(() => {
    handleLoadSyntheticBenchmark(2500, 50);
  }, []);

  // Update compareColumns whenever datasets change
  useEffect(() => {
    if (datasetA && datasetB) {
      const setB = new Set(datasetB.columns);
      const common = datasetA.columns.filter((c) => setB.has(c));
      setConfig((prev) => {
        // Ensure keys exist in common
        const validKeys = prev.keyColumns.filter((k) => common.includes(k));
        const newKeys = validKeys.length > 0 ? validKeys : common.slice(0, 1);
        return {
          ...prev,
          keyColumns: newKeys,
          compareColumns: common,
        };
      });
    }
  }, [datasetA, datasetB]);

  const handleLoadSyntheticBenchmark = (rows: number, cols: number) => {
    setCompareResult(null);
    setSelectedColumnFilter(null);
    const { metaA, metaB, allRowsA, allRowsB } = generateSyntheticPair(rows, cols);
    setDatasetA(metaA);
    setDatasetB(metaB);
    setRawRowsA(allRowsA);
    setRawRowsB(allRowsB);
  };

  const handleSetDatasetA = (meta: DatasetMeta | null, rawRows?: Record<string, any>[]) => {
    setDatasetA(meta);
    setRawRowsA(rawRows || meta?.previewRows || []);
    setCompareResult(null);
  };

  const handleSetDatasetB = (meta: DatasetMeta | null, rawRows?: Record<string, any>[]) => {
    setDatasetB(meta);
    setRawRowsB(rawRows || meta?.previewRows || []);
    setCompareResult(null);
  };

  const handleRunComparison = useCallback(async () => {
    if (!datasetA || !datasetB || config.keyColumns.length === 0) return;
    setIsExecuting(true);
    setSelectedColumnFilter(null);

    try {
      const rowsA = rawRowsA.length > 0 ? rawRowsA : datasetA.previewRows;
      const rowsB = rawRowsB.length > 0 ? rawRowsB : datasetB.previewRows;

      const result = await executeComparison(
        rowsA,
        rowsB,
        config,
        (tel) => {
          setTelemetry(tel);
        },
        datasetA,
        datasetB
      );

      setCompareResult(result);
    } catch (err: any) {
      setTelemetry((prev) => ({
        ...prev,
        stage: 'error',
        stageMessage: `Comparison failed: ${err.message || String(err)}`,
      }));
    } finally {
      setIsExecuting(false);
    }
  }, [datasetA, datasetB, rawRowsA, rawRowsB, config]);

  return (
    <div className="min-h-screen bg-[#07172C] text-slate-100 flex flex-col font-sans selection:bg-[#00A8CB] selection:text-[#002D62]">
      {/* Top Header */}
      <Header
        onOpenArchitectureModal={() => setIsArchitectureModalOpen(true)}
        datasetACount={datasetA?.rowCount}
        datasetBCount={datasetB?.rowCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dataset Ingestion & Synthetic Benchmark Generator */}
        <DatasetInput
          datasetA={datasetA}
          datasetB={datasetB}
          onSetDatasetA={handleSetDatasetA}
          onSetDatasetB={handleSetDatasetB}
          onLoadSyntheticBenchmark={handleLoadSyntheticBenchmark}
          isLoading={isExecuting}
        />

        {/* Configuration Panel (Keys, Columns, Tolerances, 32GB RAM Engine) */}
        <ConfigurationPanel
          datasetA={datasetA}
          datasetB={datasetB}
          config={config}
          onChangeConfig={setConfig}
          onExecute={handleRunComparison}
          isExecuting={isExecuting}
        />

        {/* Real-time Progress & Telemetry */}
        <ExecutionProgressBar telemetry={telemetry} />

        {/* Results Section */}
        {compareResult && (
          <div className="space-y-6 animate-fade-in">
            {/* Executive Reconciliation Metrics */}
            <DiffSummaryCards result={compareResult} />

            {/* Column Discrepancy Heatmap / Ranking */}
            <ColumnHeatmap
              stats={compareResult.columnStats}
              selectedColumnFilter={selectedColumnFilter}
              onSelectColumnFilter={setSelectedColumnFilter}
            />

            {/* Detailed Discrepancy Table Viewer with Filter Pills, Search, and Exports */}
            <DiffTableViewer
              discrepancies={compareResult.discrepancies}
              selectedColumnFilter={selectedColumnFilter}
              onClearColumnFilter={() => setSelectedColumnFilter(null)}
            />
          </div>
        )}

        {/* 10M x 2000 Cols Production Deployment Code Generator (DuckDB, Polars, PyArrow) */}
        <ProductionCodeExport
          config={config}
          fileAName={datasetA?.name || 'source_dataset.parquet'}
          fileBName={datasetB?.name || 'target_dataset.parquet'}
        />
      </main>

      {/* 32 GB RAM Capacity Model & Architecture Modal */}
      <MemoryArchitectureModal
        isOpen={isArchitectureModalOpen}
        onClose={() => setIsArchitectureModalOpen(false)}
      />

      {/* Subtle Footer */}
      <footer className="border-t border-[#183A66] bg-[#07172C] py-4 px-6 text-center text-xs text-[#94A3B8] font-mono">
        TransUnion Key-Based Big Data Comparator • Optimized for 10M Rows × 2,000 Cols on 32GB RAM Workstations • 2-Pass Grace Hash Engine
      </footer>
    </div>
  );
}
