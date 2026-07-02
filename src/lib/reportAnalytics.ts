import { FuelEntry, ServiceEntry, calcTimeDiff, getAdjustedHours, getServiceKey, normalizeClientName } from "./types";
import { cleanTime, formatHoursMinutes } from "./formatTime";
import { getPersonal } from "./personalStore";

export type ReportId =
  | "cenop-en-operaciones"
  | "operaciones-en-cenop"
  | "servicios-detallados"
  | "personal"
  | "clientes"
  | "moviles"
  | "combustible"
  | "peajes";

export interface DownloadReport {
  id: ReportId;
  title: string;
  description: string;
  metricLabel: string;
  totalLabel: string;
  totalValue: string;
  columns: string[];
  rows: (string | number)[][];
  chartData: { name: string; value: number; label: string }[];
}

const formatDate = (date: string) => (date ? date.split("-").reverse().join("/") : "—");
const money = (value: number) => `$${value.toLocaleString("es-AR")}`;

function formatRangeDuration(start?: string, end?: string) {
  if (!start && !end) return "—";
  const duration = start && end ? ` (${cleanTime(calcTimeDiff(start, end))})` : "";
  return `${cleanTime(start || "") || "—"} a ${cleanTime(end || "") || "—"}${duration}`;
}

function getPeajeType(peaje: ServiceEntry["peajes"] extends (infer P)[] | undefined ? P : never) {
  if (peaje.conCamion === true) return "Con camión";
  if (peaje.conCamion === false) return "Sin camión";
  return peaje.ubicacion || "Sin tipo";
}

function getPeajesTotal(service: ServiceEntry) {
  return (service.peajes || []).reduce((sum, peaje) => sum + (peaje.monto || 0), 0);
}

function getPeajesDetail(service: ServiceEntry) {
  return service.peajes?.length
    ? service.peajes.map((peaje) => `${getPeajeType(peaje)}: ${money(peaje.monto || 0)}`).join(" | ")
    : "—";
}

function getCrossedServicesDetail(service: ServiceEntry) {
  return service.serviciosOperaciones?.length
    ? service.serviciosOperaciones.map((item) => [
      normalizeClientName(item.cliente),
      item.descripcion || "Sin descripción",
      item.persona ? `Realizado por ${item.persona}` : "Sin persona",
      formatRangeDuration(item.horaInicio || item.hora, item.horaFin),
    ].join(" · ")).join(" | ")
    : "—";
}

function getComisionesDetail(service: ServiceEntry) {
  return service.comisiones?.length
    ? service.comisiones.map((item) => [
      item.descripcion || "Sin descripción",
      item.persona ? `Realizado por ${item.persona}` : "Sin persona",
      formatRangeDuration(item.horaInicio || item.hora, item.horaFin),
    ].join(" · ")).join(" | ")
    : "—";
}

function roleByName() {
  return new Map(getPersonal().map((p) => [p.nombre, p.roles]));
}

function uniqueWorkers(service: ServiceEntry) {
  const workers = [
    { nombre: service.chofer, funcion: "Chofer", esOperaciones: Boolean(service.choferEsOperaciones) },
    { nombre: service.custodio, funcion: "Custodio", esOperaciones: Boolean(service.custodioEsOperaciones) },
  ].filter((w) => w.nombre);
  return workers.filter((worker, index, list) => list.findIndex((w) => w.nombre === worker.nombre) === index);
}

function summarizeByName(rows: { name: string; minutes: number }[]) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(row.name, (map.get(row.name) || 0) + row.minutes));
  return [...map.entries()]
    .map(([name, value]) => ({ name, value, label: formatHoursMinutes(value) }))
    .sort((a, b) => b.value - a.value);
}

