import { ServiceEntry } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanTime } from "@/lib/formatTime";

interface Props {
  services: ServiceEntry[];
  onDelete: (id: string) => void;
}

export default function ServiceTable({ services, onDelete }: Props) {
  if (services.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        No hay servicios cargados para este día.
      </div>
    );
  }

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
            {services.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs">{s.solicitud}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
