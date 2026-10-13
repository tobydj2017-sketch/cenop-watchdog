import { ServiceEntry } from "@/lib/types";
import { cleanTime } from "@/lib/formatTime";
import { X, MapPin, Clock, User, Truck, FileText, ArrowRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  services: ServiceEntry[];
  onClose: () => void;
  onEdit?: (s: ServiceEntry) => void;
}


export default function ServiceDetailView({ services, onClose, onEdit }: Props) {
  const s = services[0];
  if (!s) return null;

  const firstText = (field: keyof ServiceEntry) => {
    for (const entry of services) {
      const value = entry[field];
      if (typeof value === "string" && value.trim()) return value;
    }
    return "";
  };
  const observations = [...new Set(services.map((entry) => entry.observaciones?.trim()).filter(Boolean))];
  const peajes = [...new Map(services.flatMap((entry) => entry.peajes || []).map((item) => [item.id, item])).values()];
  const comisiones = [...new Map(services.flatMap((entry) => entry.comisiones || []).map((item) => [item.id, item])).values()];
  const serviciosOperaciones = [...new Map(services.flatMap((entry) => entry.serviciosOperaciones || []).map((item) => [item.id, item])).values()];
  const tipoCustodia = services.find((entry) => entry.tipoCustodia)?.tipoCustodia;
  const tipoCenopOp = services.find((entry) => entry.tipoCenopOp && entry.tipoCenopOp !== "ninguno")?.tipoCenopOp;
  const llegadaTardeChofer = firstText("llegadaTardeChoferMin");
  const llegadaTardeCustodio = firstText("llegadaTardeCustodioMin");

  const solicitud = s.solicitud;

  const timelineSteps = [
    { label: "Solicitud de Custodia", value: s.horaSolicitud },
    { label: "Salida de CENOP", value: s.salidaCenop },
    { label: "Llegada a Servicio", value: s.llegadaServicio },
    { label: "Inicia Servicio", value: s.iniciaServicio },
    { label: "Llegada a Destino", value: s.llegadaDestino },
    { label: "Finaliza Servicio", value: s.finalizaServicio },
    { label: "Llegada a CENOP", value: s.llegadaCenop },
  ].filter((step) => step.value);

  return (
    <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-8 pb-8 overflow-y-auto">
      <div className="w-full max-w-4xl mx-4 glass-card p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 text-primary font-bold text-lg font-mono">
              {solicitud}
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Servicio #{solicitud}</h2>
              <p className="text-sm text-muted-foreground">{s.fecha ? s.fecha.split("-").reverse().join("/") : ""} — {s.cliente}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(s)}
                className="h-8 gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-5 h-5" />
            </Button>
          </div>

        </div>

        {(tipoCustodia || tipoCenopOp || llegadaTardeChofer || llegadaTardeCustodio) && (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Información Operativa
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Info label="Tipo de custodia" value={tipoCustodia === "larga" ? "Larga" : tipoCustodia === "corta" ? "Corta" : "—"} />
              <Info label="Cruce CENOP / OP" value={tipoCenopOp === "cenop_en_op" ? "CENOP en Operaciones" : tipoCenopOp === "op_en_cenop" ? "Operaciones en CENOP" : "Ninguno"} />
              <Info label="Demora chofer" value={llegadaTardeChofer ? `${llegadaTardeChofer} min` : "—"} />
              <Info label="Demora custodio" value={llegadaTardeCustodio ? `${llegadaTardeCustodio} min` : "—"} />
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ruta */}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Recorrido
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{s.lugarSalida || "CENOP"}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold">{s.destino || "—"}</span>
            </div>
          </div>

          {/* Móvil */}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> Móvil
            </h3>
            <p className="text-sm font-mono font-semibold">{s.movil || "—"}</p>
            {s.celular && <p className="text-xs text-muted-foreground">Cel: {s.celular}</p>}
            {(s.kmSalida || s.kmLlegada || s.kmRecorridos) && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground block">KM Salida</span>
                  <span className="font-mono font-semibold">{s.kmSalida || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">KM Llegada</span>
                  <span className="font-mono font-semibold">{s.kmLlegada || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">KM Recorridos</span>
                  <span className="font-mono font-semibold text-primary">{s.kmRecorridos || "—"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Personal */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Personal Asignado
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(() => {
              const choferes = new Map<string, ServiceEntry>();
              const custodios = new Map<string, ServiceEntry>();
              services.forEach((entry) => {
                if (entry.chofer && !choferes.has(entry.chofer)) choferes.set(entry.chofer, entry);
                if (entry.custodio && !custodios.has(entry.custodio)) custodios.set(entry.custodio, entry);
              });
              return (
                <>
                  {[...choferes.entries()].map(([name, entry]) => (
                    <div key={`ch-${name}`} className="rounded-md bg-secondary/30 p-3 space-y-1">
                      <span className="text-xs text-muted-foreground">Chofer</span>
                      <p className="text-sm font-semibold">{name}</p>
                      {entry.citaChofer && <p className="text-xs text-muted-foreground">Cita: {cleanTime(entry.citaChofer)}</p>}
                      {entry.horaFrancoChofer && <p className="text-xs text-muted-foreground">Franco: {cleanTime(entry.horaFrancoChofer)}</p>}
                    </div>
                  ))}
                  {[...custodios.entries()].map(([name, entry]) => (
                    <div key={`cu-${name}`} className="rounded-md bg-secondary/30 p-3 space-y-1">
                      <span className="text-xs text-muted-foreground">Custodio</span>
                      <p className="text-sm font-semibold">{name}</p>
                      {entry.citaCustodio && <p className="text-xs text-muted-foreground">Cita: {cleanTime(entry.citaCustodio)}</p>}
                      {entry.horaFrancoCustodio && <p className="text-xs text-muted-foreground">Franco: {cleanTime(entry.horaFrancoCustodio)}</p>}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Línea de Tiempo
          </h3>
          <div className="relative pl-4">
            {timelineSteps.map((step, i) => (
              <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
                {/* Line */}
                {i < timelineSteps.length - 1 && (
                  <div className="absolute left-[3px] top-3 bottom-0 w-px bg-border" />
                )}
                {/* Dot */}
                <div className={`relative z-10 w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  i === 0 ? "bg-primary" : i === timelineSteps.length - 1 ? "bg-success" : "bg-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">{step.label}</span>
                  <p className="text-sm font-mono font-semibold">{cleanTime(step.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Horas por persona */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {s.chofer && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Chofer</span>
                <span className="text-xs font-semibold truncate max-w-[60%] text-right">{s.chofer}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Prod.</span>
                  <span className="text-base font-bold font-mono text-success">{cleanTime(s.horasProductivasChofer || "0:00")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Improd.</span>
                  <span className="text-base font-bold font-mono text-destructive">{cleanTime(s.horasImproductivasChofer || "0:00")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total</span>
                  <span className="text-base font-bold font-mono">{cleanTime(s.horasTotalesChofer || "0:00")}</span>
                </div>
              </div>
            </div>
          )}
          {s.custodio && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Custodio</span>
                <span className="text-xs font-semibold truncate max-w-[60%] text-right">{s.custodio}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Prod.</span>
                  <span className="text-base font-bold font-mono text-success">{cleanTime(s.horasProductivasCustodio || "0:00")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Improd.</span>
                  <span className="text-base font-bold font-mono text-destructive">{cleanTime(s.horasImproductivasCustodio || "0:00")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total</span>
                  <span className="text-base font-bold font-mono">{cleanTime(s.horasTotalesCustodio || "0:00")}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documentación */}
        {(firstText("ordenCarga") || firstText("remito") || firstText("continuaOrden") || observations.length > 0) && (
          <div className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Documentación y Observaciones
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {firstText("ordenCarga") && (
                <div>
                  <span className="text-xs text-muted-foreground">Orden de Carga Cliente</span>
                  <p className="font-mono">{firstText("ordenCarga")}</p>
                </div>
              )}
              {firstText("remito") && (
                <div>
                  <span className="text-xs text-muted-foreground">N° Remito</span>
                  <p className="font-mono">{firstText("remito")}</p>
                </div>
              )}
              {firstText("continuaOrden") && (
                <div>
                  <span className="text-xs text-muted-foreground">Continúa Orden N°</span>
                  <p className="font-mono">{firstText("continuaOrden")}</p>
                </div>
              )}
            </div>
            {observations.map((observation, index) => (
              <div key={`${observation}-${index}`} className="mt-2 pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Observaciones</span>
                <p className="text-sm whitespace-pre-wrap">{observation}</p>
              </div>
            ))}
          </div>
        )}

        {(peajes.length > 0 || comisiones.length > 0 || serviciosOperaciones.length > 0) && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Gastos y Tareas Adicionales
            </h3>
            {peajes.length > 0 && (
              <DetailList
                title="Peajes"
                rows={peajes.map((item) => [
                  item.conCamion === true ? "Con camión" : item.conCamion === false ? "Sin camión" : item.ubicacion || "Peaje",
                  `$${Number(item.monto || 0).toLocaleString("es-AR")}`,
                ])}
              />
            )}
            {comisiones.length > 0 && (
              <DetailList
                title="Comisiones"
                rows={comisiones.map((item) => [
                  item.descripcion || "Sin descripción",
                  [item.persona, item.horaInicio && item.horaFin ? `${cleanTime(item.horaInicio)} a ${cleanTime(item.horaFin)}` : cleanTime(item.hora || "")].filter(Boolean).join(" · ") || "—",
                ])}
              />
            )}
            {serviciosOperaciones.length > 0 && (
              <DetailList
                title="Servicios de Operaciones"
                rows={serviciosOperaciones.map((item) => [
                  `${item.cliente || "Sin cliente"} · ${item.descripcion || "Sin descripción"}`,
                  [item.persona, item.horaInicio && item.horaFin ? `${cleanTime(item.horaInicio)} a ${cleanTime(item.horaFin)}` : cleanTime(item.hora || "")].filter(Boolean).join(" · ") || "—",
                ])}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function DetailList({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {rows.map(([description, detail], index) => (
          <div key={`${description}-${index}`} className="grid gap-1 bg-secondary/15 px-3 py-2 text-sm sm:grid-cols-[1fr_auto] sm:gap-4">
            <span>{description}</span>
            <span className="text-muted-foreground sm:text-right">{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
