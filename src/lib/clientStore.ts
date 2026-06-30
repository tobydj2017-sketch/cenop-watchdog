import { CLIENTES } from "./cenopData";
import { BLOB_KEYS, queueUpload } from "./azureBlob";

export interface ClientEntry {
  id: string;
  nombre: string;
  activo: boolean;
}

const CLIENTS_KEY = "cenop_clientes";
const SEED_KEY = "cenop_clientes_seeded_v1";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function seedClients() {
  if (!localStorage.getItem(SEED_KEY)) {
    const existing: ClientEntry[] = (() => {
      try { return JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]"); } catch { return []; }
    })();
    const existingMap = new Map(existing.map((e) => [e.nombre, e]));
    const merged: ClientEntry[] = CLIENTES.map((nombre) => {
      const prev = existingMap.get(nombre);
      return prev || { id: generateId(), nombre, activo: true };
    });
    existing.forEach((e) => {
      if (!CLIENTES.includes(e.nombre)) merged.push(e);
    });
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(merged));
    localStorage.setItem(SEED_KEY, "true");
  }
}

export function getClients(): ClientEntry[] {
  seedClients();
  const data = localStorage.getItem(CLIENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getActiveClientNames(): string[] {
  return getClients().filter((c) => c.activo).map((c) => c.nombre);
}

export function saveClients(entries: ClientEntry[]) {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(entries));
}

export function addClient(nombre: string): ClientEntry {
  const entries = getClients();
  const entry: ClientEntry = { id: generateId(), nombre: nombre.toUpperCase().trim(), activo: true };
  entries.push(entry);
  saveClients(entries);
  return entry;
}

export function updateClient(id: string, updates: Partial<Pick<ClientEntry, "nombre" | "activo">>) {
  const entries = getClients();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], ...updates };
    saveClients(entries);
  }
}

export function deleteClient(id: string) {
  saveClients(getClients().filter((e) => e.id !== id));
}
