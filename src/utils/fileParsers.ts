import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parquetRead } from 'hyparquet';
import { DatasetMeta, FileFormat } from '../types';

/**
 * Parses a CSV file or string and extracts metadata and preview rows.
 */
export async function parseCsvFile(file: File): Promise<DatasetMeta> {
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    let headers: string[] = [];
    const previewRows: Record<string, any>[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 512, // 512KB chunks
      chunk: (results, parser) => {
        if (headers.length === 0 && results.meta.fields) {
          headers = results.meta.fields;
        }
        for (let i = 0; i < results.data.length; i++) {
          rowCount++;
          if (previewRows.length < 50) {
            previewRows.push(results.data[i] as Record<string, any>);
          }
        }
        // If file is gigantic, we continue streaming or count rows
      },
      complete: () => {
        resolve({
          id: 'file_a',
          name: file.name,
          format: 'csv',
          sizeBytes: file.size,
          rowCount,
          columnCount: headers.length,
          columns: headers,
          previewRows,
          rawFile: file,
        });
      },
      error: (err) => {
        reject(new Error(`Failed to parse CSV: ${err.message}`));
      },
    });
  });
}

/**
 * Parses an Excel file (.xlsx, .xls) and extracts metadata and rows.
 */
export async function parseExcelFile(file: File): Promise<DatasetMeta> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file has no sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

  if (jsonData.length === 0) {
    throw new Error('Excel sheet is empty.');
  }

  const headers = (jsonData[0] as any[]).map((h, i) => (h !== undefined && h !== null ? String(h) : `col_${i + 1}`));
  const rows: Record<string, any>[] = [];
  const previewRows: Record<string, any>[] = [];

  for (let r = 1; r < jsonData.length; r++) {
    const rawRow = jsonData[r] as any[];
    if (!rawRow || rawRow.length === 0) continue;
    const rowObj: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = rawRow[c] !== undefined ? rawRow[c] : null;
    }
    rows.push(rowObj);
    if (previewRows.length < 50) {
      previewRows.push(rowObj);
    }
  }

  return {
    id: 'file_a',
    name: file.name,
    format: 'xlsx',
    sizeBytes: file.size,
    rowCount: rows.length,
    columnCount: headers.length,
    columns: headers,
    previewRows,
    rawFile: file,
  };
}

/**
 * Parses a Parquet file using hyparquet.
 */
export async function parseParquetFile(file: File): Promise<DatasetMeta> {
  const arrayBuffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    try {
      parquetRead({
        file: arrayBuffer,
        onComplete: (rows: any[]) => {
          if (!rows || rows.length === 0) {
            resolve({
              id: 'file_a',
              name: file.name,
              format: 'parquet',
              sizeBytes: file.size,
              rowCount: 0,
              columnCount: 0,
              columns: [],
              previewRows: [],
              rawFile: file,
            });
            return;
          }

          // In hyparquet, rows is array of arrays or objects depending on schema
          let headers: string[] = [];
          let preview: Record<string, any>[] = [];

          if (Array.isArray(rows[0])) {
            headers = rows[0].map((_, i) => `col_${i + 1}`);
            preview = rows.slice(0, 50).map((rowArr) => {
              const obj: Record<string, any> = {};
              headers.forEach((h, idx) => {
                obj[h] = rowArr[idx];
              });
              return obj;
            });
          } else if (typeof rows[0] === 'object' && rows[0] !== null) {
            headers = Object.keys(rows[0]);
            preview = rows.slice(0, 50);
          }

          resolve({
            id: 'file_a',
            name: file.name,
            format: 'parquet',
            sizeBytes: file.size,
            rowCount: rows.length,
            columnCount: headers.length,
            columns: headers,
            previewRows: preview,
            rawFile: file,
          });
        },
      });
    } catch (err: any) {
      reject(new Error(`Failed to parse Parquet file: ${err.message || String(err)}`));
    }
  });
}

/**
 * Universal file loader detecting format by extension.
 */
