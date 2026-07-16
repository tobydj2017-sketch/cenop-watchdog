import { getPersonal } from "./personalStore";

export interface PeajeEntry {
  id: string;
  ubicacion?: string; // legacy
  conCamion?: boolean;
  monto: number;
}

export interface ComisionEntry {
  id: string;
  descripcion: string;
  hora?: string; // legacy
  persona: string;
  horaInicio: string;
  horaFin: string;
}

export interface ServicioOperacionesEntry {
  id: string;
  cliente: string;
  descripcion: string;
  hora?: string; // legacy
  persona: string;
  horaInicio: string;
  horaFin: string;
}

export interface ServiceEntry {
  id: string;
  solicitud: number;
  horaSolicitud: string;
  cliente: string;
  lugarSalida: string;
  destino: string;
  chofer: string;
  citaChofer: string;
  custodio: string;
  citaCustodio: string;
  movil: string;
  celular: string;
  salidaCenop: string;
  llegadaServicio: string;
  iniciaServicio: string;
  llegadaDestino: string;
  finalizaServicio: string;
  llegadaCenop: string;
  horaFrancoChofer: string;
  horaFrancoCustodio: string;
  ordenCarga: string;
  remito: string;
  continuaOrden: string;
  observaciones: string;
  horasProductivas: string;
  horasImproductivas1: string;
  horasImproductivas2: string;
  horasImproductivas: string;
  horasTotales: string;
  kmSalida?: string;
  kmLlegada?: string;
  kmRecorridos?: string;
  // Overrides opcionales por persona (para casos donde chofer y custodio
  // no entran/salen del CENOP juntos: ej. le dan franco al custodio antes).
  salidaCenopChofer?: string;
  llegadaCenopChofer?: string;
  salidaCenopCustodio?: string;
  llegadaCenopCustodio?: string;
  // Horas calculadas por persona (para vistas y reportes).
  horasProductivasChofer?: string;
  horasImproductivasChofer?: string;
  horasTotalesChofer?: string;
  horasProductivasCustodio?: string;
  horasImproductivasCustodio?: string;
  horasTotalesCustodio?: string;
  fecha: string;
  peajes?: PeajeEntry[];
  comisiones?: ComisionEntry[];
  serviciosOperaciones?: ServicioOperacionesEntry[];
  choferEsOperaciones?: boolean;
  custodioEsOperaciones?: boolean;
  tipoCenopOp?: "ninguno" | "cenop_en_op" | "op_en_cenop";
  // Minutos de llegada tarde (respecto a la cita) por persona. Se registra a día vencido.
  llegadaTardeChoferMin?: string;
  llegadaTardeCustodioMin?: string;
}

export interface FuelEntry {
  id: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  movil: string;
  chofer: string; // asignación (auto desde móvil)
  monto: number;
  litros: number;
  precioPorLitro: number;
  kilometraje: string; // KM actual
  kmAnterior: string;
  kmRecorridos: string;
  kmPorLitro: string;
  numeroRemito: string;
  lugarCarga: string;
  estacion: string;
  marca: string;
  modelo: string;
  anio: string;
  consumoIdeal: string;
  tipoCombustible: string;
  ticketImage?: string; // data URL legacy o referencia azure:tickets/...
  observaciones: string;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function calcTimeDiff(start: string, end: string): string {
  if (!start || !end) return "0:00:00";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin < 0) diffMin += 24 * 60;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `${h}:${m.toString().padStart(2, "0")}:00`;
}

export function timeToMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Cálculo canónico de horas productivas/improductivas.
 * REGLA: sólo cuenta como IMPRODUCTIVO el tiempo dentro del CENOP:
 *   - Desde la cita (chofer/custodio) hasta salidaCenop.
 *   - Desde llegadaCenop hasta la hora de franco (chofer/custodio).
 * Todo lo que ocurre fuera del CENOP (traslados, esperas, servicio) es PRODUCTIVO.
 */
