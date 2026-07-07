import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ServiceEntry, getAdjustedHours, getServiceKey, normalizeClientName } from "@/lib/types";
import { formatHoursMinutes } from "@/lib/formatTime";
import { DataTable } from "./DataTable";

export type DrillDownEntity = "cliente" | "personal" | "movil";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: DrillDownEntity;
  name: string | null;
  services: ServiceEntry[];
}

function shortDate(fecha: string) {
  if (!fecha) return "—";
  const [, m, d] = fecha.split("-");
  return d && m ? `${d}/${m}` : fecha;
}

export default function DrillDownDialog({ open, onOpenChange, entity, name, services }: Props) {
  const filtered = useMemo(() => {
    if (!name) return [];
    return services.filter((s) => {
      if (entity === "cliente") return normalizeClientName(s.cliente) === name;
      if (entity === "movil") return s.movil === name;
      return s.chofer === name || s.custodio === name;
    });
  }, [services, entity, name]);

  const totals = useMemo(() => {
    let prod = 0, improd = 0;
    const svc = new Set<string>();
    filtered.forEach((s) => {
      const h = getAdjustedHours(s);
      prod += h.prod;
      improd += h.improd;
      svc.add(getServiceKey(s));
    });
    return { prod, improd, total: prod + improd, servicios: svc.size };
  }, [filtered]);

  // Per-person breakdown for cliente / movil; per-cliente for personal
  const breakdown = useMemo(() => {
    const map = new Map<string, { prod: number; improd: number; svc: Set<string> }>();
    filtered.forEach((s) => {
      const h = getAdjustedHours(s);
      const keys: string[] = [];
      if (entity === "cliente" || entity === "movil") {
        if (s.chofer) keys.push(`Chofer: ${s.chofer}`);
        if (s.custodio && s.custodio !== s.chofer) keys.push(`Custodio: ${s.custodio}`);
      } else {
        keys.push(normalizeClientName(s.cliente) || "—");
      }
      keys.forEach((k) => {
        const e = map.get(k) || { prod: 0, improd: 0, svc: new Set<string>() };
        e.prod += h.prod;
        e.improd += h.improd;
        e.svc.add(getServiceKey(s));
        map.set(k, e);
      });
    });
    return [...map.entries()]
      .map(([k, v]) => ({ k, prod: v.prod, improd: v.improd, total: v.prod + v.improd, servicios: v.svc.size }))
      .sort((a, b) => b.prod - a.prod);
  }, [filtered, entity]);

  const detailRows = useMemo(() => {
    const seen = new Map<string, ServiceEntry>();
    filtered.forEach((s) => {
      const k = getServiceKey(s);
      if (!seen.has(k)) seen.set(k, s);
    });
    return [...seen.values()]
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.solicitud || 0) - (b.solicitud || 0))
      .map((s) => {
        const h = getAdjustedHours(s);
        return [
          shortDate(s.fecha),
          s.solicitud || "—",
          normalizeClientName(s.cliente) || "—",
          s.chofer || "—",
          s.custodio || "—",
          s.movil || "—",
          formatHoursMinutes(h.prod),
          formatHoursMinutes(h.improd),
        ] as (string | number)[];
      });
  }, [filtered]);

  const title =
    entity === "cliente" ? `Cliente: ${name ?? ""}` :
    entity === "movil" ? `Móvil: ${name ?? ""}` :
    `Personal: ${name ?? ""}`;

  const breakdownTitle =
    entity === "personal" ? "Clientes atendidos" : "Personal involucrado";

  // Solo el personal acumula horas improductivas. Clientes y móviles no.
  const hidesImprod = entity !== "personal";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Detalle completo del período filtrado.
          </DialogDescription>
        </DialogHeader>

        <div className={`grid grid-cols-2 ${hidesImprod ? "md:grid-cols-3" : "md:grid-cols-4"} gap-2 mb-2`}>
          <Stat label="Servicios" value={totals.servicios.toString()} />
          <Stat label="Hs Productivas" value={formatHoursMinutes(totals.prod)} tone="text-success" />
          {!hidesImprod && <Stat label="Hs Improductivas" value={formatHoursMinutes(totals.improd)} tone="text-destructive" />}
          <Stat label="Hs Totales" value={formatHoursMinutes(hidesImprod ? totals.prod : totals.total)} />
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{breakdownTitle}</h4>
          <DataTable
            columns={hidesImprod
              ? ["Persona", "Servicios", "Hs Prod."]
              : [entity === "personal" ? "Cliente" : "Persona", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total"]}
            rows={breakdown.map((b) => hidesImprod
              ? [b.k, b.servicios, formatHoursMinutes(b.prod)]
              : [b.k, b.servicios, formatHoursMinutes(b.prod), formatHoursMinutes(b.improd), formatHoursMinutes(b.total)])}
          />
        </div>

        <div className="space-y-2 mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Servicios</h4>
          <DataTable
            columns={hidesImprod
              ? ["Fecha", "Sol.", "Cliente", "Chofer", "Custodio", "Móvil", "Hs Prod."]
              : ["Fecha", "Sol.", "Cliente", "Chofer", "Custodio", "Móvil", "Hs Prod.", "Hs Improd."]}
            rows={detailRows.map((r) => hidesImprod ? r.slice(0, 7) : r)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="glass-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${tone || ""}`}>{value}</div>
    </div>
  );
}
