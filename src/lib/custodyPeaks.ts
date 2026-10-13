import { getServiceKey, isCountableServiceEntry, ServiceEntry } from "./types";

export type CustodyShift = "dia" | "noche" | "sin-horario";
export type CustodyShiftFilter = "todos" | "dia" | "noche";

export interface CustodyPeakDay {
  fecha: string;
  fechaLabel: string;
  diaSemana: string;
  dia: number;
  noche: number;
  sinHorario: number;
  total: number;
}

const DAY_START_MINUTES = 6 * 60;
const NIGHT_START_MINUTES = 18 * 60;
const TIME_FIELDS: (keyof ServiceEntry)[] = [
  "iniciaServicio",
  "salidaCenop",
  "llegadaServicio",
  "citaCustodio",
  "citaChofer",
  "horaSolicitud",
];

function parseTimeMinutes(value: unknown): number | null {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function classifyCustodyShift(entries: ServiceEntry[]): CustodyShift {
  for (const field of TIME_FIELDS) {
    for (const entry of entries) {
      const minutes = parseTimeMinutes(entry[field]);
      if (minutes === null) continue;
      return minutes >= DAY_START_MINUTES && minutes < NIGHT_START_MINUTES ? "dia" : "noche";
    }
  }
  return "sin-horario";
}

function formatDate(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { fechaLabel: fecha || "Sin fecha", diaSemana: "—" };
  const date = new Date(`${fecha}T12:00:00`);
  return {
    fechaLabel: new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date),
    diaSemana: new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(date),
  };
}

export function buildCustodyPeakDays(services: ServiceEntry[]): CustodyPeakDay[] {
  const servicesByKey = new Map<string, ServiceEntry[]>();

  services.forEach((service) => {
    if (!isCountableServiceEntry(service)) return;
    const key = getServiceKey(service);
    const entries = servicesByKey.get(key) || [];
    entries.push(service);
    servicesByKey.set(key, entries);
  });

  const days = new Map<string, CustodyPeakDay>();
  servicesByKey.forEach((entries) => {
    const fecha = entries[0]?.fecha || "sin-fecha";
    const formatted = formatDate(fecha);
    const day = days.get(fecha) || {
      fecha,
      ...formatted,
      dia: 0,
      noche: 0,
      sinHorario: 0,
      total: 0,
    };
    const shift = classifyCustodyShift(entries);
    if (shift === "dia") day.dia += 1;
    else if (shift === "noche") day.noche += 1;
    else day.sinHorario += 1;
    day.total += 1;
    days.set(fecha, day);
  });

  return [...days.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function custodyCountForFilter(day: CustodyPeakDay, filter: CustodyShiftFilter): number {
  if (filter === "dia") return day.dia;
  if (filter === "noche") return day.noche;
  return day.total;
}

export function rankCustodyPeakDays(days: CustodyPeakDay[], filter: CustodyShiftFilter): CustodyPeakDay[] {
  return days
    .filter((day) => custodyCountForFilter(day, filter) > 0)
    .slice()
    .sort((a, b) => custodyCountForFilter(b, filter) - custodyCountForFilter(a, filter) || b.fecha.localeCompare(a.fecha));
}