export type PersonRole = "chofer" | "custodio";

/**
 * Horas de UNA persona (chofer o custodio) del servicio.
 * Usa overrides propios de la persona (salidaCenopChofer, llegadaCenopCustodio, etc.)
 * y cae a los tiempos compartidos si no están definidos.
 */
export function computeHoursForPerson(
  f: {
    citaChofer?: string; citaCustodio?: string;
    salidaCenop?: string; llegadaCenop?: string;
    horaFrancoChofer?: string; horaFrancoCustodio?: string;
    salidaCenopChofer?: string; llegadaCenopChofer?: string;
    salidaCenopCustodio?: string; llegadaCenopCustodio?: string;
  },
  role: PersonRole,
) {
  const cita = role === "chofer" ? (f.citaChofer || "") : (f.citaCustodio || "");
  const franco = role === "chofer" ? (f.horaFrancoChofer || "") : (f.horaFrancoCustodio || "");
  const salida = (role === "chofer" ? f.salidaCenopChofer : f.salidaCenopCustodio) || f.salidaCenop || "";
  const llegada = (role === "chofer" ? f.llegadaCenopChofer : f.llegadaCenopCustodio) || f.llegadaCenop || "";
  const improd1 = cita && salida ? calcTimeDiff(cita, salida) : "0:00:00";
  const improd2 = llegada && franco ? calcTimeDiff(llegada, franco) : "0:00:00";
  const prod = salida && llegada ? calcTimeDiff(salida, llegada) : "0:00:00";
  const improdMin = timeToMinutes(improd1) + timeToMinutes(improd2);
  const prodMin = timeToMinutes(prod);
  return {
    productivas: prod,
    improductivas: minutesToTime(improdMin),
    total: minutesToTime(prodMin + improdMin),
    productivasMin: prodMin,
    improductivasMin: improdMin,
  };
}

/**
 * Cálculo canónico de horas productivas/improductivas del SERVICIO (agregado).
 * Toma el MÁXIMO span entre chofer y custodio para reflejar el servicio completo,
 * y guarda además las horas de cada persona por separado.
 * REGLA: sólo es IMPRODUCTIVO el tiempo dentro del CENOP (cita→salida y llegada→franco).
 */
export function computeServiceHours(f: {
  citaChofer?: string; citaCustodio?: string;
  salidaCenop?: string; llegadaCenop?: string;
  horaFrancoChofer?: string; horaFrancoCustodio?: string;
  chofer?: string; custodio?: string;
  salidaCenopChofer?: string; llegadaCenopChofer?: string;
  salidaCenopCustodio?: string; llegadaCenopCustodio?: string;
}) {
  const ch = computeHoursForPerson(f, "chofer");
  const cu = computeHoursForPerson(f, "custodio");
  const hasCh = !!(f.chofer && (f.citaChofer || f.horaFrancoChofer));
  const hasCu = !!(f.custodio && (f.citaCustodio || f.horaFrancoCustodio));
  // Agregado del servicio: el mayor de ambos (cubre el span total en el que hubo personal).
  const pickMax = (a: number, b: number) => (hasCh && hasCu ? Math.max(a, b) : hasCh ? a : b);
  const prodMin = pickMax(ch.productivasMin, cu.productivasMin);
  const improdMin = pickMax(ch.improductivasMin, cu.improductivasMin);
  // Improd 1 / 2 solo para retro-compatibilidad; usamos los del chofer si existe.
  const ref = hasCh ? ch : cu;
  const improd1 = f.citaChofer && f.salidaCenop ? calcTimeDiff(f.citaChofer, f.salidaCenop)
    : f.citaCustodio && f.salidaCenop ? calcTimeDiff(f.citaCustodio, f.salidaCenop) : "0:00:00";
  const improd2 = f.llegadaCenop && f.horaFrancoChofer ? calcTimeDiff(f.llegadaCenop, f.horaFrancoChofer)
    : f.llegadaCenop && f.horaFrancoCustodio ? calcTimeDiff(f.llegadaCenop, f.horaFrancoCustodio) : "0:00:00";
  return {
    horasProductivas: minutesToTime(prodMin),
    horasImproductivas1: improd1,
    horasImproductivas2: improd2,
    horasImproductivas: minutesToTime(improdMin),
    horasTotales: minutesToTime(prodMin + improdMin),
    horasProductivasChofer: ch.productivas,
    horasImproductivasChofer: ch.improductivas,
    horasTotalesChofer: ch.total,
    horasProductivasCustodio: cu.productivas,
    horasImproductivasCustodio: cu.improductivas,
    horasTotalesCustodio: cu.total,
  };
}

