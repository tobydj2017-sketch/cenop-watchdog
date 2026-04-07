import { ServiceEntry } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanTime } from "@/lib/formatTime";

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

export default function ServiceTable({ services, onDelete }: Props) {
  if (services.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        No hay servicios cargados para este día.
      </div>
    );
  }

  // Build a map: solicitud number → color index
  const uniqueSolicitudes = [...new Set(services.map((s) => s.solicitud))];
  const solicitudColorMap = new Map<number, number>();
  uniqueSolicitudes.forEach((sol, i) => {
    solicitudColorMap.set(sol, i % SERVICE_COLORS.length);
  });

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["#", "Cliente", "Destino", "Chofer", "Custodio", "Móvil", "Salida", "Fin Serv.", "Hs Prod.", "Hs Improd.", "Hs Total", ""].map(
                (h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {services.filter((s) => s.chofer || s.custodio).map((s) => {
              const colorIdx = solicitudColorMap.get(s.solicitud) ?? 0;
              const rowColor = SERVICE_COLORS[colorIdx];
              const badgeColor = SERVICE_BADGE_COLORS[colorIdx];

              return (
                <tr key={s.id} className={`border-b border-border/50 border-l-[6px] hover:brightness-130 transition-all ${rowColor}`}>
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
                  <td className="px-3 py-2.5 font-mono text-xs">{cleanTime(s.salidaCenop)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{cleanTime(s.finalizaServicio)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-success font-semibold">{cleanTime(s.horasProductivas)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-destructive font-semibold">{cleanTime(s.horasImproductivas)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold">{cleanTime(s.horasTotales)}</td>
                  <td className="px-3 py-2.5">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(s.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
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
  );
}