export async function loadDatasetFile(file: File, sideId: 'file_a' | 'file_b'): Promise<DatasetMeta> {
  const lowerName = file.name.toLowerCase();
  let meta: DatasetMeta;

  if (lowerName.endsWith('.parquet')) {
    meta = await parseParquetFile(file);
  } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.xlsm')) {
    meta = await parseExcelFile(file);
  } else {
    // Default to CSV / TSV / plain text
    meta = await parseCsvFile(file);
  }

  meta.id = sideId;
  return meta;
}

/**
 * Generates the full schema list of column names up to totalColumns (e.g. 2,000 columns).
 */
export function generateColumnsList(totalColumns: number = 2000): string[] {
  const columns: string[] = ['account_id', 'transaction_id', 'currency', 'amount', 'status'];

  for (let i = 5; i < totalColumns; i++) {
    if (i % 6 === 0) columns.push(`metric_score_${i}`);
    else if (i % 6 === 1) columns.push(`dimension_cat_${i}`);
    else if (i % 6 === 2) columns.push(`balance_usd_${i}`);
    else if (i % 6 === 3) columns.push(`risk_factor_${i}`);
    else if (i % 6 === 4) columns.push(`timestamp_utc_${i}`);
    else columns.push(`attr_code_${i}`);
  }

  return columns;
}

const SYNTHETIC_STATUSES = ['SETTLED', 'PENDING', 'CANCELLED', 'FLAGGED'];
const SYNTHETIC_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'CHF'];

/**
 * Deterministically generates a single row for index r (0 <= r < totalRows).
 * If variant is 'A' and row is deleted in B, returns row.
 * If variant is 'B' and row is only in A, returns null.
 * If variant is 'A' and row is only in B, returns null.
 */
export function generateDeterministicRow(
  r: number,
  columns: string[],
  totalColumns: number,
  variant: 'A' | 'B'
): Record<string, any> | null {
  const rand = (r * 37) % 100;

  // 1.5% deleted in B (only in A)
  if (variant === 'B' && rand < 2) {
    return null;
  }

  // 1.5% inserted in B (only in B)
  if (variant === 'A' && rand >= 2 && rand < 4) {
    return null;
  }

  const isBNew = variant === 'B' && rand >= 2 && rand < 4;
  const accId = isBNew
    ? `ACC-NEW-${String(900000 + r).padStart(8, '0')}`
    : `ACC-${String(100000 + r).padStart(8, '0')}`;
  const txId = `TX-${String(500000 + r).padStart(8, '0')}`;
  const baseAmount = Number((100 + (r * 13.37) % 8500).toFixed(2));
  const status = SYNTHETIC_STATUSES[r % SYNTHETIC_STATUSES.length];
  const currency = SYNTHETIC_CURRENCIES[r % SYNTHETIC_CURRENCIES.length];

  const row: Record<string, any> = {
    account_id: accId,
    transaction_id: txId,
    currency,
    amount: baseAmount,
    status,
  };

  for (let c = 5; c < totalColumns; c++) {
    const col = columns[c];
    if (col.startsWith('metric_score_')) {
      row[col] = Number(((r * 7.1 + c * 3.3) % 100).toFixed(4));
    } else if (col.startsWith('dimension_cat_')) {
      row[col] = `CAT_${((r + c) % 12) + 1}`;
    } else if (col.startsWith('balance_usd_')) {
      row[col] = Number(((r * 42.1 + c * 15.7) % 50000).toFixed(2));
    } else if (col.startsWith('risk_factor_')) {
      row[col] = Number((((r + c) % 100) / 100).toFixed(3));
    } else if (col.startsWith('timestamp_utc_')) {
      row[col] = `2026-09-${String((r % 28) + 1).padStart(2, '0')}T12:00:00Z`;
    } else {
      row[col] = `CD-${((r * 17 + c) % 9999).toString(16).toUpperCase()}`;
    }
  }

  // Induce value mismatch in Dataset B for 3-4% of rows
  if (variant === 'B' && rand >= 4 && rand < 8) {
    if (r % 3 === 0) {
      row['amount'] = Number((row['amount'] + 12.5).toFixed(2));
    } else if (r % 3 === 1) {
      row['status'] = row['status'] === 'SETTLED' ? 'FLAGGED' : 'CANCELLED';
    } else {
      const targetCol = columns[Math.min(5 + (r % (totalColumns - 5)), totalColumns - 1)];
      row[targetCol] = typeof row[targetCol] === 'number' ? row[targetCol] + 50.25 : `${row[targetCol]}_REV`;
    }
  }

  return row;
}

