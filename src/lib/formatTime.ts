const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Get short day name (lun, mar, etc.) from a YYYY-MM-DD date string */
export function getDayAbbr(fecha: string): string {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return DIAS_CORTOS[date.getDay()];
}

/** Format a YYYY-MM-DD date as "DD/MM\ndia" for chart labels */
export function formatDateLabel(fecha: string): string {
  const dd = fecha.slice(8, 10);
  const mm = fecha.slice(5, 7);
  return `${dd}/${mm}`;
}

/** Strip "0 days " prefix and ":00" seconds suffix, returning clean HH:MM */
export function cleanTime(t: string): string {
  if (!t) return "";
  let v = t.replace(/^0 days\s*/, "");
  if (/^\d+:\d{2}:\d{2}$/.test(v)) {
    v = v.replace(/:\d{2}$/, "");
  }
  return v;
}

/** Format minutes as "Xh XXm" */
export function formatHoursMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
