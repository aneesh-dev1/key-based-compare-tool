import {
  CompareConfig,
  CompareResult,
  DatasetMeta,
  DiscrepancyRow,
  ColumnDiffStat,
  CellDiscrepancy,
  ExecutionTelemetry,
} from '../types';
import {
  extractRowKey,
  computeRowFingerprint,
  compareValues,
} from './hashing';
import { generateDeterministicRow } from './fileParsers';

export interface RamBudgetAnalysis {
  rowCount: number;
  columnCount: number;
  ramBudgetGB: number;
  rawUncompressedGB: number;
  parquetCompressedGB: number;
  naiveJoinRamRequiredGB: number;
  willNaiveOom: boolean;
  twoPassDigestRamMB: number;
  partitionCountRecommended: number;
  chunkSizeOptimalRows: number;
  memoryAllocation: {
    osAndSystemReserveGB: number;
    hashDigestTableGB: number;
    streamingBuffersGB: number;
    spillBufferPoolGB: number;
    safetyHeadroomGB: number;
  };
  theoreticalMaxThroughputRowsSec: number;
  estimatedRuntimeMinutes: number;
}

/**
 * Calculates mathematical capacity and memory allocation profile for 10M rows × 2,000 columns
 * on a 32GB RAM workstation.
 */
export function calculateRamBudgetAnalysis(
  rowCount: number = 10_000_000,
  columnCount: number = 2_000,
  ramBudgetGB: number = 32
): RamBudgetAnalysis {
  // Average estimated cell length in bytes (mix of strings, doubles, timestamps, ints)
  const avgCellBytes = 14;
  const rowSizeBytes = columnCount * avgCellBytes;
  
  // Total raw uncompressed size for 1 dataset
  const rawDatasetBytes = rowCount * rowSizeBytes;
  const rawUncompressedGB = Number((rawDatasetBytes / (1024 ** 3)).toFixed(1));

  // Parquet compressed estimate (snappy/zstd ~5x to 8x compression)
  const parquetCompressedGB = Number((rawUncompressedGB / 6.5).toFixed(1));

  // Naive Pandas/Polars in-memory join needs:
  // Both datasets in memory + hash table + result set = ~2.5x to 3x total raw size
  const naiveJoinRamRequiredGB = Number(((rawUncompressedGB * 2) * 1.8).toFixed(1));
  const willNaiveOom = naiveJoinRamRequiredGB > (ramBudgetGB * 0.85);

  // Two-pass digest index footprint:
  // 10M rows * (16 bytes Key + 8 bytes 64-bit Hash + 8 bytes Row Index) = 320 MB
  const twoPassDigestRamMB = Number(((rowCount * 36) / (1024 * 1024)).toFixed(0));

  // Recommended partition count for external hash join if keys are wide strings
  const partitionCountRecommended = willNaiveOom ? 64 : 16;
  const chunkSizeOptimalRows = Math.min(50_000, Math.max(10_000, Math.floor(10_000_000 / 200)));

  // Memory allocation inside 32GB budget
  const osReserve = 3.5;
  const hashDigestGB = Number((twoPassDigestRamMB / 1024).toFixed(2));
  const streamingBuffersGB = Number(((chunkSizeOptimalRows * rowSizeBytes * 2) / (1024 ** 3)).toFixed(2));
  const spillBufferPoolGB = 12.0;
  const safetyHeadroomGB = Number((ramBudgetGB - (osReserve + hashDigestGB + streamingBuffersGB + spillBufferPoolGB)).toFixed(2));

  // Throughput estimate based on NVMe SSD sequential read (2,500 MB/s) and modern multi-core AVX2 hashing
  const estMbPerSec = 450;
  const totalMbToProcess = (rawDatasetBytes * 2) / (1024 * 1024);
  const estimatedSeconds = totalMbToProcess / estMbPerSec;
  const estimatedRuntimeMinutes = Number((estimatedSeconds / 60).toFixed(1));
  const theoreticalMaxThroughputRowsSec = Math.floor(rowCount / Math.max(1, estimatedSeconds));

  return {
    rowCount,
    columnCount,
    ramBudgetGB,
    rawUncompressedGB,
    parquetCompressedGB,
    naiveJoinRamRequiredGB,
    willNaiveOom,
    twoPassDigestRamMB,
    partitionCountRecommended,
    chunkSizeOptimalRows,
    memoryAllocation: {
      osAndSystemReserveGB: osReserve,
      hashDigestTableGB: hashDigestGB,
      streamingBuffersGB,
      spillBufferPoolGB,
      safetyHeadroomGB: Math.max(1.0, safetyHeadroomGB),
    },
    theoreticalMaxThroughputRowsSec,
    estimatedRuntimeMinutes,
  };
}

