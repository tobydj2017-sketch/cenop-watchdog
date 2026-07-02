// Persistencia editable de móviles (patente, marca, modelo, año, teléfono...).
// Semilla desde MOVILES_INFO + MOVIL_TELEFONO y sincroniza con Azure blob `moviles.json`.

import { BLOB_KEYS, LOCAL_KEYS, queueUpload } from "./azureBlob";
import { MOVILES_INFO } from "./movilesData";
import { MOVILES, MOVIL_TELEFONO } from "./cenopData";

export interface MovilEntry {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number | null;
  consumoIdeal: number | null;
  asignacion: string;
  tipoCombustible: string;
  lugarCarga: string;
  telefono: string;
  activo: boolean;
}

const SEED_KEY = "cenop_moviles_seeded_v1";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function seedMoviles() {
  if (localStorage.getItem(SEED_KEY)) return;
  const existingRaw = localStorage.getItem(LOCAL_KEYS.moviles);
  const existing: MovilEntry[] = (() => {
    try { return existingRaw ? JSON.parse(existingRaw) : []; } catch { return []; }
  })();
  const byPatente = new Map(existing.map((m) => [m.patente, m]));

  const allPatentes = new Set<string>([
    ...MOVILES,
    ...Object.keys(MOVILES_INFO),
    ...existing.map((m) => m.patente),
  ]);

  const merged: MovilEntry[] = [];
  allPatentes.forEach((patente) => {
    const prev = byPatente.get(patente);
    const info = MOVILES_INFO[patente];
    merged.push({
      id: prev?.id || generateId(),
      patente,
      marca: prev?.marca ?? info?.marca ?? "",
      modelo: prev?.modelo ?? info?.modelo ?? "",
      anio: prev?.anio ?? info?.anio ?? null,
      consumoIdeal: prev?.consumoIdeal ?? info?.consumoIdeal ?? null,
      asignacion: prev?.asignacion ?? info?.asignacion ?? "",
      tipoCombustible: prev?.tipoCombustible ?? info?.tipoCombustible ?? "",
      lugarCarga: prev?.lugarCarga ?? info?.lugarCarga ?? "",
      telefono: prev?.telefono ?? MOVIL_TELEFONO[patente] ?? "",
      activo: prev?.activo ?? true,
    });
  });

  merged.sort((a, b) => a.patente.localeCompare(b.patente));
  localStorage.setItem(LOCAL_KEYS.moviles, JSON.stringify(merged));
  localStorage.setItem(SEED_KEY, "true");
}

export function getMoviles(): MovilEntry[] {
  seedMoviles();
  const raw = localStorage.getItem(LOCAL_KEYS.moviles);
  return raw ? JSON.parse(raw) : [];
}

export function saveMoviles(entries: MovilEntry[]) {
  localStorage.setItem(LOCAL_KEYS.moviles, JSON.stringify(entries));
  queueUpload(BLOB_KEYS.moviles, () => entries);
}

export function addMovil(patente: string): MovilEntry {
  const entries = getMoviles();
  const pat = patente.trim().toUpperCase();
  if (entries.some((m) => m.patente === pat)) {
    throw new Error(`Ya existe el móvil ${pat}`);
  }
  const entry: MovilEntry = {
    id: generateId(),
    patente: pat,
    marca: "", modelo: "", anio: null, consumoIdeal: null,
    asignacion: "", tipoCombustible: "", lugarCarga: "", telefono: "",
    activo: true,
  };
  entries.push(entry);
  entries.sort((a, b) => a.patente.localeCompare(b.patente));
  saveMoviles(entries);
  return entry;
}

export function updateMovil(id: string, updates: Partial<Omit<MovilEntry, "id">>) {
  const entries = getMoviles();
  const idx = entries.findIndex((m) => m.id === id);
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], ...updates };
    saveMoviles(entries);
  }
}

export function deleteMovil(id: string) {
  saveMoviles(getMoviles().filter((m) => m.id !== id));
}

export function getMovilByPatente(patente: string): MovilEntry | undefined {
  return getMoviles().find((m) => m.patente === patente);
}

export function getActivePatentes(): string[] {
  return getMoviles().filter((m) => m.activo).map((m) => m.patente);
}