/**
 * Generates high-scale paired synthetic test datasets (File A and File B)
 * with customizable row counts (up to 100,000+ rows) and columns (up to 2,000 columns).
 * Incorporates realistic data discrepancies:
 * - 94% Exact Match
 * - 3% Value Mismatches (floats beyond epsilon, text deltas, null shifts)
 * - 1.5% Only in A (deleted in B)
 * - 1.5% Only in B (newly inserted in B)
 */
export function generateSyntheticPair(
  totalRows: number = 2500,
  totalColumns: number = 50,
  prefix: string = 'synthetic_benchmark'
): { metaA: DatasetMeta; metaB: DatasetMeta; allRowsA: Record<string, any>[]; allRowsB: Record<string, any>[] } {
  const columns = generateColumnsList(totalColumns);

  // If totalRows > 5000 (e.g. 100K rows x 2000 columns):
  // 100,000 x 2,000 = 200 Million cells per dataset!
  // Keeping 200M JS objects in heap would consume >12 GB and crash the browser tab.
  // Instead, we materialize preview rows (first 50 with all 2,000 columns) and use
  // our out-of-core streaming chunk generator for the full comparison.
  const isHighScale = totalRows > 5000;

  const previewCount = Math.min(50, totalRows);
  const previewA: Record<string, any>[] = [];
  const previewB: Record<string, any>[] = [];

  for (let r = 0; r < previewCount; r++) {
    const rowA = generateDeterministicRow(r, columns, totalColumns, 'A');
    if (rowA) previewA.push(rowA);

    const rowB = generateDeterministicRow(r, columns, totalColumns, 'B');
    if (rowB) previewB.push(rowB);
  }

  let rowsA: Record<string, any>[] = [];
  let rowsB: Record<string, any>[] = [];
  let actualCountA = 0;
  let actualCountB = 0;

  if (!isHighScale) {
    for (let r = 0; r < totalRows; r++) {
      const rowA = generateDeterministicRow(r, columns, totalColumns, 'A');
      if (rowA) {
        rowsA.push(rowA);
        actualCountA++;
      }

      const rowB = generateDeterministicRow(r, columns, totalColumns, 'B');
      if (rowB) {
        rowsB.push(rowB);
        actualCountB++;
      }
    }
  } else {
    // Exact counts: 2% only in A, 2% only in B => 98% in each dataset
    for (let r = 0; r < totalRows; r++) {
      const rand = (r * 37) % 100;
      if (!(rand >= 2 && rand < 4)) actualCountA++;
      if (!(rand < 2)) actualCountB++;
    }
  }

  const estBytesPerCell = 14;
  const estimatedSizeA = actualCountA * totalColumns * estBytesPerCell;
  const estimatedSizeB = actualCountB * totalColumns * estBytesPerCell;

  const metaA: DatasetMeta = {
    id: 'file_a',
    name: `${prefix}_source_a (${totalRows.toLocaleString()} rows × ${totalColumns.toLocaleString()} cols)`,
    format: 'synthetic',
    sizeBytes: estimatedSizeA,
    rowCount: actualCountA,
    columnCount: totalColumns,
    columns,
    previewRows: isHighScale ? previewA : rowsA.slice(0, 50),
    syntheticSpec: {
      totalRows,
      totalColumns,
      prefix,
      isVirtual: isHighScale,
    },
  };

  const metaB: DatasetMeta = {
    id: 'file_b',
    name: `${prefix}_target_b (${totalRows.toLocaleString()} rows × ${totalColumns.toLocaleString()} cols)`,
    format: 'synthetic',
    sizeBytes: estimatedSizeB,
    rowCount: actualCountB,
    columnCount: totalColumns,
    columns,
    previewRows: isHighScale ? previewB : rowsB.slice(0, 50),
    syntheticSpec: {
      totalRows,
      totalColumns,
      prefix,
      isVirtual: isHighScale,
    },
  };

  return { metaA, metaB, allRowsA: rowsA, allRowsB: rowsB };
}
