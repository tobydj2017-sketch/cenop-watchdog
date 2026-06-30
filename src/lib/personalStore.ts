import { PERSONAL } from "./cenopData";
import { BLOB_KEYS, queueUpload } from "./azureBlob";

export type PersonalRole = "chofer" | "custodio" | "playero" | "operaciones";

export interface PersonalEntry {
  id: string;
  nombre: string;
  roles: PersonalRole[];
  activo: boolean;
}

const PERSONAL_KEY = "cenop_personal";
const SEED_PERSONAL_KEY = "cenop_personal_seeded_v1";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function seedPersonal() {
  if (!localStorage.getItem(SEED_PERSONAL_KEY)) {
    const existing: PersonalEntry[] = (() => {
      try { return JSON.parse(localStorage.getItem(PERSONAL_KEY) || "[]"); } catch { return []; }
    })();
    const existingMap = new Map(existing.map((e) => [e.nombre, e]));
    const merged: PersonalEntry[] = PERSONAL.map((nombre) => {
      const prev = existingMap.get(nombre);
      return prev || { id: generateId(), nombre, roles: [], activo: true };
    });
    // Keep any extra entries the user added that aren't in PERSONAL
    existing.forEach((e) => {
      if (!PERSONAL.includes(e.nombre)) merged.push(e);
    });
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(merged));
    localStorage.setItem(SEED_PERSONAL_KEY, "true");
  }
}

export function getPersonal(): PersonalEntry[] {
  seedPersonal();
  const data = localStorage.getItem(PERSONAL_KEY);
  return data ? JSON.parse(data) : [];
}

export function savePersonal(entries: PersonalEntry[]) {
  localStorage.setItem(PERSONAL_KEY, JSON.stringify(entries));
}

export function addPersonal(nombre: string, roles: PersonalRole[]): PersonalEntry {
  const entries = getPersonal();
  const entry: PersonalEntry = { id: generateId(), nombre: nombre.toUpperCase().trim(), roles, activo: true };
  entries.push(entry);
  savePersonal(entries);
  return entry;
}

export function updatePersonal(id: string, updates: Partial<Pick<PersonalEntry, "nombre" | "roles" | "activo">>) {
  const entries = getPersonal();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], ...updates };
    savePersonal(entries);
  }
}

export function deletePersonal(id: string) {
  savePersonal(getPersonal().filter((e) => e.id !== id));
}

export function getPersonalByRole(role: PersonalRole): PersonalEntry[] {
  return getPersonal().filter((p) => p.activo && p.roles.includes(role));
}

export function getActivePersonalNames(): string[] {
  return getPersonal().filter((p) => p.activo).map((p) => p.nombre);
}

export const ROLE_LABELS: Record<PersonalRole, string> = {
  chofer: "Chofer",
  custodio: "Custodio",
  playero: "Playero",
  operaciones: "Operaciones",
};

export const ALL_ROLES: PersonalRole[] = ["chofer", "custodio", "playero", "operaciones"];
