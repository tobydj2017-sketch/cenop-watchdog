import { ServiceEntry, FuelEntry, isCountableServiceEntry } from "./types";
import { BLOB_KEYS, queueUpload } from "./azureBlob";

const SERVICES_KEY = "cenop_services";
const FUEL_KEY = "cenop_fuel";
const CUTOFF_DATE = "2026-07-01"; // Se descartan cargas anteriores a esta fecha
const PURGE_KEY = "cenop_purged_pre_2026_07_01";

function purgeLegacyData() {
  if (localStorage.getItem(PURGE_KEY)) return;
  const servicesRaw = localStorage.getItem(SERVICES_KEY);
  if (servicesRaw) {
    try {
      const parsed: ServiceEntry[] = JSON.parse(servicesRaw);
      const kept = parsed.filter((s) => (s.fecha || "") >= CUTOFF_DATE);
      localStorage.setItem(SERVICES_KEY, JSON.stringify(kept));
      queueUpload(BLOB_KEYS.services, () => kept.filter(isCountableServiceEntry));
    } catch {
      localStorage.removeItem(SERVICES_KEY);
    }
  }
  const fuelRaw = localStorage.getItem(FUEL_KEY);
  if (fuelRaw) {
    try {
      const parsed: FuelEntry[] = JSON.parse(fuelRaw);
      const kept = parsed.filter((f) => (f.fecha || "") >= CUTOFF_DATE);
      localStorage.setItem(FUEL_KEY, JSON.stringify(kept));
      queueUpload(BLOB_KEYS.fuel, () => kept);
    } catch {
      localStorage.removeItem(FUEL_KEY);
    }
  }
  // Limpiar la vieja bandera de seed para que no reingrese data de 2025
  localStorage.removeItem("cenop_seeded_v2");
  localStorage.setItem(PURGE_KEY, "true");
}

export function getServices(): ServiceEntry[] {
  purgeLegacyData();
  const data = localStorage.getItem(SERVICES_KEY);
  const parsed: ServiceEntry[] = data ? JSON.parse(data) : [];
  return parsed.filter(isCountableServiceEntry).filter((s) => (s.fecha || "") >= CUTOFF_DATE);
}


export function saveServices(entries: ServiceEntry[]) {
  const clean = entries.filter(isCountableServiceEntry);
  localStorage.setItem(SERVICES_KEY, JSON.stringify(clean));
  queueUpload(BLOB_KEYS.services, () => clean);
}

export function addService(entry: ServiceEntry) {
  const entries = getServices();
  entries.push(entry);
  saveServices(entries);
}

export function deleteService(id: string) {
  saveServices(getServices().filter((e) => e.id !== id));
}

export function updateService(entry: ServiceEntry) {
  const entries = getServices().map((e) => (e.id === entry.id ? entry : e));
  saveServices(entries);
}

export function getFuelEntries(): FuelEntry[] {
  const data = localStorage.getItem(FUEL_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveFuelEntries(entries: FuelEntry[]) {
  localStorage.setItem(FUEL_KEY, JSON.stringify(entries));
  queueUpload(BLOB_KEYS.fuel, () => entries);
}

export function addFuelEntry(entry: FuelEntry) {
  const entries = getFuelEntries();
  entries.push(entry);
  saveFuelEntries(entries);
}

export function deleteFuelEntry(id: string) {
  saveFuelEntries(getFuelEntries().filter((e) => e.id !== id));
}
