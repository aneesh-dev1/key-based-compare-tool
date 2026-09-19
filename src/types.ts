export type FileFormat = 'csv' | 'parquet' | 'xlsx' | 'synthetic';

export interface SyntheticDatasetSpec {
  totalRows: number;
  totalColumns: number;
  prefix?: string;
  isVirtual?: boolean;
}

export interface DatasetMeta {
  id: 'file_a' | 'file_b';
  name: string;
  format: FileFormat;
  sizeBytes: number;
  rowCount: number;
  columnCount: number;
  columns: string[];
  previewRows: Record<string, any>[];
  rawFile?: File;
  syntheticSpec?: SyntheticDatasetSpec;
}

export type DiffRowStatus = 'identical' | 'value_mismatch' | 'only_in_a' | 'only_in_b';

export interface CellDiscrepancy {
  column: string;
  valA: any;
  valB: any;
  isNumeric: boolean;
  delta?: number;
  pctDelta?: number;
  reason: string;
}

export interface DiscrepancyRow {
  key: string;
  status: DiffRowStatus;
  discrepancies: CellDiscrepancy[];
  dataA?: Record<string, any>;
  dataB?: Record<string, any>;
}

export interface ColumnDiffStat {
  column: string;
  mismatchCount: number;
  mismatchPct: number;
  nullCountA: number;
  nullCountB: number;
  typeA: string;
  typeB: string;
  sampleDiff?: {
    valA: any;
    valB: any;
    key: string;
  };
}

export interface ComparisonRules {
  numericToleranceAbs: number;
  numericToleranceRelPct: number; // e.g., 0.01%
  ignoreCase: boolean;
  trimWhitespace: boolean;
  nullEqualsEmptyString: boolean;
  treatNaNAsNull: boolean;
  ignoreLeadingZeros: boolean;
  dateTimeIgnoreSeconds: boolean;
}

export type HashAlgorithm = 'xxhash64' | 'fnv1a' | 'siphash';
export type EngineStrategy = 'two_pass_digest' | 'partition_spill' | 'streaming_merge';

export interface MemoryEngineConfig {
  ramBudgetGB: number;
  chunkSizeRows: number;
  workerConcurrency: number;
  spillThresholdPct: number;
  hashAlgorithm: HashAlgorithm;
  strategy: EngineStrategy;
  maxDiscrepanciesToStore: number;
}

export interface CompareConfig {
  keyColumns: string[];
  compareColumns: string[];
  excludedColumns: string[];
  rules: ComparisonRules;
  engine: MemoryEngineConfig;
}

export type ExecutionStage =
  | 'idle'
  | 'schema_alignment'
  | 'indexing_keys'
  | 'fingerprinting'
  | 'reconciliation'
  | 'diff_isolation'
  | 'complete'
  | 'error';

export interface ExecutionTelemetry {
  stage: ExecutionStage;
  progressPct: number;
  stageMessage: string;
  rowsReadA: number;
  rowsReadB: number;
  throughputRowsPerSec: number;
  estimatedMemoryMB: number;
  spillCount: number;
  elapsedMs: number;
  errorMessage?: string;
}

export interface CompareResult {
  totalRowsA: number;
  totalRowsB: number;
  totalColumnsEvaluated: number;
  matchedKeyCount: number;
  identicalRowCount: number;
  mismatchedRowCount: number;
  onlyInACount: number;
  onlyInBCount: number;
  totalCellDiscrepancies: number;
  columnStats: ColumnDiffStat[];
  discrepancies: DiscrepancyRow[];
  durationMs: number;
  memoryPeakMB: number;
  effectiveThroughputRowsSec: number;
}
