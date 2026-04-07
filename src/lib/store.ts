import { ServiceEntry, FuelEntry } from "./types";

const SERVICES_KEY = "cenop_services";
const FUEL_KEY = "cenop_fuel";

export function getServices(): ServiceEntry[] {
  const data = localStorage.getItem(SERVICES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveServices(entries: ServiceEntry[]) {
  localStorage.setItem(SERVICES_KEY, JSON.stringify(entries));
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
