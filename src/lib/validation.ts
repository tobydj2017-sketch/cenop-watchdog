import { ServiceEntry, FuelEntry, timeToMinutes } from "./types";

/** Validate YYYY-MM-DD is an actual existing date in a reasonable range. */
export function isValidDate(s: string): boolean {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function isFutureDate(s: string): boolean {
  if (!isValidDate(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(y, m - 1, d).getTime() > today.getTime();
}

/** Validate HH:MM time string (24h). */
export function isValidTime(s: string): boolean {
  if (!s) return true; // empty allowed; checked separately
  if (!/^\d{1,2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(":").map(Number);
  return h >= 0 && h < 24 && m >= 0 && m < 60;
}

type Span = [number, number];

function serviceSpan(s: Pick<ServiceEntry, "salidaCenop" | "citaChofer" | "citaCustodio" | "iniciaServicio" | "llegadaCenop" | "horaFrancoChofer" | "horaFrancoCustodio" | "finalizaServicio">): Span | null {
  const start = s.salidaCenop || s.citaChofer || s.citaCustodio || s.iniciaServicio;
  const end = s.llegadaCenop || s.horaFrancoChofer || s.horaFrancoCustodio || s.finalizaServicio;
  if (!start || !end) return null;
  let sm = timeToMinutes(start);
  let em = timeToMinutes(end);
  if (em <= sm) em += 1440;
  return [sm, em];
}

function overlap(a: Span, b: Span): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

export interface CollisionIssue {
  type: "persona" | "movil";
  who: string;
  rol?: "chofer" | "custodio" | "móvil";
  conflictoConSolicitud: number;
}

/**
 * Check for person/vehicle scheduling overlap on the same date.
 * Excludes the service with the same id from comparison (for edits).
 */
export function findServiceCollisions(
  candidate: ServiceEntry,
  existing: ServiceEntry[],
): CollisionIssue[] {
  const issues: CollisionIssue[] = [];
  const span = serviceSpan(candidate);
  if (!span) return issues;
  const sameDay = existing.filter((s) => s.id !== candidate.id && s.fecha === candidate.fecha);
  for (const other of sameDay) {
    const otherSpan = serviceSpan(other);
    if (!otherSpan || !overlap(span, otherSpan)) continue;
    if (candidate.chofer && (other.chofer === candidate.chofer || other.custodio === candidate.chofer)) {
      issues.push({ type: "persona", who: candidate.chofer, rol: "chofer", conflictoConSolicitud: other.solicitud });
    }
    if (candidate.custodio && candidate.custodio !== candidate.chofer && (other.chofer === candidate.custodio || other.custodio === candidate.custodio)) {
      issues.push({ type: "persona", who: candidate.custodio, rol: "custodio", conflictoConSolicitud: other.solicitud });
    }
    if (candidate.movil && other.movil === candidate.movil) {
      issues.push({ type: "movil", who: candidate.movil, rol: "móvil", conflictoConSolicitud: other.solicitud });
    }
  }
  return issues;
}

export function formatCollisionMessages(issues: CollisionIssue[]): string[] {
  return issues.map((i) =>
    i.type === "persona"
      ? `${i.who} ya está asignado como ${i.rol === "chofer" ? "chofer/custodio" : "chofer/custodio"} en la solicitud #${i.conflictoConSolicitud} en un horario que se superpone.`
      : `El móvil ${i.who} ya está en uso en la solicitud #${i.conflictoConSolicitud} en un horario que se superpone.`,
  );
}

/** Fuel: same móvil same fecha+hora exact duplicate. */
export function findFuelDuplicate(candidate: FuelEntry, existing: FuelEntry[]): FuelEntry | null {
  return (
    existing.find(
      (f) =>
        f.id !== candidate.id &&
        f.movil === candidate.movil &&
        f.fecha === candidate.fecha &&
        (f.hora || "") === (candidate.hora || ""),
    ) || null
  );
}