export function buildDownloadReports(services: ServiceEntry[], fuelEntries: FuelEntry[]): DownloadReport[] {
  const roles = roleByName();

  const cenopEnOperacionesRows = services.flatMap((service) => {
    const hours = getAdjustedHours(service);
    return uniqueWorkers(service)
      .filter((worker) => worker.esOperaciones)
      .map((worker) => ({ service, worker, minutes: hours.prod }));
  });

  const operacionesEnCenopRows = services.flatMap((service) => {
    const hours = getAdjustedHours(service);
    return uniqueWorkers(service)
      .filter((worker) => roles.get(worker.nombre)?.includes("operaciones") && normalizeClientName(service.cliente) === "CENOP")
      .map((worker) => ({ service, worker, minutes: hours.prod + hours.improd }));
  });

  const serviciosUnicos = new Set(services.map(getServiceKey)).size;
  const totalPeajes = services.reduce((sum, service) => sum + (service.peajes || []).reduce((acc, peaje) => acc + (peaje.monto || 0), 0), 0);

  const byPersonal = summarizeByName(
    services.flatMap((service) => {
      const hours = getAdjustedHours(service);
      return uniqueWorkers(service).map((worker) => ({ name: worker.nombre, minutes: hours.prod + hours.improd }));
    }),
  );

  const byCliente = summarizeByName(
    services.map((service) => {
      const hours = getAdjustedHours(service);
      return { name: normalizeClientName(service.cliente), minutes: hours.prod };
    }),
  );

  const byMovil = summarizeByName(
    services.filter((service) => service.movil).map((service) => {
      const hours = getAdjustedHours(service);
      return { name: service.movil, minutes: hours.prod + hours.improd };
    }),
  );

  const peajesByCliente = new Map<string, number>();
  const peajesByMovil = new Map<string, number>();
  services.forEach((service) => {
    const peajesTotal = getPeajesTotal(service);
    if (!peajesTotal) return;
    const cliente = normalizeClientName(service.cliente);
    peajesByCliente.set(cliente, (peajesByCliente.get(cliente) || 0) + peajesTotal);
    if (service.movil) peajesByMovil.set(service.movil, (peajesByMovil.get(service.movil) || 0) + peajesTotal);
  });

  return [
    {
      id: "cenop-en-operaciones",
      title: "Personal CENOP en Operaciones",
      description: "Personal de base que realizó servicios externos u operativos.",
      metricLabel: "Horas productivas",
      totalLabel: "Total",
      totalValue: formatHoursMinutes(cenopEnOperacionesRows.reduce((sum, row) => sum + row.minutes, 0)),
      columns: ["Fecha", "Solicitud", "Personal", "Función", "Cliente", "Destino", "Móvil", "Peajes", "Hs Prod."],
      rows: cenopEnOperacionesRows.map(({ service, worker, minutes }) => [
        formatDate(service.fecha), service.solicitud, worker.nombre, worker.funcion, normalizeClientName(service.cliente), service.destino || "—", service.movil || "—", money(getPeajesTotal(service)), formatHoursMinutes(minutes),
      ]),
      chartData: summarizeByName(cenopEnOperacionesRows.map((row) => ({ name: row.worker.nombre, minutes: row.minutes }))),
    },
    {
      id: "operaciones-en-cenop",
      title: "Personal Operaciones en CENOP",
      description: "Personal con rol Operaciones que trabajó en registros propios de CENOP.",
      metricLabel: "Horas totales",
      totalLabel: "Total",
      totalValue: formatHoursMinutes(operacionesEnCenopRows.reduce((sum, row) => sum + row.minutes, 0)),
      columns: ["Fecha", "Solicitud", "Personal", "Función", "Destino", "Móvil", "Remito", "Peajes", "Hs Total"],
      rows: operacionesEnCenopRows.map(({ service, worker, minutes }) => [
        formatDate(service.fecha), service.solicitud, worker.nombre, worker.funcion, service.destino || "—", service.movil || "—", service.remito || "—", money(getPeajesTotal(service)), formatHoursMinutes(minutes),
      ]),
      chartData: summarizeByName(operacionesEnCenopRows.map((row) => ({ name: row.worker.nombre, minutes: row.minutes }))),
    },
    {
      id: "servicios-detallados",
      title: "Servicios Detallados (Planilla CENOP)",
      description: "Listado completo de servicios con todas las columnas de la planilla CENOP.",
      metricLabel: "Servicios",
      totalLabel: "Total",
      totalValue: serviciosUnicos.toString(),
      columns: [
        "Fecha", "N°", "Solicitud de Custodia", "Cliente", "Lugar de Salida", "Destino",
        "Chofer", "Cita Chofer", "Custodio", "Cita Custodio", "Móvil", "Celular",
        "Salida de CENOP", "Llegada a Servicio", "Inicia Servicio", "Llegada a Destino",
        "Finaliza Servicio", "Llegada a CENOP", "Hora Franco Chofer", "Hora Franco Custodio",
        "Orden de Carga Cliente", "N° Remito", "Continúa Orden N°", "Observaciones",
        "Horas Productivas", "Horas Improductivas 1", "Horas Improductivas 2",
        "Horas Improductivas", "Horas Totales", "KM Salida", "KM Llegada", "KM Recorridos",
        "Tipo Servicio Cruzado", "Servicios Cruzados", "Comisiones Productivas", "Peajes", "Detalle Peajes",
      ],
      rows: services.map((service) => [
        formatDate(service.fecha),
        service.solicitud,
        cleanTime(service.horaSolicitud) || "—",
        normalizeClientName(service.cliente),
        service.lugarSalida || "—",
        service.destino || "—",
        service.chofer || "—",
        cleanTime(service.citaChofer) || "—",
        service.custodio || "—",
        cleanTime(service.citaCustodio) || "—",
        service.movil || "—",
        service.celular || "—",
        cleanTime(service.salidaCenop) || "—",
        cleanTime(service.llegadaServicio) || "—",
        cleanTime(service.iniciaServicio) || "—",
        cleanTime(service.llegadaDestino) || "—",
        cleanTime(service.finalizaServicio) || "—",
        cleanTime(service.llegadaCenop) || "—",
        cleanTime(service.horaFrancoChofer) || "—",
        cleanTime(service.horaFrancoCustodio) || "—",
        service.ordenCarga || "—",
        service.remito || "—",
        service.continuaOrden || "—",
        service.observaciones || "—",
        cleanTime(service.horasProductivas) || "—",
        cleanTime(service.horasImproductivas1) || "—",
        cleanTime(service.horasImproductivas2) || "—",
        cleanTime(service.horasImproductivas) || "—",
        cleanTime(service.horasTotales) || "—",
        service.kmSalida || "—",
        service.kmLlegada || "—",
        service.kmRecorridos || "—",
        service.tipoCenopOp === "cenop_en_op" ? "CENOP en Operaciones" : service.tipoCenopOp === "op_en_cenop" ? "Operaciones en CENOP" : "Ninguno",
        getCrossedServicesDetail(service),
        getComisionesDetail(service),
        money(getPeajesTotal(service)),
        getPeajesDetail(service),
      ]),
      chartData: byCliente,
    },
    {
      id: "personal",
      title: "Reporte por Personal",
      description: "Totales absolutos de horas trabajadas por cada persona.",
      metricLabel: "Horas totales",
      totalLabel: "Personas",
      totalValue: byPersonal.length.toString(),
      columns: ["Personal", "Hs Total"],
      rows: byPersonal.map((row) => [row.name, row.label]),
      chartData: byPersonal,
    },
    {
      id: "clientes",
      title: "Reporte por Clientes",
      description: "Horas productivas acumuladas por cliente u objetivo.",
      metricLabel: "Horas productivas",
      totalLabel: "Clientes",
      totalValue: byCliente.length.toString(),
      columns: ["Cliente", "Hs Prod.", "Peajes"],
      rows: byCliente.map((row) => [row.name, row.label, money(peajesByCliente.get(row.name) || 0)]),
      chartData: byCliente,
    },
    {
      id: "moviles",
      title: "Reporte por Móviles",
      description: "Uso acumulado de móviles por horas de servicio.",
      metricLabel: "Horas totales",
      totalLabel: "Móviles",
      totalValue: byMovil.length.toString(),
      columns: ["Móvil", "Hs Total", "Peajes"],
      rows: byMovil.map((row) => [row.name, row.label, money(peajesByMovil.get(row.name) || 0)]),
      chartData: byMovil,
    },
    {
      id: "combustible",
      title: "Combustible",
      description: "Cargas, litros, monto, remito y lugar de carga.",
      metricLabel: "Monto",
      totalLabel: "Total",
      totalValue: money(fuelEntries.reduce((sum, fuel) => sum + fuel.monto, 0)),
      columns: [
        "Fecha", "Hora", "Móvil", "Chofer", "Marca", "Modelo", "Año", "Tipo Combustible",
        "KM Anterior", "KM Actual", "KM Recorridos", "Litros", "KM/L", "Consumo Ideal",
        "Monto", "$/L", "Lugar", "Estación / Detalle", "Remito", "Observaciones", "Ticket",
      ],
      rows: fuelEntries.map((fuel) => [
        formatDate(fuel.fecha), cleanTime(fuel.hora) || "—", fuel.movil || "—", fuel.chofer || "—",
        fuel.marca || "—", fuel.modelo || "—", fuel.anio || "—", fuel.tipoCombustible || "—",
        fuel.kmAnterior || "—", fuel.kilometraje || "—", fuel.kmRecorridos || "—", `${fuel.litros}L`,
        fuel.kmPorLitro || "—", fuel.consumoIdeal || "—", money(fuel.monto),
        fuel.precioPorLitro ? money(fuel.precioPorLitro) : (fuel.litros > 0 ? money(fuel.monto / fuel.litros) : "—"),
        fuel.lugarCarga || "—", fuel.estacion || "—", fuel.numeroRemito || "—", fuel.observaciones || "—", fuel.ticketImage ? "Sí" : "No",
      ]),
      chartData: fuelEntries.map((fuel) => ({ name: `${formatDate(fuel.fecha)} ${fuel.movil}`, value: fuel.monto, label: money(fuel.monto) })),
    },
    {
      id: "peajes",
      title: "Peajes",
      description: "Detalle consolidado de peajes cargados en servicios.",
      metricLabel: "Monto",
      totalLabel: "Total",
      totalValue: money(totalPeajes),
      columns: ["Fecha", "Solicitud", "Cliente", "Tipo", "Monto"],
      rows: services.flatMap((service) => (service.peajes || []).map((peaje) => [formatDate(service.fecha), service.solicitud, normalizeClientName(service.cliente), getPeajeType(peaje), money(peaje.monto || 0)])),
      chartData: services.flatMap((service) => (service.peajes || []).map((peaje) => ({ name: getPeajeType(peaje) || `Solicitud ${service.solicitud}`, value: peaje.monto || 0, label: money(peaje.monto || 0) }))),
    },
  ];
}