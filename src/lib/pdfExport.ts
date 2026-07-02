import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ServiceEntry, FuelEntry, getAdjustedHours, getServiceKey, normalizeClientName } from "./types";
import { cleanTime, formatHoursMinutes } from "./formatTime";
import { getPersonal, PersonalEntry, ROLE_LABELS } from "./personalStore";
import { getClients, ClientEntry } from "./clientStore";
import { DownloadReport } from "./reportAnalytics";

const BRAND = "CENOP — AM Seguridad";
const PRIMARY_COLOR: [number, number, number] = [30, 30, 30];
const AM_GREEN: [number, number, number] = [60, 180, 70];
const ACCENT_COLOR: [number, number, number] = AM_GREEN;
const HEADER_BG: [number, number, number] = [245, 245, 245];
const AM_LOGO_PATH = "/AM.png";

type ChartDatum = { name: string; value: number; label?: string };

const money = (value: number) => `$${value.toLocaleString("es-AR")}`;

function formatPeajeTipo(peaje: NonNullable<ServiceEntry["peajes"]>[number]) {
  if (peaje.conCamion === true) return "Con camión";
  if (peaje.conCamion === false) return "Sin camión";
  return peaje.ubicacion || "Sin tipo";
}

function peajesTotal(service: ServiceEntry) {
  return (service.peajes || []).reduce((sum, p) => sum + (p.monto || 0), 0);
}

function peajesDetalle(service: ServiceEntry) {
  return service.peajes?.length
    ? service.peajes.map((p) => `${formatPeajeTipo(p)}: ${money(p.monto || 0)}`).join(" | ")
    : "—";
}

function servicioCruzadoTipo(service: ServiceEntry) {
  if (service.tipoCenopOp === "cenop_en_op") return "CENOP en Operaciones";
  if (service.tipoCenopOp === "op_en_cenop") return "Operaciones en CENOP";
  return "Ninguno";
}

function rangoHorario(inicio?: string, fin?: string) {
  if (!inicio && !fin) return "—";
  return `${cleanTime(inicio || "") || "—"} a ${cleanTime(fin || "") || "—"}`;
}

function serviciosCruzadosDetalle(service: ServiceEntry) {
  return service.serviciosOperaciones?.length
    ? service.serviciosOperaciones.map((item) => [
      normalizeClientName(item.cliente),
      item.descripcion || "Sin descripción",
      item.persona ? `Por ${item.persona}` : "Sin persona",
      rangoHorario(item.horaInicio || item.hora, item.horaFin),
    ].join(" · ")).join(" | ")
    : "—";
}

function comisionesDetalle(service: ServiceEntry) {
  return service.comisiones?.length
    ? service.comisiones.map((item) => [
      item.descripcion || "Sin descripción",
      item.persona ? `Por ${item.persona}` : "Sin persona",
      rangoHorario(item.horaInicio || item.hora, item.horaFin),
    ].join(" · ")).join(" | ")
    : "—";
}

