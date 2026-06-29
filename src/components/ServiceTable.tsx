import { useState } from "react";
import { getServiceKey, ServiceEntry, timeToMinutes } from "@/lib/types";
import { ArrowDownUp, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanTime } from "@/lib/formatTime";
import ServiceDetailView from "@/components/ServiceDetailView";
import ServiceEditDialog from "@/components/ServiceEditDialog";

interface Props {
  services: ServiceEntry[];
  onDelete: (id: string) => void;
  onUpdate?: (entry: ServiceEntry) => void;
  allServices?: ServiceEntry[];
}

const SERVICE_COLORS = [
  "border-l-primary bg-primary/10",
  "border-l-[hsl(210,90%,55%)] bg-[hsl(210,90%,55%)]/10",
  "border-l-destructive bg-destructive/10",
  "border-l-success bg-success/10",
  "border-l-[hsl(280,80%,60%)] bg-[hsl(280,80%,60%)]/10",
  "border-l-[hsl(180,70%,40%)] bg-[hsl(180,70%,40%)]/10",
  "border-l-[hsl(330,80%,55%)] bg-[hsl(330,80%,55%)]/10",
  "border-l-[hsl(60,70%,45%)] bg-[hsl(60,70%,45%)]/10",
];

const SERVICE_BADGE_COLORS = [
  "bg-primary/25 text-primary ring-2 ring-primary/40",
  "bg-[hsl(210,90%,55%)]/25 text-[hsl(210,90%,55%)] ring-2 ring-[hsl(210,90%,55%)]/40",
  "bg-destructive/25 text-destructive ring-2 ring-destructive/40",
  "bg-success/25 text-success ring-2 ring-success/40",
  "bg-[hsl(280,80%,60%)]/25 text-[hsl(280,80%,60%)] ring-2 ring-[hsl(280,80%,60%)]/40",
  "bg-[hsl(180,70%,40%)]/25 text-[hsl(180,70%,40%)] ring-2 ring-[hsl(180,70%,40%)]/40",
  "bg-[hsl(330,80%,55%)]/25 text-[hsl(330,80%,55%)] ring-2 ring-[hsl(330,80%,55%)]/40",
  "bg-[hsl(60,70%,45%)]/25 text-[hsl(60,70%,45%)] ring-2 ring-[hsl(60,70%,45%)]/40",
];

type SortKey =
  | "solicitud" | "fecha" | "horaSolicitud" | "cliente" | "lugarSalida" | "destino"
  | "chofer" | "citaChofer" | "custodio" | "citaCustodio" | "movil" | "celular"
  | "salidaCenop" | "llegadaServicio" | "iniciaServicio" | "llegadaDestino"
  | "finalizaServicio" | "llegadaCenop" | "horaFrancoChofer" | "horaFrancoCustodio"
  | "ordenCarga" | "remito" | "continuaOrden" | "observaciones"
  | "horasProductivas" | "horasImproductivas1" | "horasImproductivas2"
  | "horasImproductivas" | "horasTotales" | "peajes";
type SortDirection = "asc" | "desc";

