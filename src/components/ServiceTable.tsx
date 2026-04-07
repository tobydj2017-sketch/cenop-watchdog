import { ServiceEntry } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanTime } from "@/lib/formatTime";

interface Props {
  services: ServiceEntry[];
  onDelete: (id: string) => void;
}

const SERVICE_COLORS = [
  "border-l-primary bg-primary/5",
  "border-l-success bg-success/5",
  "border-l-destructive bg-destructive/5",
  "border-l-[hsl(var(--chart-transit))] bg-[hsl(var(--chart-transit))]/5",
  "border-l-[hsl(200,70%,50%)] bg-[hsl(200,70%,50%)]/5",
  "border-l-[hsl(280,60%,55%)] bg-[hsl(280,60%,55%)]/5",
  "border-l-[hsl(330,70%,50%)] bg-[hsl(330,70%,50%)]/5",
  "border-l-[hsl(170,60%,45%)] bg-[hsl(170,60%,45%)]/5",
];

const SERVICE_BADGE_COLORS = [
  "bg-primary/20 text-primary",
  "bg-success/20 text-success",
  "bg-destructive/20 text-destructive",
  "bg-[hsl(var(--chart-transit))]/20 text-[hsl(var(--chart-transit))]",
  "bg-[hsl(200,70%,50%)]/20 text-[hsl(200,70%,50%)]",
  "bg-[hsl(280,60%,55%)]/20 text-[hsl(280,60%,55%)]",
  "bg-[hsl(330,70%,50%)]/20 text-[hsl(330,70%,50%)]",
  "bg-[hsl(170,60%,45%)]/20 text-[hsl(170,60%,45%)]",
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
      <div className="overflow-x-auto">
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
            {services.map((s) => {
              const colorIdx = solicitudColorMap.get(s.solicitud) ?? 0;
              const rowColor = SERVICE_COLORS[colorIdx];
              const badgeColor = SERVICE_BADGE_COLORS[colorIdx];

              return (
                <tr key={s.id} className={`border-b border-border/50 border-l-4 hover:brightness-125 transition-all ${rowColor}`}>
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
