import { useMemo, useState } from "react";
import { ChevronRight, Clock, Download, MapPin, Moon, Sun, Truck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ServiceDetailView from "@/components/ServiceDetailView";
import { ServiceEntry } from "@/lib/types";
import {
  CustodyPeakDay,
  CustodyServiceGroup,
  CustodyShiftFilter,
  getCustodyServiceGroups,
} from "@/lib/custodyPeaks";
import { cleanTime } from "@/lib/formatTime";
import { exportCustodyDayDetailsPDF } from "@/lib/pdfExport";

interface Props {
  day: CustodyPeakDay;
  shift: CustodyShiftFilter;
  services: ServiceEntry[];
  onClose: () => void;
}

function firstValue(entries: ServiceEntry[], field: keyof ServiceEntry): string {
  for (const entry of entries) {
    const value = entry[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function people(entries: ServiceEntry[], field: "chofer" | "custodio"): string {
  return [...new Set(entries.map((entry) => entry[field]).filter(Boolean))].join(", ") || "—";
}

function shiftLabel(shift: CustodyShiftFilter) {
  if (shift === "dia") return "Turno día";
  if (shift === "noche") return "Turno noche";
  return "Todos los turnos";
}

export default function CustodyDayDetail({ day, shift, services, onClose }: Props) {
  const [selected, setSelected] = useState<CustodyServiceGroup | null>(null);
  const groups = useMemo(
    () => getCustodyServiceGroups(services, day.fecha, shift),
    [services, day.fecha, shift],
  );

  return (
    <>
      <Dialog open={!selected} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-7xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-5 pr-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <DialogTitle className="text-xl">Custodias del {day.fechaLabel}</DialogTitle>
                <DialogDescription className="mt-1">
                  {shiftLabel(shift)} · {groups.length} custodias. Seleccioná una para consultar toda su información.
                </DialogDescription>
              </div>
              <Button
                type="button"
                className="gap-2 self-start md:self-auto"
                disabled={!groups.length}
                onClick={() => exportCustodyDayDetailsPDF(groups, day, shift)}
              >
                <Download className="h-4 w-4" /> Descargar reporte del día
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 border-b border-border bg-muted/15 px-6 py-4 md:grid-cols-4">
            <Summary label="Custodias" value={groups.length.toString()} />
            <Summary label="De día" value={day.dia.toString()} />
            <Summary label="De noche" value={day.noche.toString()} />
            <Summary label="Sin horario" value={day.sinHorario.toString()} />
          </div>

          <div className="overflow-y-auto px-6 py-5">
            {groups.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {groups.map((group) => {
                  const service = group.primary;
                  const start = firstValue(group.entries, "iniciaServicio") || firstValue(group.entries, "salidaCenop") || firstValue(group.entries, "horaSolicitud");
                  const observation = firstValue(group.entries, "observaciones");
                  return (
                    <button
                      type="button"
                      key={group.key}
                      onClick={() => setSelected(group)}
                      className="group rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-primary/70 hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 font-mono text-sm font-bold text-primary">
                            {service.solicitud || "—"}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{service.cliente || "CENOP"}</div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              {group.shift === "dia" ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-blue-400" />}
                              {group.shift === "dia" ? "Día" : group.shift === "noche" ? "Noche" : "Sin horario"}
                              <span>·</span>
                              <Clock className="h-3.5 w-3.5" /> {cleanTime(start) || "Sin hora"}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                      </div>

                      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                        <Detail icon={MapPin} label="Recorrido" value={`${service.lugarSalida || "CENOP"} → ${service.destino || "—"}`} />
                        <Detail icon={Truck} label="Móvil" value={service.movil || "—"} />
                        <Detail icon={Users} label="Chofer" value={people(group.entries, "chofer")} />
                        <Detail icon={Users} label="Custodio" value={people(group.entries, "custodio")} />
                      </div>

                      {observation && (
                        <div className="mt-4 border-t border-border/70 pt-3">
                          <div className="text-[10px] uppercase text-muted-foreground">Observaciones</div>
                          <p className="mt-1 line-clamp-2 text-xs">{observation}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                No hay custodias para el turno seleccionado.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selected && (
        <ServiceDetailView services={selected.entries} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof X; label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="mt-0.5 break-words font-medium">{value}</div>
      </div>
    </div>
  );
}
