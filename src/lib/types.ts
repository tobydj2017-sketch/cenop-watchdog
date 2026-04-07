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
}

export interface FuelEntry {
  id: string;
  fecha: string;
  movil: string;
  chofer: string;
  monto: number;
  litros: number;
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
    service.horasProductivas,
    service.horasImproductivas1,
    service.horasImproductivas2,
    service.horasImproductivas,
    service.horasTotales,
  ].some((value) => Boolean(String(value ?? "").trim()));
}

export function getServiceKey(service: Pick<ServiceEntry, "fecha" | "solicitud">): string {
  return `${service.fecha || "sin-fecha"}::${service.solicitud}`;
}

export function getAdjustedHours(s: ServiceEntry): { prod: number; improd: number } {
  const rawProd = timeToMinutes(s.horasProductivas);
  const rawImprod = timeToMinutes(s.horasImproductivas);
  if (isBaseServiceEntry(s)) {
    return { prod: 0, improd: rawProd + rawImprod };
  }
  return { prod: rawProd, improd: rawImprod };
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m.toString().padStart(2, "0")}:00`;
}