const TABLE_HEADERS: { label: string; sortKey?: SortKey }[] = [
  { label: "Fecha", sortKey: "fecha" },
  { label: "N°", sortKey: "solicitud" },
  { label: "Solicitud de Custodia", sortKey: "horaSolicitud" },
  { label: "Cliente", sortKey: "cliente" },
  { label: "Lugar de Salida", sortKey: "lugarSalida" },
  { label: "Destino", sortKey: "destino" },
  { label: "Chofer", sortKey: "chofer" },
  { label: "Cita Chofer", sortKey: "citaChofer" },
  { label: "Custodio", sortKey: "custodio" },
  { label: "Cita Custodio", sortKey: "citaCustodio" },
  { label: "Móvil", sortKey: "movil" },
  { label: "Celular", sortKey: "celular" },
  { label: "Salida de CENOP", sortKey: "salidaCenop" },
  { label: "Llegada a Servicio", sortKey: "llegadaServicio" },
  { label: "Inicia Servicio", sortKey: "iniciaServicio" },
  { label: "Llegada a Destino", sortKey: "llegadaDestino" },
  { label: "Finaliza Servicio", sortKey: "finalizaServicio" },
  { label: "Llegada a CENOP", sortKey: "llegadaCenop" },
  { label: "Hora Franco Chofer", sortKey: "horaFrancoChofer" },
  { label: "Hora Franco Custodio", sortKey: "horaFrancoCustodio" },
  { label: "Orden de Carga Cliente", sortKey: "ordenCarga" },
  { label: "N° Remito", sortKey: "remito" },
  { label: "Continúa Orden N°", sortKey: "continuaOrden" },
  { label: "Observaciones", sortKey: "observaciones" },
  { label: "Horas Productivas", sortKey: "horasProductivas" },
  { label: "Horas Improductivas 1", sortKey: "horasImproductivas1" },
  { label: "Horas Improductivas 2", sortKey: "horasImproductivas2" },
  { label: "Horas Improductivas", sortKey: "horasImproductivas" },
  { label: "Horas Totales", sortKey: "horasTotales" },
  { label: "Peajes", sortKey: "peajes" },
  { label: "" },
];

const TIME_SORT_KEYS: SortKey[] = [
  "horaSolicitud", "citaChofer", "citaCustodio", "salidaCenop", "llegadaServicio",
  "iniciaServicio", "llegadaDestino", "finalizaServicio", "llegadaCenop",
  "horaFrancoChofer", "horaFrancoCustodio", "horasProductivas", "horasImproductivas1",
  "horasImproductivas2", "horasImproductivas", "horasTotales",
];

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

const formatDate = (date: string) => date ? date.split("-").reverse().join("/") : "—";

