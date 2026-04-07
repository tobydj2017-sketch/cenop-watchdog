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

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m.toString().padStart(2, "0")}:00`;
}
