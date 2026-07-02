import { ServiceEntry, FuelEntry, isCountableServiceEntry } from "./types";
import { BLOB_KEYS, queueUpload } from "./azureBlob";

const SERVICES_KEY = "cenop_services";
const FUEL_KEY = "cenop_fuel";
// Descartar solo cargas de 2025 o anteriores (mantener todo 2026+)
const CUTOFF_DATE = "2026-01-01";

function isLegacy(fecha: string | undefined): boolean {
  return !!fecha && fecha < CUTOFF_DATE;
}

export function getServices(): ServiceEntry[] {
  const data = localStorage.getItem(SERVICES_KEY);
  const parsed: ServiceEntry[] = data ? JSON.parse(data) : [];
  return parsed.filter(isCountableServiceEntry).filter((s) => !isLegacy(s.fecha));
}


export function saveServices(entries: ServiceEntry[]) {
  const clean = entries.filter(isCountableServiceEntry).filter((s) => !isLegacy(s.fecha));
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
  const parsed: FuelEntry[] = data ? JSON.parse(data) : [];
  return parsed.filter((f) => !isLegacy(f.fecha));
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
