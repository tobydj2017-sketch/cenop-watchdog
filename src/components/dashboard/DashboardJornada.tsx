import { useMemo, useState } from "react";
import { ServiceEntry, getServiceKey, timeToMinutes } from "@/lib/types";
import { formatHoursMinutes, getDayAbbr } from "@/lib/formatTime";
import { getServiceSegments, ServiceTimeline, SEGMENT_LEGEND, ServiceSegment } from "@/lib/serviceSegments";
import { StatCard } from "./DashboardResumen";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  services: ServiceEntry[];
}

/* ─── Mini Gantt bar for a single service ─── */
function GanttBar({ timeline }: { timeline: ServiceTimeline }) {
  const total = timeline.totalMinutes;
  if (total === 0) return <span className="text-xs text-muted-foreground italic">Sin datos</span>;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-6 rounded overflow-hidden w-full min-w-[180px]">
        {timeline.segments.map((seg, i) => {
          const pct = (seg.minutes / total) * 100;
          if (pct < 1) return null;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className="h-full relative flex items-center justify-center text-[9px] font-mono text-white font-semibold cursor-default transition-opacity hover:opacity-80"
                  style={{ width: `${pct}%`, backgroundColor: seg.color, minWidth: pct > 5 ? undefined : "4px" }}
                >
                  {pct > 12 && formatHoursMinutes(seg.minutes)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-semibold">{seg.label}</p>
                <p className="font-mono">{seg.start} → {seg.end}</p>
                <p className="font-mono">{formatHoursMinutes(seg.minutes)} ({seg.type})</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

/* ─── Segment breakdown table for one timeline ─── */
function SegmentTable({ segments }: { segments: ServiceSegment[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border/50">
          {["Etapa", "Desde", "Hasta", "Duración", "Tipo"].map(c => (
            <th key={c} className="px-2 py-1.5 text-left text-muted-foreground uppercase tracking-wider font-semibold">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {segments.map((seg, i) => (
          <tr key={i} className="border-b border-border/30">
            <td className="px-2 py-1.5 font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: seg.color }} />
              {seg.label}
            </td>
            <td className="px-2 py-1.5 font-mono">{seg.start}</td>
            <td className="px-2 py-1.5 font-mono">{seg.end}</td>
            <td className="px-2 py-1.5 font-mono font-semibold">{formatHoursMinutes(seg.minutes)}</td>
            <td className={`px-2 py-1.5 font-semibold ${seg.type === "productivo" ? "text-success" : "text-destructive"}`}>
              {seg.type === "productivo" ? "Productivo" : "Improductivo"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── Person-day summary ─── */
interface PersonDaySummary {
  nombre: string;
  fecha: string;
  dia: string;
  label: string;
  servicios: number;
  clientes: string[];
  totalBase: number;
  totalTraslado: number;
  totalEspera: number;
  totalServicio: number;
  totalProd: number;
  totalImprod: number;
  totalMinutes: number;
  timelines: ServiceTimeline[];
}

export default function DashboardJornada({ services }: Props) {
  const [search, setSearch] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const personDays = useMemo((): PersonDaySummary[] => {
    const map: Record<string, {
      timelines: ServiceTimeline[];
      clientes: Set<string>;
      solicitudes: Set<string>;
      base: number; traslado: number; espera: number; servicio: number;
      prod: number; improd: number;
    }> = {};

    services.forEach(s => {
      const tl = getServiceSegments(s);
      const names = [s.chofer, s.custodio].filter(Boolean);
      names.forEach(name => {
        if (!name || !s.fecha) return;
        const key = `${name}::${s.fecha}`;
        if (!map[key]) map[key] = { timelines: [], clientes: new Set(), solicitudes: new Set(), base: 0, traslado: 0, espera: 0, servicio: 0, prod: 0, improd: 0 };
        const entry = map[key];
        const serviceKey = getServiceKey(s);
        if (!entry.solicitudes.has(serviceKey)) {
          entry.solicitudes.add(serviceKey);
          entry.timelines.push(tl);
          entry.clientes.add(tl.cliente);
          tl.segments.forEach(seg => {
            if (seg.label.includes("Base") || seg.label.includes("Permanencia")) entry.base += seg.minutes;
            else if (seg.label.includes("Traslado")) entry.traslado += seg.minutes;
            else if (seg.label.includes("Espera")) entry.espera += seg.minutes;
            else if (seg.label.includes("Servicio")) entry.servicio += seg.minutes;
          });
          entry.prod += tl.totalProd;
          entry.improd += tl.totalImprod;
        }
      });
    });

    return Object.entries(map)
      .map(([key, v]) => {
        const [nombre, fecha] = key.split("::");
        return {
          nombre,
          fecha,
          dia: getDayAbbr(fecha),
          label: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`,
          servicios: v.solicitudes.size,
          clientes: [...v.clientes],
          totalBase: v.base,
          totalTraslado: v.traslado,
          totalEspera: v.espera,
          totalServicio: v.servicio,
          totalProd: v.prod,
          totalImprod: v.improd,
          totalMinutes: v.prod + v.improd,
          timelines: v.timelines,
        };
      })
      .filter(p => p.totalMinutes > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre) || a.fecha.localeCompare(b.fecha));
  }, [services]);

  const filtered = personDays.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.clientes.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  // Global KPIs — totals, not averages
  const totalProdAll = filtered.reduce((a, p) => a + p.totalProd, 0);
  const totalImprodAll = filtered.reduce((a, p) => a + p.totalImprod, 0);
  const totalMinutesAll = filtered.reduce((a, p) => a + p.totalMinutes, 0);
  const totalTraslado = filtered.reduce((a, p) => a + p.totalTraslado, 0);
  const totalBase = filtered.reduce((a, p) => a + p.totalBase, 0);
  const totalServicio = filtered.reduce((a, p) => a + p.totalServicio, 0);
  const totalEspera = filtered.reduce((a, p) => a + p.totalEspera, 0);
  const eficPct = totalMinutesAll > 0 ? Math.round((totalProdAll / totalMinutesAll) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Cómo se compone la jornada de trabajo
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Cada servicio se descompone en etapas. Solo el <strong className="text-success">Servicio Activo</strong> (tiempo efectivo con el cliente) es productivo. 
          El resto — permanencia en base, traslados, y esperas — son <strong className="text-destructive">improductivos</strong> porque no generan ingresos directos.
        </p>
        <div className="flex flex-wrap gap-3">
          {SEGMENT_LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
              <span>{l.label}</span>
              <span className={`text-[10px] ${l.type === "productivo" ? "text-success" : "text-destructive"}`}>
                ({l.type === "productivo" ? "PROD" : "IMPROD"})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Eficiencia Productiva" value={`${eficPct}%`} />
        <StatCard label="Total Productivo" value={formatHoursMinutes(totalProdAll)} />
        <StatCard label="Total Improductivo" value={formatHoursMinutes(totalImprodAll)} />
        <StatCard label="Total Jornada" value={formatHoursMinutes(totalMinutesAll)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Servicio Activo" value={formatHoursMinutes(totalServicio)} />
        <StatCard label="Total Espera" value={formatHoursMinutes(totalEspera)} />
        <StatCard label="Total Traslado" value={formatHoursMinutes(totalTraslado)} />
        <StatCard label="Total En Base" value={formatHoursMinutes(totalBase)} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por persona o cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 w-72 text-xs"
        />
      </div>

      {/* Table with Gantt */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                {["Personal", "Fecha", "Día", "Serv.", "Cliente(s)", "En Base", "Traslado", "Espera", "Servicio", "Total", "Efic.", "Timeline", ""].map(c => (
                  <th key={c} className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const key = `${p.nombre}::${p.fecha}`;
                const isExpanded = expandedKey === key;
                const efic = p.totalMinutes > 0 ? Math.round((p.totalProd / p.totalMinutes) * 100) : 0;
                return (
                  <>
                    <tr
                      key={key}
                      className={`border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors ${isExpanded ? "bg-secondary/20" : ""}`}
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                    >
                      <td className="px-2 py-2 text-xs font-semibold whitespace-nowrap">{p.nombre}</td>
                      <td className="px-2 py-2 text-xs font-mono">{p.label}</td>
                      <td className="px-2 py-2 text-xs text-muted-foreground italic capitalize">{p.dia}</td>
                      <td className="px-2 py-2 text-xs font-mono">{p.servicios}</td>
                      <td className="px-2 py-2 text-xs max-w-[120px] truncate" title={p.clientes.join(", ")}>{p.clientes.join(", ")}</td>
                      <td className="px-2 py-2 text-xs font-mono text-muted-foreground">{formatHoursMinutes(p.totalBase)}</td>
                      <td className="px-2 py-2 text-xs font-mono" style={{ color: "hsl(38, 92%, 50%)" }}>{formatHoursMinutes(p.totalTraslado)}</td>
                      <td className="px-2 py-2 text-xs font-mono" style={{ color: "hsl(280, 60%, 55%)" }}>{formatHoursMinutes(p.totalEspera)}</td>
                      <td className="px-2 py-2 text-xs font-mono text-success font-semibold">{formatHoursMinutes(p.totalServicio)}</td>
                      <td className="px-2 py-2 text-xs font-mono">{formatHoursMinutes(p.totalMinutes)}</td>
                      <td className="px-2 py-2 text-xs font-mono font-semibold">
                        <span className={efic >= 70 ? "text-success" : efic >= 40 ? "text-primary" : "text-destructive"}>{efic}%</span>
                      </td>
                      <td className="px-2 py-2 min-w-[180px] max-w-[300px]">
                        {/* Stacked mini gantt for the whole day */}
                        <div className="flex h-5 rounded overflow-hidden">
                          {[
                            { min: p.totalBase, color: SEGMENT_LEGEND[0].color },
                            { min: p.totalTraslado, color: SEGMENT_LEGEND[1].color },
                            { min: p.totalEspera, color: SEGMENT_LEGEND[2].color },
                            { min: p.totalServicio, color: SEGMENT_LEGEND[3].color },
                          ].filter(x => x.min > 0).map((x, i) => (
                            <div
                              key={i}
                              className="h-full"
                              style={{ width: `${(x.min / p.totalMinutes) * 100}%`, backgroundColor: x.color, minWidth: "3px" }}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${key}-detail`}>
                        <td colSpan={13} className="p-0">
                          <div className="bg-secondary/10 border-y border-border/50 p-4 space-y-4">
                            {p.timelines.map((tl, idx) => (
                              <div key={idx} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    Servicio #{tl.solicitud} — {tl.cliente}
                                  </span>
                                  {tl.chofer && <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded">Chofer: {tl.chofer}</span>}
                                  {tl.custodio && <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded">Custodio: {tl.custodio}</span>}
                                </div>
                                <GanttBar timeline={tl} />
                                <SegmentTable segments={tl.segments} />
                              </div>
                            ))}

                            {/* Day totals */}
                            <div className="border-t border-border/50 pt-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resumen del Día</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                {[
                                  { label: "En Base", value: p.totalBase, color: SEGMENT_LEGEND[0].color },
                                  { label: "Traslado", value: p.totalTraslado, color: SEGMENT_LEGEND[1].color },
                                  { label: "Espera", value: p.totalEspera, color: SEGMENT_LEGEND[2].color },
                                  { label: "Servicio Activo", value: p.totalServicio, color: SEGMENT_LEGEND[3].color },
                                ].map(item => (
                                  <div key={item.label} className="rounded-md border border-border/50 p-2 text-center">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5 flex items-center justify-center gap-1">
                                      {item.color && <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: item.color }} />}
                                      {item.label}
                                    </span>
                                    <span className="text-sm font-bold font-mono">{formatHoursMinutes(item.value)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-md border border-success/30 bg-success/5 p-2 text-center">
                                  <span className="text-[10px] text-success uppercase tracking-wider block mb-0.5 font-semibold">Total Productivo</span>
                                  <span className="text-sm font-bold font-mono text-success">{formatHoursMinutes(p.totalProd)}</span>
                                </div>
                                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-center">
                                  <span className="text-[10px] text-destructive uppercase tracking-wider block mb-0.5 font-semibold">Total Improductivo</span>
                                  <span className="text-sm font-bold font-mono text-destructive">{formatHoursMinutes(p.totalImprod)}</span>
                                </div>
                                <div className="rounded-md border border-border/50 p-2 text-center">
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5 font-semibold">Total Jornada</span>
                                  <span className="text-sm font-bold font-mono">{formatHoursMinutes(p.totalMinutes)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
