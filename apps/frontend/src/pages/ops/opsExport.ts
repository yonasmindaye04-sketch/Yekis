/* ────────────────────────────────────────────────────────────────────────
   opsExport.ts — client-side CSV export for console tables.

   Exports exactly what is on screen (the current page of the current
   filter), which is what a reviewer can actually see. There is no
   server-side export endpoint, so this deliberately does not claim to
   export "everything".
   ──────────────────────────────────────────────────────────────────────── */

/** RFC 4180 quoting: wrap in quotes and double any embedded quote. */
const cell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(
  headers: string[],
  rows: Array<Array<unknown>>,
): string {
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

/** Triggers a browser download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel opens UTF-8 (Ethiopian names) without mangling them.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Minor units → a plain ETB string with two decimals. */
export const etb = (minor: number | null | undefined) =>
  minor === null || minor === undefined ? "" : (minor / 100).toFixed(2);

/** ISO timestamp → ISO local date, for readable CSV cells. */
export const dateOnly = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB") : "";