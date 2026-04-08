import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ServiceEntry, FuelEntry, getAdjustedHours, getServiceKey, normalizeClientName } from "./types";
import { cleanTime, formatHoursMinutes } from "./formatTime";
import { getPersonal, PersonalEntry, ROLE_LABELS } from "./personalStore";
import { getClients, ClientEntry } from "./clientStore";

const BRAND = "CENOP — AM Seguridad";
const PRIMARY_COLOR: [number, number, number] = [30, 30, 30];
const ACCENT_COLOR: [number, number, number] = [217, 119, 6]; // amber
const HEADER_BG: [number, number, number] = [245, 245, 245];

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth();
  // Brand bar
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, w, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(BRAND, 14, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }), w - 14, 14, { align: "right" });

  // Title
  doc.setTextColor(...ACCENT_COLOR);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 36);

  if (subtitle) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 14, 44);
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
export function exportCargaDiaPDF(services: ServiceEntry[], fuel: FuelEntry[], fecha: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const fechaLabel = fecha.split("-").reverse().join("/");
  addHeader(doc, `Carga de Datos — ${fechaLabel}`, `Servicios: ${services.length} | Combustible: ${fuel.length} entradas`);

  let startY = 50;

  if (services.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("Servicios del Día", 14, startY);
    startY += 4;

    autoTable(doc, {
      startY,
      head: [["#", "Cliente", "Destino", "Chofer", "Custodio", "Móvil", "Remito", "Salida", "Fin Serv.", "Peajes", "Hs Prod.", "Hs Improd.", "Hs Total"]],
      body: services.filter(s => s.chofer || s.custodio).map((s) => [
        s.solicitud,
        s.cliente,
        s.destino,
        s.chofer || "—",
        s.custodio || "—",
        s.movil,
        s.remito || "—",
        cleanTime(s.salidaCenop),
        cleanTime(s.finalizaServicio),
        s.peajes?.length ? `$${s.peajes.reduce((sum, p) => sum + (p.monto || 0), 0).toLocaleString("es-AR")}` : "—",
        cleanTime(s.horasProductivas),
        cleanTime(s.horasImproductivas),
        cleanTime(s.horasTotales),
      ]),
      ...tableStyle(),
    });

    startY = (doc as any).lastAutoTable.finalY + 12;
  }

  if (fuel.length > 0) {
    // Check if we need a new page
    if (startY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      startY = 30;
    }
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("Combustible del Día", 14, startY);
    startY += 4;

    autoTable(doc, {
      startY,
      head: [["Móvil", "Chofer", "Km", "Litros", "Monto", "$/L", "Lugar", "Remito", "Observaciones"]],
      body: fuel.map((f) => [
        f.movil,
        f.chofer,
        f.kilometraje || "—",
        `${f.litros}L`,
        `$${f.monto.toLocaleString("es-AR")}`,
        f.litros > 0 ? `$${(f.monto / f.litros).toFixed(2)}` : "—",
        f.lugarCarga || f.estacion || "—",
        f.numeroRemito || "—",
        f.observaciones || "—",
      ]),
      ...tableStyle(),
    });
  }

  addFooter(doc);
  doc.save(`CENOP_Carga_${fecha}.pdf`);
}

// ========== DASHBOARD PERSONAL ==========
export function exportPersonalPDF(
  byPerson: { nombre: string; prod: number; improd: number; servicios: number; total: number; clientes: string }[]
) {
  const doc = new jsPDF();
  addHeader(doc, "Reporte de Personal", `${byPerson.length} personas | Generado con filtros activos`);

  autoTable(doc, {
    startY: 50,
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
export function exportMovilesPDF(
  byMovil: { patente: string; prod: number; improd: number; servicios: number; total: number }[]
) {
  const doc = new jsPDF();
  addHeader(doc, "Reporte de Móviles", `${byMovil.length} móviles | Generado con filtros activos`);

  autoTable(doc, {
    startY: 50,
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
export function exportClientesPDF(
  byCliente: { cliente: string; prod: number; improd: number; servicios: number; total: number }[]
) {
  const doc = new jsPDF();
  addHeader(doc, "Reporte de Clientes", `${byCliente.length} clientes | Generado con filtros activos`);

  autoTable(doc, {
    startY: 50,
    head: [["Cliente", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total", "Eficiencia"]],
    body: byCliente.map((c) => [
      c.cliente,
      c.servicios,
      formatHoursMinutes(c.prod),
      formatHoursMinutes(c.improd),
      formatHoursMinutes(c.total),
      c.total > 0 ? `${Math.round((c.prod / c.total) * 100)}%` : "—",
    ]),
    ...tableStyle(),
  });

  addFooter(doc);
  doc.save(`CENOP_Clientes_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ========== DASHBOARD RESUMEN ==========
export function exportResumenPDF(
  services: ServiceEntry[],
  fuelEntries: FuelEntry[],
  stats: { totalProd: number; totalImprod: number; totalServicios: number; uniqueDays: number; totalFuel: number; cenopEnOps: number },
  byPerson: { nombre: string; prod: number; improd: number; servicios: number; total: number }[],
  byMovil: { patente: string; prod: number; improd: number; servicios: number; total: number }[],
  byCliente: { cliente: string; prod: number; improd: number; servicios: number; total: number }[]
) {
  const doc = new jsPDF();
  addHeader(doc, "Resumen General", `${stats.totalServicios} servicios en ${stats.uniqueDays} días`);

  let y = 52;

  // Summary cards as a table
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text("Indicadores Generales", 14, y);
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

  // Top 10 Personal
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text("Top 10 Personal (por horas)", 14, y);
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
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text("Top 10 Clientes (por horas)", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Cliente", "Servicios", "Hs Prod.", "Hs Improd.", "Total", "Eficiencia"]],
    body: byCliente.slice(0, 10).map((c) => [
      c.cliente, c.servicios, formatHoursMinutes(c.prod), formatHoursMinutes(c.improd),
      formatHoursMinutes(c.total), c.total > 0 ? `${Math.round((c.prod / c.total) * 100)}%` : "—",
    ]),
    ...tableStyle(),
  });

  addFooter(doc);
  doc.save(`CENOP_Resumen_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ========== GESTIÓN PERSONAL ==========
export function exportPersonalManagerPDF() {
  const personal = getPersonal();
  const doc = new jsPDF();
  addHeader(doc, "Gestión de Personal", `${personal.length} registros`);

  autoTable(doc, {
    startY: 50,
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
export function exportClientManagerPDF() {
  const clients = getClients();
  const doc = new jsPDF();
  addHeader(doc, "Gestión de Clientes", `${clients.length} registros`);

  autoTable(doc, {
    startY: 50,
    head: [["Nombre", "Estado"]],
    body: clients.map((c) => [c.nombre, c.activo ? "Activo" : "Inactivo"]),
    ...tableStyle(),
  });

  addFooter(doc);
  doc.save(`CENOP_Clientes_Gestion_${new Date().toISOString().slice(0, 10)}.pdf`);
}