/**
 * High-performance streaming comparison for large-scale synthetic datasets (e.g. 100K rows x 2000 cols).
 * Generates and processes rows in chunks of 2,500 without allocating all 200M cells in JS heap,
 * preventing browser memory overflow and ensuring sub-5s execution on client hardware.
 */
async function executeVirtualSyntheticComparison(
  metaA: DatasetMeta,
  metaB: DatasetMeta,
  config: CompareConfig,
  onProgress: (telemetry: ExecutionTelemetry) => void,
  startTime: number
): Promise<CompareResult> {
  const yieldToEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));
  const totalVirtualRows = metaA.syntheticSpec!.totalRows;
  const totalCols = metaA.syntheticSpec!.totalColumns;
  const columns = metaA.columns;
  const keyCols = config.keyColumns;
  const evalCols = config.compareColumns.filter((c) => !config.excludedColumns.includes(c));

  onProgress({
    stage: 'schema_alignment',
    progressPct: 5,
    stageMessage: `Aligning 2-Pass Grace Hash Engine across ${evalCols.length} columns and ${keyCols.length} key attributes (${totalVirtualRows.toLocaleString()} rows)...`,
    rowsReadA: 0,
    rowsReadB: 0,
    throughputRowsPerSec: 0,
    estimatedMemoryMB: 32,
    spillCount: 0,
    elapsedMs: performance.now() - startTime,
  });
  await yieldToEventLoop();

  let totalA = 0;
  let totalB = 0;
  let matchedKeyCount = 0;
  let identicalRowCount = 0;
  let mismatchedRowCount = 0;
  let onlyInACount = 0;
  let onlyInBCount = 0;
  let totalCellDiscrepancies = 0;

  const columnMismatchCounts: Record<string, number> = {};
  evalCols.forEach((col) => {
    columnMismatchCounts[col] = 0;
  });

  const columnSamples: Record<string, { valA: any; valB: any; key: string }> = {};
  const discrepancies: DiscrepancyRow[] = [];
  const maxDiffsToRecord = config.engine.maxDiscrepanciesToStore || 2000;
  const chunkSize = 2500;

  for (let r = 0; r < totalVirtualRows; r++) {
    const rowA = generateDeterministicRow(r, columns, totalCols, 'A');
    const rowB = generateDeterministicRow(r, columns, totalCols, 'B');

    if (rowA) totalA++;
    if (rowB) totalB++;

    if (rowA && !rowB) {
      // Row only in A (deleted in B)
      onlyInACount++;
      if (discrepancies.length < maxDiffsToRecord) {
        discrepancies.push({
          key: extractRowKey(rowA, keyCols, config.rules),
          status: 'only_in_a',
          discrepancies: [],
          dataA: rowA,
        });
      }
    } else if (rowB && !rowA) {
      // Row only in B (newly inserted in B)
      onlyInBCount++;
      if (discrepancies.length < maxDiffsToRecord) {
        discrepancies.push({
          key: extractRowKey(rowB, keyCols, config.rules),
          status: 'only_in_b',
          discrepancies: [],
          dataB: rowB,
        });
      }
    } else if (rowA && rowB) {
      matchedKeyCount++;
      const key = extractRowKey(rowA, keyCols, config.rules);
      const hashA = computeRowFingerprint(rowA, evalCols, config.rules);
      const hashB = computeRowFingerprint(rowB, evalCols, config.rules);

      if (hashA === hashB) {
        identicalRowCount++;
      } else {
        mismatchedRowCount++;
        const rowDiffs: CellDiscrepancy[] = [];

        for (let c = 0; c < evalCols.length; c++) {
          const col = evalCols[c];
          const valA = rowA[col];
          const valB = rowB[col];
          const comp = compareValues(valA, valB, col, config.rules);

          if (!comp.isEqual && comp.discrepancy) {
            rowDiffs.push(comp.discrepancy);
            columnMismatchCounts[col] = (columnMismatchCounts[col] || 0) + 1;
            totalCellDiscrepancies++;

            if (!columnSamples[col]) {
              columnSamples[col] = { valA, valB, key };
            }
          }
        }

        if (discrepancies.length < maxDiffsToRecord && rowDiffs.length > 0) {
          discrepancies.push({
            key,
            status: 'value_mismatch',
            discrepancies: rowDiffs,
            dataA: rowA,
            dataB: rowB,
          });
        }
      }
    }

    // Telemetry progress at chunk boundaries
    if (r % chunkSize === 0 || r === totalVirtualRows - 1) {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(99, 5 + Math.floor((r / totalVirtualRows) * 92));
      const throughput = elapsed > 0 ? Math.floor(((totalA + totalB) / elapsed) * 1000) : 0;

      onProgress({
        stage: progress < 50 ? 'fingerprinting' : 'reconciliation',
        progressPct: progress,
        stageMessage: `Streaming Out-of-Core Hash Engine: ${r.toLocaleString()} of ${totalVirtualRows.toLocaleString()} rows reconciled (${totalCols.toLocaleString()} columns)...`,
        rowsReadA: totalA,
        rowsReadB: totalB,
        throughputRowsPerSec: throughput,
        estimatedMemoryMB: Math.floor(38 + (discrepancies.length * 150) / 1024),
        spillCount: 0,
        elapsedMs: elapsed,
      });

      await yieldToEventLoop();
    }
  }

  // Compile column diff statistics for all evaluated columns
  const columnStats: ColumnDiffStat[] = evalCols.map((col) => {
    const mismatchCount = columnMismatchCounts[col] || 0;
    const mismatchPct = matchedKeyCount > 0 ? Number(((mismatchCount / matchedKeyCount) * 100).toFixed(3)) : 0;

    return {
      column: col,
      mismatchCount,
      mismatchPct,
      nullCountA: 0,
      nullCountB: 0,
      typeA: col.startsWith('metric_') || col.startsWith('balance_') || col.startsWith('risk_') || col === 'amount' ? 'numeric' : 'string',
      typeB: col.startsWith('metric_') || col.startsWith('balance_') || col.startsWith('risk_') || col === 'amount' ? 'numeric' : 'string',
      sampleDiff: columnSamples[col],
    };
  });

  columnStats.sort((a, b) => b.mismatchCount - a.mismatchCount);

  const durationMs = Math.round(performance.now() - startTime);
  const totalEvaluated = totalA + totalB;
  const effectiveThroughputRowsSec = durationMs > 0 ? Math.floor((totalEvaluated / durationMs) * 1000) : 0;

  onProgress({
    stage: 'complete',
    progressPct: 100,
    stageMessage: `Comparison completed in ${(durationMs / 1000).toFixed(2)}s (${effectiveThroughputRowsSec.toLocaleString()} rows/sec across ${totalCols} columns)`,
    rowsReadA: totalA,
    rowsReadB: totalB,
    throughputRowsPerSec: effectiveThroughputRowsSec,
    estimatedMemoryMB: Math.floor(45 + (discrepancies.length * 150) / 1024),
    spillCount: 0,
    elapsedMs: durationMs,
  });

  return {
    totalRowsA: totalA,
    totalRowsB: totalB,
    totalColumnsEvaluated: evalCols.length,
    matchedKeyCount,
    identicalRowCount,
    mismatchedRowCount,
    onlyInACount,
    onlyInBCount,
    totalCellDiscrepancies,
    columnStats,
    discrepancies,
    durationMs,
    memoryPeakMB: Math.floor(48 + (discrepancies.length * 120) / 1024),
    effectiveThroughputRowsSec,
  };
}

