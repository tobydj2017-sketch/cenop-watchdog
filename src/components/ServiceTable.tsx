import { useState } from "react";
import { getServiceKey, ServiceEntry, timeToMinutes } from "@/lib/types";
import { ArrowDownUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanTime } from "@/lib/formatTime";
import ServiceDetailView from "@/components/ServiceDetailView";

interface Props {
  services: ServiceEntry[];
  onDelete: (id: string) => void;
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

type SortKey = "solicitud" | "fecha" | "cliente" | "destino" | "chofer" | "custodio" | "movil" | "remito" | "salidaCenop" | "finalizaServicio" | "peajes" | "horasProductivas" | "horasImproductivas" | "horasTotales";

const TABLE_HEADERS: { label: string; sortKey?: SortKey }[] = [
  { label: "#", sortKey: "solicitud" },
  { label: "Fecha", sortKey: "fecha" },
  { label: "Cliente", sortKey: "cliente" },
  { label: "Destino", sortKey: "destino" },
  { label: "Chofer", sortKey: "chofer" },
  { label: "Custodio", sortKey: "custodio" },
  { label: "Móvil", sortKey: "movil" },
  { label: "Remito", sortKey: "remito" },
  { label: "Salida", sortKey: "salidaCenop" },
  { label: "Fin Serv.", sortKey: "finalizaServicio" },
  { label: "Peajes", sortKey: "peajes" },
  { label: "Hs Prod.", sortKey: "horasProductivas" },
  { label: "Hs Improd.", sortKey: "horasImproductivas" },
  { label: "Hs Total", sortKey: "horasTotales" },
  { label: "" },
];

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

const formatDate = (date: string) => date ? date.split("-").reverse().join("/") : "—";

const getPeajesTotal = (service: ServiceEntry) =>
  service.peajes?.reduce((sum, peaje) => sum + (peaje.monto || 0), 0) || 0;

export default function ServiceTable({ services, onDelete }: Props) {
  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "fecha", direction: "asc" });

  if (services.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        No hay servicios cargados para este día.
      </div>
    );
  }

  const uniqueServiceKeys = [...new Set(services.map((s) => getServiceKey(s)))];
  const serviceColorMap = new Map<string, number>();
  uniqueServiceKeys.forEach((serviceKey, i) => {
    serviceColorMap.set(serviceKey, i % SERVICE_COLORS.length);
  });

  const selectedServices = selectedServiceKey !== null
    ? services.filter((s) => getServiceKey(s) === selectedServiceKey)
    : [];

  const groupedServices = services
    .filter((s) => s.chofer || s.custodio)
    .reduce<Map<string, ServiceEntry[]>>((map, service) => {
      const serviceKey = getServiceKey(service);
      map.set(serviceKey, [...(map.get(serviceKey) || []), service]);
      return map;
    }, new Map());

  const getSortValue = (group: ServiceEntry[], key: SortKey): string | number => {
    const first = group[0];
    const textValues = group.flatMap((service) => key === "chofer" || key === "custodio" ? [service[key]] : []);

    if (key === "chofer" || key === "custodio") return textValues.filter(Boolean).sort((a, b) => collator.compare(a, b))[0] || "";
    if (key === "peajes") return group.reduce((sum, service) => sum + getPeajesTotal(service), 0);
    if (key === "salidaCenop" || key === "finalizaServicio" || key === "horasProductivas" || key === "horasImproductivas" || key === "horasTotales") return timeToMinutes(first[key] || "");
    if (key === "solicitud") return first.solicitud;
    return String(first[key] || "");
  };

  const displayedServices = [...groupedServices.values()]
    .sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);
      const result = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : collator.compare(String(aValue), String(bValue));

      if (result !== 0) return sortConfig.direction === "asc" ? result : -result;
      return collator.compare(getServiceKey(a[0]), getServiceKey(b[0]));
    })
    .flatMap((group) => group);

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
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
                          <ArrowDownUp className={`w-3 h-3 ${sortConfig.key === header.sortKey ? "text-foreground" : ""}`} />
                        </Button>
                      ) : header.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {displayedServices.map((s) => {
                const serviceKey = getServiceKey(s);
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
    </>
  );
}
