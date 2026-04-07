import { ServiceEntry, FuelEntry, isCountableServiceEntry } from "./types";
import { DECEMBER_2025_DATA } from "./seedData";

const SERVICES_KEY = "cenop_services";
const FUEL_KEY = "cenop_fuel";
const SEED_KEY = "cenop_seeded_v2";

function ensureSeed() {
  if (!localStorage.getItem(SEED_KEY)) {
    const existing = localStorage.getItem(SERVICES_KEY);
    const current: ServiceEntry[] = existing ? JSON.parse(existing) : [];
    const merged = [...DECEMBER_2025_DATA, ...current];
    localStorage.setItem(SERVICES_KEY, JSON.stringify(merged));
    localStorage.setItem(SEED_KEY, "true");
  }
}

export function getServices(): ServiceEntry[] {
  ensureSeed();
  const data = localStorage.getItem(SERVICES_KEY);
  const parsed: ServiceEntry[] = data ? JSON.parse(data) : [];
  return parsed.filter(isCountableServiceEntry);
}

export function saveServices(entries: ServiceEntry[]) {
  localStorage.setItem(SERVICES_KEY, JSON.stringify(entries.filter(isCountableServiceEntry)));
}

export function addService(entry: ServiceEntry) {
  const entries = getServices();
  entries.push(entry);
  saveServices(entries);
}

export function deleteService(id: string) {
  saveServices(getServices().filter((e) => e.id !== id));
}

export function getFuelEntries(): FuelEntry[] {
  const data = localStorage.getItem(FUEL_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveFuelEntries(entries: FuelEntry[]) {
  localStorage.setItem(FUEL_KEY, JSON.stringify(entries));
}

export function addFuelEntry(entry: FuelEntry) {
  const entries = getFuelEntries();
  entries.push(entry);
  saveFuelEntries(entries);
}

export function deleteFuelEntry(id: string) {
  saveFuelEntries(getFuelEntries().filter((e) => e.id !== id));
}
