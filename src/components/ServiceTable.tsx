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
  const [selectedSolicitud, setSelectedSolicitud] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  if (services.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        No hay servicios cargados para este día.
      </div>
    );
  }

  const uniqueSolicitudes = [...new Set(services.map((s) => s.solicitud))];
  const solicitudColorMap = new Map<number, number>();
  uniqueSolicitudes.forEach((sol, i) => {
    solicitudColorMap.set(sol, i % SERVICE_COLORS.length);
  });

  const selectedServices = selectedSolicitud !== null
    ? services.filter((s) => s.solicitud === selectedSolicitud)
    : [];

  const displayedServices = services
    .filter((s) => s.chofer || s.custodio)
    .sort((a, b) => {
      const solicitudDiff = sortDirection === "asc"
        ? a.solicitud - b.solicitud
        : b.solicitud - a.solicitud;

      if (solicitudDiff !== 0) return solicitudDiff;
      return (a.chofer || a.custodio || "").localeCompare(b.chofer || b.custodio || "", "es");
    });

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                {["#", "Cliente", "Destino", "Chofer", "Custodio", "Móvil", "Remito", "Salida", "Fin Serv.", "Peajes", "Hs Prod.", "Hs Improd.", "Hs Total", ""].map(
                  (h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">
                      {h === "#" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")}
                          className="h-7 px-2 -ml-2 gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                        >
                          #
                          <ArrowDownUp className="w-3 h-3" />
                        </Button>
                      ) : h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {displayedServices.map((s) => {
                const colorIdx = solicitudColorMap.get(s.solicitud) ?? 0;
                const rowColor = SERVICE_COLORS[colorIdx];
                const badgeColor = SERVICE_BADGE_COLORS[colorIdx];

                return (
                  <tr
                    key={s.id}
                    className={`border-b border-border/50 border-l-[6px] hover:brightness-130 transition-all cursor-pointer ${rowColor}`}
                    onClick={() => setSelectedSolicitud(s.solicitud)}
                  >
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md font-mono text-xs font-bold ${badgeColor}`}>
                        {s.solicitud}
                      </span>
                    </td>
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

      {selectedSolicitud !== null && selectedServices.length > 0 && (
        <ServiceDetailView
          services={selectedServices}
          onClose={() => setSelectedSolicitud(null)}
        />
      )}
    </>
  );
}