export function normalizeClientName(cliente?: string): string {
  const normalized = cliente?.trim().toUpperCase();
  return normalized || "CENOP";
}

export function isBaseServiceEntry(service: Pick<ServiceEntry, "cliente">): boolean {
  return normalizeClientName(service.cliente) === "CENOP";
}

export function isCountableServiceEntry(service: ServiceEntry): boolean {
  return [
    service.horaSolicitud,
    service.cliente,
    service.lugarSalida,
    service.destino,
    service.chofer,
    service.citaChofer,
    service.custodio,
    service.citaCustodio,
    service.movil,
    service.celular,
    service.salidaCenop,
    service.llegadaServicio,
    service.iniciaServicio,
    service.llegadaDestino,
    service.finalizaServicio,
    service.llegadaCenop,
    service.horaFrancoChofer,
    service.horaFrancoCustodio,
    service.ordenCarga,
    service.remito,
    service.continuaOrden,
    service.observaciones,
    service.kmSalida,
    service.kmLlegada,
    service.kmRecorridos,
  ].some((value) => {
    const normalized = String(value ?? "").trim();
    return normalized !== "" && normalized !== "00:00" && normalized !== "00:00:00" && normalized !== "0:00";
  });
}

export function getServiceKey(service: Pick<ServiceEntry, "fecha" | "solicitud">): string {
  return `${service.fecha || "sin-fecha"}::${service.solicitud}`;
}

function isPlayeroService(s: ServiceEntry): boolean {
  if (!isBaseServiceEntry(s)) return false;
  // Check if worker has playero role
  const workerName = s.chofer || s.custodio;
  if (workerName) {
    const personal = getPersonal();
    const person = personal.find((p) => p.nombre === workerName);
    if (person && person.roles.includes("playero")) return true;
  }
  // Any 8h+ CENOP shift = playero replacement, counts as productive
  const totalMin = timeToMinutes(s.horasProductivas) + timeToMinutes(s.horasImproductivas);
  return totalMin >= 480; // 8 hours
}

export function getAdjustedHours(s: ServiceEntry): { prod: number; improd: number } {
  const rawProd = timeToMinutes(s.horasProductivas);
  const rawImprod = timeToMinutes(s.horasImproductivas);
  if (isBaseServiceEntry(s) && !isPlayeroService(s)) {
    return { prod: 0, improd: rawProd + rawImprod };
  }
  return { prod: rawProd, improd: rawImprod };
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m.toString().padStart(2, "0")}:00`;
}

/**
 * Calculate productive hours of CENOP personnel (non-operaciones)
 * working on external (non-CENOP) services.
 */
export function getCenopEnOperacionesMinutes(services: ServiceEntry[]): number {
  let totalMin = 0;
  services.forEach((s) => {
    const h = getAdjustedHours(s);
    // Count chofer hours if flagged as operations
    if (s.chofer && s.choferEsOperaciones) {
      totalMin += h.prod;
    }
    // Count custodio hours if flagged as operations (and different from chofer to avoid double-counting)
    if (s.custodio && s.custodioEsOperaciones && s.custodio !== s.chofer) {
      totalMin += h.prod;
    }
  });
  return totalMin;
}
