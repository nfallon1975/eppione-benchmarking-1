/**
 * Download data as a CSV file in the browser.
 */
export function downloadCSV(
  data: Record<string, string | number | null | undefined>[],
  filename: string
) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Escape quotes and wrap in quotes if contains comma/quote/newline
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Download a chart container as a PNG image.
 */
export async function downloadChartAsPNG(
  elementId: string,
  filename: string
) {
  const element = document.getElementById(elementId);
  if (!element) return;
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(element, { backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch {
    // html2canvas not available
  }
}
