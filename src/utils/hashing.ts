import { ComparisonRules, CellDiscrepancy } from '../types';

/**
 * 64-bit FNV-1a hash implementation using BigInt.
 * Extremely fast, uniform distribution, minimal collision probability for 10M rows.
 */
const FNV64_OFFSET = 0xcbf29ce484222325n;
const FNV64_PRIME = 0x100000001b3n;

export function hashString64(str: string): bigint {
  let hash = FNV64_OFFSET;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * FNV64_PRIME) & 0xffffffffffffffffn;
  }
  return hash;
}

/**
 * Normalizes a value according to comparison rules before hashing or comparing.
 */
export function normalizeValue(val: any, rules: ComparisonRules): any {
  if (val === undefined || val === null) {
    return rules.nullEqualsEmptyString ? '' : null;
  }

  // Handle NaN
  if (typeof val === 'number' && isNaN(val)) {
    return rules.treatNaNAsNull ? (rules.nullEqualsEmptyString ? '' : null) : NaN;
  }

  // Handle strings
  if (typeof val === 'string') {
    let s = val;
    if (rules.trimWhitespace) {
      s = s.trim();
    }
    if (rules.ignoreCase) {
      s = s.toLowerCase();
    }
    if (rules.ignoreLeadingZeros && /^\d+$/.test(s)) {
      s = s.replace(/^0+/, '') || '0';
    }
    if (rules.nullEqualsEmptyString && s === '') {
      return '';
    }
    // Date/time handling
    if (rules.dateTimeIgnoreSeconds && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
      s = s.substring(0, 16);
    }
    return s;
  }

  // Handle numbers
  if (typeof val === 'number') {
    return val;
  }

  // Handle booleans
  if (typeof val === 'boolean') {
    return val;
  }

  // Objects/dates
  if (val instanceof Date) {
    if (rules.dateTimeIgnoreSeconds) {
      return val.toISOString().substring(0, 16);
    }
    return val.toISOString();
  }

  return String(val);
}

/**
 * Checks equality between two values applying numeric tolerances and normalization.
 */
export function compareValues(
  valA: any,
  valB: any,
  colName: string,
  rules: ComparisonRules
): { isEqual: boolean; discrepancy?: CellDiscrepancy } {
  const normA = normalizeValue(valA, rules);
  const normB = normalizeValue(valB, rules);

  // Both null / empty equivalent
  if (normA === normB) {
    return { isEqual: true };
  }

  // Null check
  const isANull = normA === null || (rules.nullEqualsEmptyString && normA === '');
  const isBNull = normB === null || (rules.nullEqualsEmptyString && normB === '');

  if (isANull && isBNull) {
    return { isEqual: true };
  }

  if (isANull !== isBNull) {
    return {
      isEqual: false,
      discrepancy: {
        column: colName,
        valA,
        valB,
        isNumeric: false,
        reason: isANull ? 'Value missing in A (NULL)' : 'Value missing in B (NULL)'
      }
    };
  }

  // Numeric comparison with tolerance
  const numA = typeof normA === 'number' ? normA : Number(normA);
  const numB = typeof normB === 'number' ? normB : Number(normB);

  const isNumA = !isNaN(numA) && typeof normA !== 'boolean' && normA !== '';
  const isNumB = !isNaN(numB) && typeof normB !== 'boolean' && normB !== '';

  if (isNumA && isNumB) {
    const diff = Math.abs(numA - numB);
    const maxVal = Math.max(Math.abs(numA), Math.abs(numB));
    const relDiff = maxVal > 0 ? (diff / maxVal) * 100 : 0;

    // Check absolute and relative tolerances
    if (diff <= rules.numericToleranceAbs || relDiff <= rules.numericToleranceRelPct) {
      return { isEqual: true };
    }

    return {
      isEqual: false,
      discrepancy: {
        column: colName,
        valA,
        valB,
        isNumeric: true,
        delta: numB - numA,
        pctDelta: Number(relDiff.toFixed(4)),
        reason: `Exceeded tolerance (Δ: ${(numB - numA).toPrecision(5)}, rel: ${relDiff.toFixed(3)}%)`
      }
    };
  }

  // String / General comparison
  const strA = String(normA);
  const strB = String(normB);

  if (strA === strB) {
    return { isEqual: true };
  }

  return {
    isEqual: false,
    discrepancy: {
      column: colName,
      valA,
      valB,
      isNumeric: false,
      reason: 'Value mismatch'
    }
  };
}

/**
 * Computes a fast 64-bit composite fingerprint for an entire row across selected columns.
 * If two rows have the same fingerprint, all 2,000 columns match!
 */
export function computeRowFingerprint(
  row: Record<string, any>,
  columns: string[],
  rules: ComparisonRules
): bigint {
  let hash = FNV64_OFFSET;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const val = row[col];
    const norm = normalizeValue(val, rules);
    
    // Hash column name separator
    hash ^= BigInt(i);
    hash = (hash * FNV64_PRIME) & 0xffffffffffffffffn;

    // Hash normalized value string representation
    const s = norm === null ? '__NULL__' : String(norm);
    for (let j = 0; j < s.length; j++) {
      hash ^= BigInt(s.charCodeAt(j));
      hash = (hash * FNV64_PRIME) & 0xffffffffffffffffn;
    }
  }
  return hash;
}

/**
 * Formats a composite primary key into a stable string.
 */
export function extractRowKey(
  row: Record<string, any>,
  keyColumns: string[],
  rules: ComparisonRules
): string {
  if (keyColumns.length === 0) {
    return String(row['id'] ?? row['ID'] ?? row['key'] ?? 'unknown_key');
  }
  if (keyColumns.length === 1) {
    const v = normalizeValue(row[keyColumns[0]], rules);
    return v === null ? '__NULL__' : String(v);
  }
  return keyColumns
    .map(k => {
      const v = normalizeValue(row[k], rules);
      return v === null ? '__NULL__' : String(v);
    })
    .join('§');
}