async function loadImageAsDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function addHeader(doc: jsPDF, title: string, subtitle?: string, logoDataUrl?: string) {
  const w = doc.internal.pageSize.getWidth();
  // Brand bar
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, w, 28, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 14, 4, 18, 18);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(BRAND, logoDataUrl ? 36 : 14, 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }), w - 14, 16, { align: "right" });

  // Title
  doc.setTextColor(...ACCENT_COLOR);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 42);

  if (subtitle) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 14, 50);
  }
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.setDrawColor(200, 200, 200);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pages}`, w - 14, h - 8, { align: "right" });
    doc.text(BRAND, 14, h - 8);
  }
}

function addSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFontSize(10);
  doc.setTextColor(...AM_GREEN);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
}

function ensureSpace(doc: jsPDF, y: number, height: number) {
  if (y + height > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    return 30;
  }
  return y;
}

function drawBarChart(doc: jsPDF, title: string, data: ChartDatum[], startY: number, maxItems = 8) {
  const rows = data.filter((item) => item.value > 0).slice(0, maxItems);
  if (!rows.length) return startY;

  const w = doc.internal.pageSize.getWidth();
  const chartX = 14;
  const chartW = w - 28;
  const rowH = 7;
  const chartH = 12 + rows.length * rowH;
  let y = ensureSpace(doc, startY, chartH + 8);
  const max = Math.max(...rows.map((item) => item.value));

  addSectionTitle(doc, title, chartX, y);
  y += 7;

  rows.forEach((item, index) => {
    const rowY = y + index * rowH;
    const label = item.name.length > 26 ? `${item.name.slice(0, 25)}…` : item.name;
    const valueW = Math.max(4, ((chartW - 74) * item.value) / max);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    doc.text(label, chartX, rowY + 4.5);
    doc.setFillColor(232, 244, 233);
    doc.roundedRect(chartX + 44, rowY, chartW - 74, 4.5, 1, 1, "F");
    doc.setFillColor(...AM_GREEN);
    doc.roundedRect(chartX + 44, rowY, valueW, 4.5, 1, 1, "F");
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(item.label || item.value.toLocaleString("es-AR"), chartX + chartW - 27, rowY + 4.5);
  });

  return y + rows.length * rowH + 7;
}

function tableStyle() {
  return {
    headStyles: {
      fillColor: HEADER_BG as [number, number, number],
      textColor: PRIMARY_COLOR as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 7.5,
      cellPadding: 3,
    },
    bodyStyles: { fontSize: 7, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [252, 252, 252] as [number, number, number] },
    styles: { lineColor: [220, 220, 220] as [number, number, number], lineWidth: 0.3 },
    margin: { left: 14, right: 14 },
  };
}

// ========== CARGA DE DATOS ==========
// PDF pensado para choferes y custodios: se imprime en A4 apaisado para que
// todos los encabezados y datos esenciales entren completos en una sola página.
// Solo incluye la información necesaria para saber a qué hora presentarse y a dónde ir.
export async function exportCargaDiaPDF(services: ServiceEntry[], fuel: FuelEntry[], fecha: string) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  const logoDataUrl = await loadImageAsDataUrl(AM_LOGO_PATH);
  const fechaLabel = fecha ? fecha.split("-").reverse().join("/") : "Todas las fechas";
  addHeader(doc, `Servicios del Día — ${fechaLabel}`, `Total de servicios: ${services.length}`, logoDataUrl);

  let startY = 56;

  if (services.length > 0) {
    autoTable(doc, {
      startY,
      head: [
        [
          { content: "N°", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Cliente", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Salida → Destino", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Chofer", colSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Custodio", colSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Móvil", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Celular", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Observaciones", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        ],
        [
          { content: "Nombre", styles: { halign: "center", valign: "middle" } },
          { content: "Cita", styles: { halign: "center", valign: "middle" } },
          { content: "Nombre", styles: { halign: "center", valign: "middle" } },
          { content: "Cita", styles: { halign: "center", valign: "middle" } },
        ],
      ],
      body: services.map((s) => [
        String(s.solicitud || "—"),
        s.cliente || "—",
        `${s.lugarSalida || "—"} → ${s.destino || "—"}`,
        s.chofer || "—",
        cleanTime(s.citaChofer) || "—",
        s.custodio || "—",
        cleanTime(s.citaCustodio) || "—",
        s.movil || "—",
        s.celular || "—",
        s.observaciones || "—",
      ]),
      margin: { left: 8, right: 8 },
      headStyles: {
        fillColor: AM_GREEN,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 2,
        halign: "center",
        valign: "middle",
      },
      bodyStyles: { fontSize: 8, cellPadding: 2, valign: "middle" },
      alternateRowStyles: { fillColor: [248, 250, 248] as [number, number, number] },
      styles: { lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 23 },
        2: { cellWidth: 55 },
        3: { cellWidth: 25 },
        4: { cellWidth: 18, halign: "center", fontStyle: "bold" },
        5: { cellWidth: 25 },
        6: { cellWidth: 18, halign: "center", fontStyle: "bold" },
        7: { cellWidth: 20, halign: "center" },
        8: { cellWidth: 25, halign: "center" },
        9: { cellWidth: 40 },
      },
      tableWidth: "auto",
    });

    startY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Combustible: solo lo esencial para chofer (móvil, litros, monto, estación).
  if (fuel.length > 0) {
    if (startY > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      startY = 30;
    }
    addSectionTitle(doc, "Combustible del Día", 14, startY);
    startY += 4;

    autoTable(doc, {
      startY,
      head: [["Hora", "Móvil", "Chofer", "Litros", "Monto", "Estación"]],
      body: fuel.map((f) => [
        cleanTime(f.hora) || "—",
        f.movil || "—",
        f.chofer || "—",
        `${f.litros}L`,
        `$${f.monto.toLocaleString("es-AR")}`,
        f.estacion || f.lugarCarga || "—",
      ]),
      margin: { left: 8, right: 8 },
      headStyles: {
        fillColor: AM_GREEN,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 2,
        halign: "center",
      },
      bodyStyles: { fontSize: 8, cellPadding: 2, valign: "middle" },
      alternateRowStyles: { fillColor: [248, 250, 248] as [number, number, number] },
      styles: { lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2, overflow: "linebreak" },
      tableWidth: "auto",
    });
  }

  addFooter(doc);
  doc.save(`CENOP_Servicios_${fecha}.pdf`);
}

// ========== DASHBOARD PERSONAL ==========
export async function exportPersonalPDF(
  byPerson: { nombre: string; prod: number; improd: number; servicios: number; total: number; clientes: string }[]
) {
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataUrl(AM_LOGO_PATH);
  addHeader(doc, "Reporte de Personal", `${byPerson.length} personas | Generado con filtros activos`, logoDataUrl);
  const chartEndY = drawBarChart(doc, "Gráfico — Top personal por horas totales", byPerson.map((p) => ({ name: p.nombre, value: p.total, label: formatHoursMinutes(p.total) })), 58);

  autoTable(doc, {
    startY: chartEndY,
    head: [["Personal", "Clientes", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total", "Eficiencia"]],
    body: byPerson.map((p) => [
      p.nombre,
      p.clientes || "CENOP",
      p.servicios,
      formatHoursMinutes(p.prod),
      formatHoursMinutes(p.improd),
      formatHoursMinutes(p.total),
      p.total > 0 ? `${Math.round((p.prod / p.total) * 100)}%` : "—",
    ]),
    ...tableStyle(),
  });

  addFooter(doc);
  doc.save(`CENOP_Personal_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ========== DASHBOARD MOVILES ==========
