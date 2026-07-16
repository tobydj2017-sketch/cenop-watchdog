import * as XLSX from "xlsx";
import { DownloadReport } from "./reportAnalytics";
import { ServiceEntry } from "./types";
import { cleanTime } from "./formatTime";

function diffHoras(inicio: string, fin: string): string {
  const a = cleanTime(inicio);
  const b = cleanTime(fin);
  const parse = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };
  const ma = parse(a);
  const mb = parse(b);
  if (ma == null || mb == null) return "—";
  let diff = mb - ma;
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const mm = diff % 60;
  return `${h}h ${mm.toString().padStart(2, "0")}m`;
}

export function exportCargaDiaExcel(services: ServiceEntry[], fecha: string) {
  const fechaLabel = fecha ? fecha.split("-").reverse().join("/") : "Todas";
  const columns = [
    "N°",
    "Nombre del Chofer",
    "Cita del Chofer",
    "Hora de Franco Chofer",
    "Total Horas Chofer",
    "Llegada Tarde",
    "Nombre del Custodio",
    "Cita del Custodio",
    "Hora de Franco Custodio",
    "Total Horas Custodio",
    "Llegada Tarde",
  ];
  const fmtTarde = (v?: string) => {
    const n = parseInt(String(v ?? "").trim(), 10);
    return Number.isFinite(n) && n > 0 ? `${n.toString().padStart(2, "0")} minutos` : "";
  };
  const rows = services.map((s) => [
    s.solicitud,
    s.chofer || "—",
    cleanTime(s.citaChofer) || "—",
    cleanTime(s.horaFrancoChofer) || "—",
    diffHoras(s.citaChofer, s.horaFrancoChofer),
    fmtTarde(s.llegadaTardeChoferMin),
    s.custodio || "—",
    cleanTime(s.citaCustodio) || "—",
    cleanTime(s.horaFrancoCustodio) || "—",
    diffHoras(s.citaCustodio, s.horaFrancoCustodio),
    fmtTarde(s.llegadaTardeCustodioMin),
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

// ========== FLOTA ==========
interface FleetExcelInput {
  porMovil: Array<{
    movil: string; marca: string; modelo: string; asignacion: string;
    cargas: number; litros: number; monto: number; kmFuel: number;
    kmServ: number; servicios: number; ultKm: number; ultimaCarga: string;
  }>;
  fuel: import("./types").FuelEntry[];
  kpis: { totalMonto: number; totalLitros: number; totalKmFuel: number; totalKmServ: number; cargas: number; flotaActiva: number; precioLitro: number; rendimiento: number };
  desde: string; hasta: string; movil: string;
}

export function exportFleetExcel(input: FleetExcelInput) {
  const { porMovil, fuel, kpis, desde, hasta, movil } = input;
  const wb = XLSX.utils.book_new();

  const rangeLabel = `${desde || "inicio"} → ${hasta || "hoy"}${movil !== "todos" ? ` · Móvil: ${movil}` : ""}`;

  // Hoja KPIs
  const kpiAoA = [
    ["Panel de Flota — Resumen"],
    [rangeLabel],
    [],
    ["Indicador", "Valor"],
    ["Gasto total ($)", kpis.totalMonto],
    ["Litros cargados", kpis.totalLitros],
    ["KM recorridos (combustible)", kpis.totalKmFuel],
    ["KM recorridos (servicios)", kpis.totalKmServ],
    ["Cargas realizadas", kpis.cargas],
    ["Móviles con actividad", kpis.flotaActiva],
    ["Precio promedio por litro ($)", Number(kpis.precioLitro.toFixed(2))],
    ["Rendimiento (km/L)", Number(kpis.rendimiento.toFixed(2))],
  ];
  const wsK = XLSX.utils.aoa_to_sheet(kpiAoA);
  wsK["!cols"] = [{ wch: 34 }, { wch: 20 }];
  wsK["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, wsK, "Resumen");

  // Hoja por móvil
  const movHead = ["Móvil", "Marca", "Modelo", "Asignación", "Cargas", "Litros", "Monto ($)", "KM comb.", "KM serv.", "Km/L", "Últ. KM", "Últ. carga"];
  const movRows = porMovil.map((m) => [
    m.movil, m.marca, m.modelo, m.asignacion, m.cargas,
    Number(m.litros.toFixed(2)), Math.round(m.monto),
    Math.round(m.kmFuel), Math.round(m.kmServ),
    m.litros > 0 ? Number((m.kmFuel / m.litros).toFixed(2)) : "—",
    Math.round(m.ultKm),
    m.ultimaCarga ? m.ultimaCarga.split("-").reverse().join("/") : "—",
  ]);
  const wsM = XLSX.utils.aoa_to_sheet([movHead, ...movRows]);
  wsM["!cols"] = movHead.map((h, i) => ({ wch: Math.min(30, Math.max(10, h.length + 2, ...movRows.map((r) => String(r[i] ?? "").length))) }));
  XLSX.utils.book_append_sheet(wb, wsM, "Por Móvil");

  // Hoja detalle de cargas
  const fHead = ["Fecha", "Hora", "Móvil", "Chofer", "Estación", "Lugar carga", "Litros", "$/L", "Monto", "KM", "KM Rec.", "Km/L", "Tipo comb.", "Remito", "Observaciones"];
  const fRows = [...fuel]
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .map((f) => {
      const litros = Number(f.litros) || 0;
      const kmRec = Number(f.kmRecorridos) || 0;
      return [
        f.fecha ? f.fecha.split("-").reverse().join("/") : "",
        f.hora || "",
        f.movil || "",
        f.chofer || "",
        f.estacion || "",
        f.lugarCarga || "",
        litros,
        Number(f.precioPorLitro) || 0,
        Number(f.monto) || 0,
        Number(f.kilometraje) || 0,
        kmRec,
        litros > 0 ? Number((kmRec / litros).toFixed(2)) : "—",
        f.tipoCombustible || "",
        f.numeroRemito || "",
        f.observaciones || "",
      ];
    });
  const wsF = XLSX.utils.aoa_to_sheet([fHead, ...fRows]);
  wsF["!cols"] = fHead.map((h, i) => ({ wch: Math.min(28, Math.max(10, h.length + 2, ...fRows.map((r) => String(r[i] ?? "").length))) }));
  XLSX.utils.book_append_sheet(wb, wsF, "Cargas Combustible");

  XLSX.writeFile(wb, `CENOP_Flota_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
