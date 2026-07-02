import * as XLSX from "xlsx";
import { DownloadReport } from "./reportAnalytics";
import { ServiceEntry } from "./types";
import { cleanTime } from "./formatTime";

export function exportCargaDiaExcel(services: ServiceEntry[], fecha: string) {
  const fechaLabel = fecha ? fecha.split("-").reverse().join("/") : "Todas";
  const columns = [
    "N°",
    "Nombre del Chofer",
    "Cita del Chofer",
    "Nombre del Custodio",
    "Cita del Custodio",
    "Hora de Franco Chofer",
    "Hora de Franco Custodio",
    "Total de Horas",
  ];
  const rows = services.map((s) => [
    s.solicitud,
    s.chofer || "—",
    cleanTime(s.citaChofer) || "—",
    s.custodio || "—",
    cleanTime(s.citaCustodio) || "—",
    cleanTime(s.horaFrancoChofer) || "—",
    cleanTime(s.horaFrancoCustodio) || "—",
    cleanTime(s.horasTotales) || "—",
  ]);
  const aoa: (string | number)[][] = [
    [`Carga del día: ${fechaLabel}`],
    [`Servicios registrados: ${services.length}`],
    [],
    columns,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = columns.map((c, idx) => ({
    wch: Math.min(40, Math.max(12, Math.max(c.length, ...rows.map((r) => String(r[idx] ?? "").length)) + 2)),
  }));
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Carga del día");
  XLSX.writeFile(wb, `Carga_${fecha || "todas"}.xlsx`);
}

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
