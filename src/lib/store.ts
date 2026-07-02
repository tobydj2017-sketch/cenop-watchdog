import { ServiceEntry, FuelEntry, isCountableServiceEntry } from "./types";
import { BLOB_KEYS, queueUpload, uploadJson } from "./azureBlob";

// Purga única de todas las cargas de combustible (pedido del usuario).
// Se ejecuta DESPUÉS de bootstrapFromAzure para pisar también el remoto.
const FUEL_WIPE_KEY = "cenop_fuel_wiped_v2";
export function wipeFuelIfNeeded() {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(FUEL_WIPE_KEY)) return;
  localStorage.setItem("cenop_fuel", JSON.stringify([]));
  void uploadJson(BLOB_KEYS.fuel, []);
  localStorage.setItem(FUEL_WIPE_KEY, "true");
}

// Renumerar servicios existentes por fecha (1..N ordenados por horaSolicitud)
const RENUM_KEY = "cenop_services_renumbered_v1";
(function renumberServicesOnce() {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(RENUM_KEY)) return;
  const raw = localStorage.getItem("cenop_services");
  if (!raw) { localStorage.setItem(RENUM_KEY, "true"); return; }
  try {
    const list: ServiceEntry[] = JSON.parse(raw);
    const groups = new Map<string, ServiceEntry[]>();
    list.forEach((s) => {
      const key = s.fecha || (s as any).fechaServicio || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });
    groups.forEach((arr) => {
      arr.sort((a, b) => (a.horaSolicitud || "99:99").localeCompare(b.horaSolicitud || "99:99") || (a.id || "").localeCompare(b.id || ""));
      arr.forEach((s, i) => { s.solicitud = i + 1; });
    });
    localStorage.setItem("cenop_services", JSON.stringify(list));
    void uploadJson(BLOB_KEYS.services, list);
    localStorage.setItem(RENUM_KEY, "true");
  } catch { /* ignore */ }
})();

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
