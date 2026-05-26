import * as XLSX from "xlsx";
import { DownloadReport } from "./reportAnalytics";

export function exportDownloadReportExcel(report: DownloadReport) {
  const wb = XLSX.utils.book_new();
  const headerRow = report.columns;
  const dataRows = report.rows.map((row) => row.map((cell) => cell));
  const totalRow = [report.totalLabel, report.totalValue];

  const aoa = [
    [report.title],
    [report.description],
    [],
    headerRow,
    ...dataRows,
    [],
    totalRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Auto width
  const colWidths = headerRow.map((_, idx) => {
    const maxLen = Math.max(
      String(headerRow[idx] ?? "").length,
      ...dataRows.map((r) => String(r[idx] ?? "").length),
    );
    return { wch: Math.min(40, Math.max(10, maxLen + 2)) };
  });
  ws["!cols"] = colWidths;
  // Merge title
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } },
  ];

  const safeName = report.title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "").slice(0, 31) || "Reporte";
  XLSX.utils.book_append_sheet(wb, ws, safeName);
  XLSX.writeFile(wb, `${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
