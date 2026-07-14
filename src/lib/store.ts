import { ServiceEntry, FuelEntry, isCountableServiceEntry, computeServiceHours } from "./types";
import { BLOB_KEYS, queueUploadMerged, uploadJson, addTombstone } from "./azureBlob";

// La purga única ya se ejecutó en su momento. Este stub queda para no
// romper imports existentes, pero NO debe borrar nada: hacerlo por navegador
// hacía que cada sesión nueva subiera un fuel.json vacío a Azure y borrara
// las cargas de todos los demás.
export function wipeFuelIfNeeded() {
  return;
}

const SERVICES_KEY = "cenop_services";
const FUEL_KEY = "cenop_fuel";
// Descartar solo cargas de 2025 o anteriores (mantener todo 2026+)
const CUTOFF_DATE = "2026-01-01";

function isLegacy(fecha: string | undefined): boolean {
  return !!fecha && fecha < CUTOFF_DATE;
}

// Renumeración determinística: mismo input -> mismo N° en cualquier navegador.
// Se ordena por horaSolicitud y luego por id para desempatar de forma estable.
function renumberDeterministic(list: ServiceEntry[]): ServiceEntry[] {
  const groups = new Map<string, ServiceEntry[]>();
  list.forEach((s) => {
    const key = s.fecha || (s as any).fechaServicio || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  });
  groups.forEach((arr) => {
    arr.sort((a, b) =>
      (a.horaSolicitud || "99:99").localeCompare(b.horaSolicitud || "99:99") ||
      (a.id || "").localeCompare(b.id || "")
    );
    arr.forEach((s, i) => { s.solicitud = i + 1; });
  });
  return list;
}

function recomputeHours(list: ServiceEntry[]): ServiceEntry[] {
  return list.map((s) => ({ ...s, ...computeServiceHours(s) }));
}

export function getServices(): ServiceEntry[] {
  const data = localStorage.getItem(SERVICES_KEY);
  const parsed: ServiceEntry[] = data ? JSON.parse(data) : [];
  const filtered = parsed.filter(isCountableServiceEntry).filter((s) => !isLegacy(s.fecha));
  return renumberDeterministic(recomputeHours(filtered));
}

export function saveServices(entries: ServiceEntry[]) {
  const clean = renumberDeterministic(
    entries.filter(isCountableServiceEntry).filter((s) => !isLegacy(s.fecha))
  );
  localStorage.setItem(SERVICES_KEY, JSON.stringify(clean));
  // Merge con remoto antes de subir para no pisar cargas de otros navegadores.
  queueUploadMerged<ServiceEntry>(
    BLOB_KEYS.services,
    () => JSON.parse(localStorage.getItem(SERVICES_KEY) || "[]"),
    (merged) => {
      const finalList = renumberDeterministic(
        merged.filter(isCountableServiceEntry).filter((s) => !isLegacy(s.fecha))
      );
      localStorage.setItem(SERVICES_KEY, JSON.stringify(finalList));
      window.dispatchEvent(new Event("cenop:services-synced"));
    },
  );
}

export function addService(entry: ServiceEntry) {
  const entries = getServices();
  entries.push(entry);
  saveServices(entries);
}

export function deleteService(id: string) {
  addTombstone(BLOB_KEYS.services, id);
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
  const payload = JSON.stringify(entries);
  try {
    localStorage.setItem(FUEL_KEY, payload);
  } catch (err) {
    const isQuotaError =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
    if (!isQuotaError) throw err;

    const trimmed = entries.map((entry) => ({ ...entry, ticketImage: undefined }));
    localStorage.setItem(FUEL_KEY, JSON.stringify(trimmed));
    queueUploadMerged<FuelEntry>(
      BLOB_KEYS.fuel,
      () => JSON.parse(localStorage.getItem(FUEL_KEY) || "[]"),
      (merged) => {
        const finalList = merged.filter((f) => !isLegacy(f.fecha));
        localStorage.setItem(FUEL_KEY, JSON.stringify(finalList));
        window.dispatchEvent(new Event("cenop:fuel-synced"));
      },
    );
    window.dispatchEvent(new Event("cenop:fuel-synced"));
    console.warn("[Combustible] localStorage sin espacio: la carga se guardó sin foto de ticket.");
    return;
  }
  queueUploadMerged<FuelEntry>(
    BLOB_KEYS.fuel,
    () => JSON.parse(localStorage.getItem(FUEL_KEY) || "[]"),
    (merged) => {
      const finalList = merged.filter((f) => !isLegacy(f.fecha));
      localStorage.setItem(FUEL_KEY, JSON.stringify(finalList));
      window.dispatchEvent(new Event("cenop:fuel-synced"));
    },
  );
}

export function addFuelEntry(entry: FuelEntry) {
  const entries = getFuelEntries();
  entries.push(entry);
  saveFuelEntries(entries);
}

export function deleteFuelEntry(id: string) {
  addTombstone(BLOB_KEYS.fuel, id);
  saveFuelEntries(getFuelEntries().filter((e) => e.id !== id));
}

export function updateFuelEntry(entry: FuelEntry) {
  const entries = getFuelEntries().map((e) => (e.id === entry.id ? entry : e));
  saveFuelEntries(entries);
}