const parseDateValue = (date: string) => {
  if (!date) return Number.NEGATIVE_INFINITY;

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T00:00:00`).getTime();
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split("/");
    return new Date(`${year}-${month}-${day}T00:00:00`).getTime();
  }

  const parsed = new Date(date).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const getInitialSortDirection = (key: SortKey): SortDirection => {
  if (key === "fecha") return "desc";
  return "asc";
};

const getPeajesTotal = (service: ServiceEntry) =>
  service.peajes?.reduce((sum, peaje) => sum + (peaje.monto || 0), 0) || 0;

const getRowRole = (service: ServiceEntry) => {
  if (service.chofer && !service.custodio) return "chofer";
  if (service.custodio && !service.chofer) return "custodio";
  return "mixto";
};

const canJoinPair = (group: ServiceEntry[], service: ServiceEntry) => {
  if (group.length >= 2) return false;
  const first = group[0];
  const sameService = getServiceKey(first) === getServiceKey(service)
    && first.cliente === service.cliente
    && first.destino === service.destino
    && first.movil === service.movil
    && (first.remito || "") === (service.remito || "");

  if (!sameService) return false;
  const roles = new Set(group.map(getRowRole));
  const nextRole = getRowRole(service);
  return nextRole !== "mixto" && !roles.has(nextRole);
};

const buildPairGroups = (entries: ServiceEntry[]) => {
  const groups: { key: string; rows: ServiceEntry[] }[] = [];

  entries.filter((s) => s.chofer || s.custodio).forEach((service) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && canJoinPair(lastGroup.rows, service)) {
      lastGroup.rows.push(service);
      return;
    }

    groups.push({ key: `pair-${groups.length}-${service.id}`, rows: [service] });
  });

  return groups;
};

export default function ServiceTable({ services, onDelete, onUpdate, allServices }: Props) {
  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ServiceEntry | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  if (services.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        No hay servicios cargados para este día.
      </div>
    );
  }

  const pairGroups = buildPairGroups(services);
  const rowPairKeyMap = new Map<string, string>();
  pairGroups.forEach((group) => {
    group.rows.forEach((service) => rowPairKeyMap.set(service.id, group.key));
  });

  const uniqueServiceKeys = pairGroups.map((group) => group.key);
  const serviceColorMap = new Map<string, number>();
  uniqueServiceKeys.forEach((serviceKey, i) => {
    serviceColorMap.set(serviceKey, i % SERVICE_COLORS.length);
  });

  const selectedServices = selectedServiceKey !== null
    ? pairGroups.find((group) => group.key === selectedServiceKey)?.rows || []
    : [];

  const getSortValue = (group: ServiceEntry[], key: SortKey): string | number => {
    const first = group[0];
    const textValues = group.flatMap((service) => key === "chofer" || key === "custodio" ? [service[key]] : []);

    if (key === "chofer" || key === "custodio") return textValues.filter(Boolean).sort((a, b) => collator.compare(a, b))[0] || "";
    if (key === "fecha") return parseDateValue(first.fecha || "");
    if (key === "peajes") return group.reduce((sum, service) => sum + getPeajesTotal(service), 0);
    if (key === "salidaCenop" || key === "finalizaServicio" || key === "horasProductivas" || key === "horasImproductivas" || key === "horasTotales") return timeToMinutes(first[key] || "");
    if (key === "solicitud") return first.solicitud;
    return String(first[key] || "");
  };

  const displayedServices = (sortConfig
    ? [...pairGroups].sort((a, b) => {
        const aValue = getSortValue(a.rows, sortConfig.key);
        const bValue = getSortValue(b.rows, sortConfig.key);
        const primary = typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : collator.compare(String(aValue), String(bValue));

        const tiebreak = a.rows[0].solicitud - b.rows[0].solicitud;
        const combined = primary !== 0 ? primary : tiebreak;
        return sortConfig.direction === "asc" ? combined : -combined;
      })
    : pairGroups)
    .flatMap((group) => group.rows);

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: getInitialSortDirection(key) };
    });
  };

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                {TABLE_HEADERS.map((header) => (
                    <th key={header.label || "actions"} className="px-3 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">
                      {header.sortKey ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort(header.sortKey)}
                          className="h-7 px-2 -ml-2 gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                        >
                          {header.label}
                          <ArrowDownUp className={`w-3 h-3 ${sortConfig?.key === header.sortKey ? "text-foreground" : ""}`} />
                        </Button>
                      ) : header.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {displayedServices.map((s) => {
                const serviceKey = rowPairKeyMap.get(s.id) || getServiceKey(s);
                const colorIdx = serviceColorMap.get(serviceKey) ?? 0;
                const rowColor = SERVICE_COLORS[colorIdx];
                const badgeColor = SERVICE_BADGE_COLORS[colorIdx];

                return (
                  <tr
                    key={s.id}
                    className={`border-b border-border/50 border-l-[6px] hover:brightness-130 transition-all cursor-pointer ${rowColor}`}
                    onClick={() => setSelectedServiceKey(serviceKey)}
                  >
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md font-mono text-xs font-bold ${badgeColor}`}>
                        {s.solicitud}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{formatDate(s.fecha)}</td>
                    <td className="px-3 py-2.5 font-semibold">{s.cliente}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.destino}</td>
                    <td className="px-3 py-2.5">{s.chofer || "—"}</td>
                    <td className="px-3 py-2.5">{s.custodio || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{s.movil}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{s.remito || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{cleanTime(s.salidaCenop)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{cleanTime(s.finalizaServicio)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-primary font-semibold">
                      {s.peajes && s.peajes.length > 0
                        ? `$${s.peajes.reduce((sum, p) => sum + (p.monto || 0), 0).toLocaleString("es-AR")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-success font-semibold">{cleanTime(s.horasProductivas)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-destructive font-semibold">{cleanTime(s.horasImproductivas)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold">{cleanTime(s.horasTotales)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {onUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setEditingService(s); }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedServiceKey !== null && selectedServices.length > 0 && (
        <ServiceDetailView
          services={selectedServices}
          onClose={() => setSelectedServiceKey(null)}
        />
      )}

      {onUpdate && (
        <ServiceEditDialog
          service={editingService}
          open={editingService !== null}
          onClose={() => setEditingService(null)}
          onSave={(entry) => onUpdate(entry)}
          existingServices={allServices ?? services}
        />
      )}
    </>
  );
}