export async function exportMovilesPDF(
  byMovil: { patente: string; prod: number; improd: number; servicios: number; total: number }[]
) {
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataUrl(AM_LOGO_PATH);
  addHeader(doc, "Reporte de Móviles", `${byMovil.length} móviles | Generado con filtros activos`, logoDataUrl);
  const chartEndY = drawBarChart(doc, "Gráfico — Top móviles por horas totales", byMovil.map((m) => ({ name: m.patente, value: m.total, label: formatHoursMinutes(m.total) })), 58);

  autoTable(doc, {
    startY: chartEndY,
    head: [["Patente", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total", "Eficiencia"]],
    body: byMovil.map((m) => [
      m.patente,
      m.servicios,
      formatHoursMinutes(m.prod),
      formatHoursMinutes(m.improd),
      formatHoursMinutes(m.total),
      m.total > 0 ? `${Math.round((m.prod / m.total) * 100)}%` : "—",
    ]),
    ...tableStyle(),
  });

  addFooter(doc);
  doc.save(`CENOP_Moviles_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ========== DASHBOARD CLIENTES ==========
export async function exportClientesPDF(
  byCliente: { cliente: string; prod: number; improd: number; servicios: number; total: number }[]
) {
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataUrl(AM_LOGO_PATH);
  addHeader(doc, "Reporte de Clientes", `${byCliente.length} clientes | Generado con filtros activos`, logoDataUrl);
  const chartEndY = drawBarChart(doc, "Gráfico — Top clientes por horas productivas", byCliente.map((c) => ({ name: c.cliente, value: c.prod, label: formatHoursMinutes(c.prod) })), 58);

  autoTable(doc, {
    startY: chartEndY,
    head: [["Cliente", "Servicios", "Hs Prod."]],
    body: byCliente.map((c) => [
      c.cliente,
      c.servicios,
      formatHoursMinutes(c.prod),
    ]),
    ...tableStyle(),
  });

  addFooter(doc);
  doc.save(`CENOP_Clientes_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ========== DASHBOARD RESUMEN ==========
export async function exportResumenPDF(
  services: ServiceEntry[],
  fuelEntries: FuelEntry[],
  stats: { totalProd: number; totalImprod: number; totalServicios: number; uniqueDays: number; totalFuel: number; cenopEnOps: number },
  byPerson: { nombre: string; prod: number; improd: number; servicios: number; total: number }[],
  byMovil: { patente: string; prod: number; improd: number; servicios: number; total: number }[],
  byCliente: { cliente: string; prod: number; improd: number; servicios: number; total: number }[]
) {
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataUrl(AM_LOGO_PATH);
  addHeader(doc, "Resumen General", `${stats.totalServicios} servicios en ${stats.uniqueDays} días`, logoDataUrl);

  let y = 58;

  // Summary cards as a table
  addSectionTitle(doc, "Indicadores Generales", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total Servicios", stats.totalServicios.toString()],
      ["Días con Actividad", stats.uniqueDays.toString()],
      ["Hs Productivas", formatHoursMinutes(stats.totalProd)],
      ["Hs Improductivas", formatHoursMinutes(stats.totalImprod)],
      ["Hs Totales", formatHoursMinutes(stats.totalProd + stats.totalImprod)],
      ["Eficiencia Global", `${stats.totalProd + stats.totalImprod > 0 ? Math.round((stats.totalProd / (stats.totalProd + stats.totalImprod)) * 100) : 0}%`],
      ["Combustible Total", `$${stats.totalFuel.toLocaleString("es-AR")}`],
      ["CENOP en Operaciones", formatHoursMinutes(stats.cenopEnOps)],
    ],
    ...tableStyle(),
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  y = drawBarChart(doc, "Gráfico — Top personal por horas totales", byPerson.map((p) => ({ name: p.nombre, value: p.total, label: formatHoursMinutes(p.total) })), y, 6);
  y = drawBarChart(doc, "Gráfico — Top clientes por horas productivas", byCliente.map((c) => ({ name: c.cliente, value: c.prod, label: formatHoursMinutes(c.prod) })), y, 6);

  // Top 10 Personal
  y = ensureSpace(doc, y, 70);
  addSectionTitle(doc, "Top 10 Personal (por horas)", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Personal", "Servicios", "Hs Prod.", "Hs Improd.", "Total", "Eficiencia"]],
    body: byPerson.slice(0, 10).map((p) => [
      p.nombre, p.servicios, formatHoursMinutes(p.prod), formatHoursMinutes(p.improd),
      formatHoursMinutes(p.total), p.total > 0 ? `${Math.round((p.prod / p.total) * 100)}%` : "—",
    ]),
    ...tableStyle(),
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 30; }

  // Top 10 Clientes
  addSectionTitle(doc, "Top 10 Clientes (por horas productivas)", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Cliente", "Servicios", "Hs Prod."]],
    body: byCliente.slice(0, 10).map((c) => [
      c.cliente, c.servicios, formatHoursMinutes(c.prod),
    ]),
    ...tableStyle(),
  });

  addFooter(doc);
  doc.save(`CENOP_Resumen_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ========== GESTIÓN PERSONAL ==========
export async function exportPersonalManagerPDF() {
  const personal = getPersonal();
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataUrl(AM_LOGO_PATH);
  addHeader(doc, "Gestión de Personal", `${personal.length} registros`, logoDataUrl);

  autoTable(doc, {
    startY: 56,
    head: [["Nombre", "Roles", "Estado"]],
    body: personal.map((p) => [
      p.nombre,
      p.roles.map((r) => ROLE_LABELS[r]).join(", ") || "Sin rol",
      p.activo ? "Activo" : "Inactivo",
    ]),
    ...tableStyle(),
  });

  addFooter(doc);
  doc.save(`CENOP_Personal_Gestion_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ========== GESTIÓN CLIENTES ==========
export async function exportClientManagerPDF() {
  const clients = getClients();
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataUrl(AM_LOGO_PATH);
  addHeader(doc, "Gestión de Clientes", `${clients.length} registros`, logoDataUrl);

  autoTable(doc, {
    startY: 56,
    head: [["Nombre", "Estado"]],
    body: clients.map((c) => [c.nombre, c.activo ? "Activo" : "Inactivo"]),
    ...tableStyle(),
  });

  addFooter(doc);
  doc.save(`CENOP_Clientes_Gestion_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ========== CENTRO DE REPORTES ==========
export async function exportDownloadReportPDF(report: DownloadReport) {
  const numCols = report.columns.length;
  // Todos los reportes en A4 (formato de impresión de la empresa).
  // Solo cambia la orientación según la cantidad de columnas.
  const orientation: "portrait" | "landscape" = numCols > 6 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, format: "a4", unit: "mm" });
  const logoDataUrl = await loadImageAsDataUrl(AM_LOGO_PATH);
  addHeader(doc, report.title, `${report.description} | ${report.totalLabel}: ${report.totalValue}`, logoDataUrl);

  // Omitir el gráfico en reportes muy anchos (queda ilegible y ocupa espacio)
  const startY = numCols > 12
    ? 58
    : drawBarChart(doc, `Gráfico — ${report.metricLabel}`, report.chartData, 58, 10);

  const fontSize = numCols > 20 ? 6 : numCols > 12 ? 6.5 : 7;
  const headFontSize = numCols > 20 ? 6.5 : numCols > 12 ? 7 : 7.5;
  const base = tableStyle();

  autoTable(doc, {
    startY,
    head: [report.columns],
    body: report.rows.length ? report.rows : [["Sin datos para los filtros seleccionados"]],
    margin: base.margin,
    alternateRowStyles: base.alternateRowStyles,
    styles: {
      ...base.styles,
      fontSize,
      cellPadding: 1.5,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      ...base.headStyles,
      fontSize: headFontSize,
      cellPadding: 2,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: { ...base.bodyStyles, fontSize, cellPadding: 1.5 },
    tableWidth: "auto",
    // Si la tabla es más ancha que la página A4, se parte en páginas horizontales
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: 0,
  });

  addFooter(doc);
  doc.save(`CENOP_${report.title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
