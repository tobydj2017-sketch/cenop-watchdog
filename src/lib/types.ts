import { getPersonal } from "./personalStore";

export interface PeajeEntry {
  id: string;
  ubicacion: string;
  monto: number;
}

export interface ComisionEntry {
  id: string;
  descripcion: string;
  hora: string;
}

export interface ServicioOperacionesEntry {
  id: string;
  cliente: string;
  descripcion: string;
  hora: string;
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
  fecha: string;
  peajes?: PeajeEntry[];
  comisiones?: ComisionEntry[];
  serviciosOperaciones?: ServicioOperacionesEntry[];
  choferEsOperaciones?: boolean;
  custodioEsOperaciones?: boolean;
  tipoCenopOp?: "ninguno" | "cenop_en_op" | "op_en_cenop";
}

export interface FuelEntry {
  id: string;
  fecha: string;
  movil: string;
  chofer: string;
  monto: number;
  litros: number;
  precioPorLitro: number;
  kilometraje: string;
  numeroRemito: string;
  lugarCarga: string;
  estacion: string;
  ticketImage?: string;
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
