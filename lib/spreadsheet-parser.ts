import * as XLSX from "xlsx";
import crypto from "crypto";

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
  sheetNames: string[];
  selectedSheet: string;
  headerRow: number;
  totalRows: number;
}

export interface ColumnInfo {
  header: string;
  index: number;
  detectedType: "string" | "number" | "boolean" | "date" | "currency";
  sampleValues: string[];
  emptyCount: number;
  totalCount: number;
}

/**
 * Parse a spreadsheet buffer into headers and rows.
 * Supports xlsx, xls, csv, tsv.
 */
export function parseSpreadsheet(
  buffer: Buffer,
  fileType: string,
  sheetName?: string
): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellNF: true,
  });

  const sheetNames = workbook.SheetNames;
  const selected = sheetName || sheetNames[0];
  const sheet = workbook.Sheets[selected];

  if (!sheet) {
    throw new Error(`Sheet "${selected}" not found`);
  }

  // Convert to array of arrays to detect header row
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (rawData.length === 0) {
    throw new Error("Spreadsheet is empty");
  }

  // Detect header row: find the first row where most cells are non-empty text strings
  const headerRow = detectHeaderRow(rawData);

  const headers = (rawData[headerRow] as string[])
    .map((h) => (h != null ? String(h).trim() : ""))
    .filter((h) => h.length > 0);

  // Build rows as objects keyed by header
  const rows: Record<string, string>[] = [];
  for (let i = headerRow + 1; i < rawData.length; i++) {
    const row = rawData[i] as string[];
    // Skip completely empty rows
    if (!row || row.every((cell) => cell === "" || cell == null)) continue;

    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const val = row[j];
      obj[headers[j]] = val != null ? String(val).trim() : "";
    }
    rows.push(obj);
  }

  return {
    headers,
    rows,
    sheetNames,
    selectedSheet: selected,
    headerRow,
    totalRows: rows.length,
  };
}

/**
 * Detect which row contains the headers.
 * Looks for the first row where >50% of cells contain non-empty text.
 */
function detectHeaderRow(data: unknown[][]): number {
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i] as string[];
    if (!row) continue;

    const nonEmpty = row.filter(
      (cell) => cell != null && String(cell).trim().length > 0
    ).length;
    const textCells = row.filter((cell) => {
      if (cell == null) return false;
      const s = String(cell).trim();
      return s.length > 0 && isNaN(Number(s));
    }).length;

    // Row is a header if >50% of non-empty cells are text and has at least 3 values
    if (nonEmpty >= 3 && textCells / nonEmpty > 0.5) {
      return i;
    }
  }
  return 0; // default to first row
}

/**
 * Analyse columns: detect types, extract samples, count empties.
 */
export function analyseColumns(
  headers: string[],
  rows: Record<string, string>[]
): ColumnInfo[] {
  return headers.map((header, index) => {
    const values = rows.map((r) => r[header] || "");
    const nonEmpty = values.filter((v) => v.length > 0);
    const sampleValues = nonEmpty.slice(0, 5);
    const detectedType = detectColumnType(nonEmpty.slice(0, 20));

    return {
      header,
      index,
      detectedType,
      sampleValues,
      emptyCount: values.length - nonEmpty.length,
      totalCount: values.length,
    };
  });
}

/**
 * Detect the predominant data type in a column's values.
 */
function detectColumnType(
  values: string[]
): "string" | "number" | "boolean" | "date" | "currency" {
  if (values.length === 0) return "string";

  let numbers = 0;
  let booleans = 0;
  let dates = 0;
  let currencies = 0;

  for (const v of values) {
    const lower = v.toLowerCase().trim();

    // Boolean check
    if (["yes", "no", "y", "n", "true", "false", "1", "0"].includes(lower)) {
      booleans++;
      continue;
    }

    // Currency check (starts with currency symbol or contains currency code)
    if (/^[€£$¥]/.test(v) || /^(EUR|GBP|USD|AED|SGD|AUD)\s/i.test(v)) {
      currencies++;
      continue;
    }

    // Number check (after removing commas)
    const cleaned = v.replace(/,/g, "").replace(/%$/, "");
    if (!isNaN(Number(cleaned)) && cleaned.length > 0) {
      numbers++;
      continue;
    }

    // Date check
    if (/\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(v)) {
      dates++;
      continue;
    }
  }

  const total = values.length;
  if (currencies / total > 0.5) return "currency";
  if (booleans / total > 0.5) return "boolean";
  if (dates / total > 0.5) return "date";
  if (numbers / total > 0.5) return "number";
  return "string";
}

/**
 * Compute a hash of column headers for template matching.
 * Normalises by lowercasing, trimming, sorting, then SHA-256.
 */
export function computeHeaderHash(headers: string[]): string {
  const normalised = headers
    .map((h) => h.toLowerCase().trim())
    .filter((h) => h.length > 0)
    .sort()
    .join("|");
  return crypto.createHash("sha256").update(normalised).digest("hex");
}

/**
 * Compute SHA-256 hash of file contents for duplicate detection.
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
