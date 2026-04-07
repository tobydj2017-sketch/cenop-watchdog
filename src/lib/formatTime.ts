/** Strip "0 days " prefix and ":00" seconds suffix, returning clean HH:MM */
export function cleanTime(t: string): string {
  if (!t) return "";
  let v = t.replace(/^0 days\s*/, "");
  // If format is H:MM:SS, strip seconds
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