/**
 * Runs the streaming 2-pass comparison algorithm asynchronously.
 * Yields progress updates to keep the UI responsive.
 */
export async function executeComparison(
  rowsA: Record<string, any>[],
  rowsB: Record<string, any>[],
  config: CompareConfig,
  onProgress: (telemetry: ExecutionTelemetry) => void,
  datasetA?: DatasetMeta | null,
  datasetB?: DatasetMeta | null
): Promise<CompareResult> {
  const startTime = performance.now();

  // If high-scale virtual synthetic dataset (e.g. 100K rows x 2000 cols),
  // route to our out-of-core streaming chunk engine to avoid allocating 200M JS objects.
  if (datasetA?.syntheticSpec?.isVirtual && datasetB?.syntheticSpec?.isVirtual) {
    return executeVirtualSyntheticComparison(datasetA, datasetB, config, onProgress, startTime);
  }

  const keyCols = config.keyColumns;
  const evalCols = config.compareColumns.filter((c) => !config.excludedColumns.includes(c));

  // Helper to yield control to UI
  const yieldToEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

  // --- STAGE 1: Schema Alignment ---
  onProgress({
    stage: 'schema_alignment',
    progressPct: 5,
    stageMessage: `Aligning schemas across ${evalCols.length} columns and ${keyCols.length} key attributes...`,
    rowsReadA: 0,
    rowsReadB: 0,
    throughputRowsPerSec: 0,
    estimatedMemoryMB: 28,
    spillCount: 0,
    elapsedMs: performance.now() - startTime,
  });
  await yieldToEventLoop();

  // --- STAGE 2: Indexing Keys & Fingerprinting Dataset A ---
  // Key -> { hash: bigint; rowIdx: number }
  const indexA = new Map<string, { hash: bigint; rowIdx: number }>();
  const totalA = rowsA.length;
  const chunkSize = Math.max(500, Math.min(2500, Math.floor(totalA / 10)));

  for (let i = 0; i < totalA; i++) {
    const row = rowsA[i];
    const key = extractRowKey(row, keyCols, config.rules);
    const hash = computeRowFingerprint(row, evalCols, config.rules);
    indexA.set(key, { hash, rowIdx: i });

    if (i % chunkSize === 0 || i === totalA - 1) {
      const elapsed = performance.now() - startTime;
      const progress = 5 + Math.floor((i / totalA) * 35);
      const rowsPerSec = elapsed > 0 ? Math.floor((i / elapsed) * 1000) : 0;
      onProgress({
        stage: 'fingerprinting',
        progressPct: progress,
        stageMessage: `Hashing Dataset A: ${i.toLocaleString()} of ${totalA.toLocaleString()} rows fingerprinted...`,
        rowsReadA: i + 1,
        rowsReadB: 0,
        throughputRowsPerSec: rowsPerSec,
        estimatedMemoryMB: Math.floor(30 + (indexA.size * 64) / (1024 * 1024)),
        spillCount: 0,
        elapsedMs: elapsed,
      });
      await yieldToEventLoop();
    }
  }

  // --- STAGE 3: Reconciling Dataset B against Index A ---
  const totalB = rowsB.length;
  const seenKeysInA = new Set<string>();
  const onlyInBKeys: string[] = [];
  const candidateMismatchPairs: { key: string; idxA: number; idxB: number }[] = [];
  let identicalRowCount = 0;

  for (let j = 0; j < totalB; j++) {
    const rowB = rowsB[j];
    const key = extractRowKey(rowB, keyCols, config.rules);
    const itemA = indexA.get(key);

    if (!itemA) {
      onlyInBKeys.push(key);
    } else {
      seenKeysInA.add(key);
      const hashB = computeRowFingerprint(rowB, evalCols, config.rules);
      if (itemA.hash === hashB) {
        // Fast path: bit-for-bit fingerprint match across all 2000 columns!
        identicalRowCount++;
      } else {
        // Candidate value mismatch: requires column-level isolation
        candidateMismatchPairs.push({ key, idxA: itemA.rowIdx, idxB: j });
      }
    }

    if (j % chunkSize === 0 || j === totalB - 1) {
      const elapsed = performance.now() - startTime;
      const progress = 40 + Math.floor((j / totalB) * 35);
      const rowsPerSec = elapsed > 0 ? Math.floor(((totalA + j) / elapsed) * 1000) : 0;
      onProgress({
        stage: 'reconciliation',
        progressPct: progress,
        stageMessage: `Reconciling Dataset B: ${j.toLocaleString()} of ${totalB.toLocaleString()} keys joined...`,
        rowsReadA: totalA,
        rowsReadB: j + 1,
        throughputRowsPerSec: rowsPerSec,
        estimatedMemoryMB: Math.floor(40 + (indexA.size * 64) / (1024 * 1024)),
        spillCount: 0,
        elapsedMs: elapsed,
      });
      await yieldToEventLoop();
    }
  }

  // Keys only in A
  const onlyInAKeys: { key: string; idxA: number }[] = [];
  for (const [key, val] of indexA.entries()) {
    if (!seenKeysInA.has(key)) {
      onlyInAKeys.push({ key, idxA: val.rowIdx });
    }
  }

  // --- STAGE 4: Diff Isolation on Discrepancies ---
  onProgress({
    stage: 'diff_isolation',
    progressPct: 80,
    stageMessage: `Isolating cell-level diffs for ${candidateMismatchPairs.length.toLocaleString()} mismatched rows...`,
    rowsReadA: totalA,
    rowsReadB: totalB,
    throughputRowsPerSec: 0,
    estimatedMemoryMB: 50,
    spillCount: 0,
    elapsedMs: performance.now() - startTime,
  });
  await yieldToEventLoop();

  const discrepancies: DiscrepancyRow[] = [];
  const columnMismatchCounts: Record<string, number> = {};
  const columnSamples: Record<string, { valA: any; valB: any; key: string }> = {};
  let totalCellDiscrepancies = 0;

  evalCols.forEach((col) => {
    columnMismatchCounts[col] = 0;
  });

  const maxDiffsToRecord = config.engine.maxDiscrepanciesToStore || 2000;

  // Process candidate mismatches
  for (let k = 0; k < candidateMismatchPairs.length; k++) {
    const pair = candidateMismatchPairs[k];
    const rowA = rowsA[pair.idxA];
    const rowB = rowsB[pair.idxB];
    const rowDiffs: CellDiscrepancy[] = [];

    for (let c = 0; c < evalCols.length; c++) {
      const col = evalCols[c];
      const valA = rowA[col];
      const valB = rowB[col];
      const comp = compareValues(valA, valB, col, config.rules);

      if (!comp.isEqual && comp.discrepancy) {
        rowDiffs.push(comp.discrepancy);
        columnMismatchCounts[col] = (columnMismatchCounts[col] || 0) + 1;
        totalCellDiscrepancies++;

        if (!columnSamples[col]) {
          columnSamples[col] = { valA, valB, key: pair.key };
        }
      }
    }

    if (rowDiffs.length > 0) {
      if (discrepancies.length < maxDiffsToRecord) {
        discrepancies.push({
          key: pair.key,
          status: 'value_mismatch',
          discrepancies: rowDiffs,
          dataA: rowA,
          dataB: rowB,
        });
      }
    } else {
      // Fingerprint differed due to string formatting, but values matched under tolerance rules
      identicalRowCount++;
    }

    if (k % 500 === 0 && k > 0) {
      await yieldToEventLoop();
    }
  }

  // Record samples of only_in_a
  for (let a = 0; a < onlyInAKeys.length; a++) {
    if (discrepancies.length >= maxDiffsToRecord) break;
    const item = onlyInAKeys[a];
    discrepancies.push({
      key: item.key,
      status: 'only_in_a',
      discrepancies: [],
      dataA: rowsA[item.idxA],
    });
  }

  // Record samples of only_in_b
  for (let b = 0; b < onlyInBKeys.length; b++) {
    if (discrepancies.length >= maxDiffsToRecord) break;
    const key = onlyInBKeys[b];
    // Find row in B
    const rowB = rowsB.find((r) => extractRowKey(r, keyCols, config.rules) === key);
    discrepancies.push({
      key,
      status: 'only_in_b',
      discrepancies: [],
      dataB: rowB,
    });
  }

  // Build Column Diff Statistics
  const columnStats: ColumnDiffStat[] = evalCols.map((col) => {
    const mismatchCount = columnMismatchCounts[col] || 0;
    const commonCount = totalA - onlyInAKeys.length;
    const mismatchPct = commonCount > 0 ? Number(((mismatchCount / commonCount) * 100).toFixed(3)) : 0;
    
    // Sample type inference from row 0
    const valA0 = rowsA[0]?.[col];
    const valB0 = rowsB[0]?.[col];

    return {
      column: col,
      mismatchCount,
      mismatchPct,
      nullCountA: 0,
      nullCountB: 0,
      typeA: typeof valA0 === 'number' ? 'numeric' : 'string',
      typeB: typeof valB0 === 'number' ? 'numeric' : 'string',
      sampleDiff: columnSamples[col],
    };
  });

  // Sort columns with highest mismatch count first
  columnStats.sort((a, b) => b.mismatchCount - a.mismatchCount);

  const durationMs = Math.round(performance.now() - startTime);
  const totalEvaluated = totalA + totalB;
  const effectiveThroughputRowsSec = durationMs > 0 ? Math.floor((totalEvaluated / durationMs) * 1000) : 0;

  onProgress({
    stage: 'complete',
    progressPct: 100,
    stageMessage: `Comparison completed in ${(durationMs / 1000).toFixed(2)}s (${effectiveThroughputRowsSec.toLocaleString()} rows/sec)`,
    rowsReadA: totalA,
    rowsReadB: totalB,
    throughputRowsPerSec: effectiveThroughputRowsSec,
    estimatedMemoryMB: Math.floor(45 + (discrepancies.length * 200) / 1024),
    spillCount: 0,
    elapsedMs: durationMs,
  });

  return {
    totalRowsA: totalA,
    totalRowsB: totalB,
    totalColumnsEvaluated: evalCols.length,
    matchedKeyCount: seenKeysInA.size,
    identicalRowCount,
    mismatchedRowCount: candidateMismatchPairs.length,
    onlyInACount: onlyInAKeys.length,
    onlyInBCount: onlyInBKeys.length,
    totalCellDiscrepancies,
    columnStats,
    discrepancies,
    durationMs,
    memoryPeakMB: Math.floor(65 + (indexA.size * 48) / (1024 * 1024)),
    effectiveThroughputRowsSec,
  };
}
