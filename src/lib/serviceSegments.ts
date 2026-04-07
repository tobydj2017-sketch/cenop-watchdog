import { ServiceEntry, timeToMinutes, normalizeClientName, isBaseServiceEntry } from "./types";

export interface ServiceSegment {
  label: string;
  start: string;
  end: string;
  minutes: number;
  type: "productivo" | "improductivo";
  color: string;
}

export interface ServiceTimeline {
  solicitud: number;
  fecha: string;
  cliente: string;
  chofer: string;
  custodio: string;
  movil: string;
  segments: ServiceSegment[];
  totalProd: number;
  totalImprod: number;
  totalMinutes: number;
}

const SEGMENT_COLORS = {
  base: "hsl(var(--muted))",
  traslado: "hsl(38, 92%, 50%)",
  espera: "hsl(280, 60%, 55%)",
  servicio: "hsl(142, 70%, 45%)",
  vuelta: "hsl(200, 70%, 50%)",
  franco: "hsl(0, 0%, 50%)",
};

function seg(label: string, start: string, end: string, type: "productivo" | "improductivo", color: string): ServiceSegment | null {
  if (!start || !end) return null;
  const mins = timeToMinutes(end) - timeToMinutes(start);
  if (mins <= 0) return null;
  return { label, start, end, minutes: mins, type, color };
}

export function getServiceSegments(s: ServiceEntry): ServiceTimeline {
  const isBase = isBaseServiceEntry(s);
  const segments: ServiceSegment[] = [];

  // For chofer: citaChofer → salidaCenop (en base)
  const citaTime = s.citaChofer || s.citaCustodio;
  if (citaTime && s.salidaCenop) {
    const r = seg("En Base (pre)", citaTime, s.salidaCenop, "improductivo", SEGMENT_COLORS.base);
    if (r) segments.push(r);
  }

  // salidaCenop → llegadaServicio (traslado ida)
  if (s.salidaCenop && s.llegadaServicio) {
    const r = seg("Traslado Ida", s.salidaCenop, s.llegadaServicio, "productivo", SEGMENT_COLORS.traslado);
    if (r) segments.push(r);
  }

  // llegadaServicio → iniciaServicio (espera en lugar de servicio = productivo)
  if (s.llegadaServicio && s.iniciaServicio) {
    const r = seg("Espera en Origen", s.llegadaServicio, s.iniciaServicio, "productivo", SEGMENT_COLORS.espera);
    if (r) segments.push(r);
  }

  // iniciaServicio → finalizaServicio (servicio activo)
  if (s.iniciaServicio && s.finalizaServicio) {
    const r = seg(
      isBase ? "Permanencia Base" : "Servicio Activo",
      s.iniciaServicio,
      s.finalizaServicio,
      isBase ? "improductivo" : "productivo",
      isBase ? SEGMENT_COLORS.base : SEGMENT_COLORS.servicio
    );
    if (r) segments.push(r);
  }

  // finalizaServicio → llegadaCenop (traslado vuelta)
  if (s.finalizaServicio && s.llegadaCenop) {
    const r = seg("Traslado Vuelta", s.finalizaServicio, s.llegadaCenop, "productivo", SEGMENT_COLORS.vuelta);
    if (r) segments.push(r);
  }

  // llegadaCenop → horaFranco (en base post)
  const francoTime = s.horaFrancoChofer || s.horaFrancoCustodio;
  if (s.llegadaCenop && francoTime) {
    const r = seg("En Base (post)", s.llegadaCenop, francoTime, "improductivo", SEGMENT_COLORS.base);
    if (r) segments.push(r);
  }

  const totalProd = segments.filter(s => s.type === "productivo").reduce((a, s) => a + s.minutes, 0);
  const totalImprod = segments.filter(s => s.type === "improductivo").reduce((a, s) => a + s.minutes, 0);

  return {
    solicitud: s.solicitud,
    fecha: s.fecha,
    cliente: normalizeClientName(s.cliente),
    chofer: s.chofer || "",
    custodio: s.custodio || "",
    movil: s.movil || "",
    segments,
    totalProd,
    totalImprod,
    totalMinutes: totalProd + totalImprod,
  };
}

export const SEGMENT_LEGEND = [
  { label: "En Base", color: SEGMENT_COLORS.base, type: "improductivo" as const },
  { label: "Traslado Ida", color: SEGMENT_COLORS.traslado, type: "productivo" as const },
  { label: "Espera", color: SEGMENT_COLORS.espera, type: "productivo" as const },
  { label: "Servicio Activo", color: SEGMENT_COLORS.servicio, type: "productivo" as const },
  { label: "Traslado Vuelta", color: SEGMENT_COLORS.vuelta, type: "productivo" as const },
];
