import type { ReportData } from "./report-types";

// Simple in-memory store for report data tokens
// Tokens expire after 60 seconds (only needed for the Puppeteer render cycle)
const store = new Map<string, { data: ReportData; expires: number }>();

export function storeReportData(data: ReportData): string {
  // Clean expired entries
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.expires < now) store.delete(key);
  });

  const token = crypto.randomUUID();
  store.set(token, { data, expires: now + 60_000 });
  return token;
}

export function getReportData(token: string): ReportData | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    store.delete(token);
    return null;
  }
  // Consume on read
  store.delete(token);
  return entry.data;
}
