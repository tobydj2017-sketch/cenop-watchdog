import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/SearchableSelect";
import TimeInput from "@/components/TimeInput";
import { ServiceEntry, PeajeEntry, ComisionEntry, ServicioOperacionesEntry, generateId, calcTimeDiff, timeToMinutes, minutesToTime } from "@/lib/types";
import { isValidDate, findServiceCollisions, formatCollisionMessages } from "@/lib/validation";
import { getMoviles } from "@/lib/movilesStore";
import { getActiveClientNames } from "@/lib/clientStore";
import { getPersonal, getActivePersonalNames } from "@/lib/personalStore";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  service: ServiceEntry | null;
  open: boolean;
  onClose: () => void;
  onSave: (entry: ServiceEntry) => void;
  existingServices: ServiceEntry[];
}

export default function ServiceEditDialog({ service, open, onClose, onSave, existingServices }: Props) {
  const [form, setForm] = useState<ServiceEntry | null>(service);
  const [peajes, setPeajes] = useState<PeajeEntry[]>([]);
  const [comisiones, setComisiones] = useState<ComisionEntry[]>([]);
  const [serviciosOp, setServiciosOp] = useState<ServicioOperacionesEntry[]>([]);

  const personal = getPersonal();
  const allPersonal = getActivePersonalNames();
  const clientesList = getActiveClientNames();

  const opsBadgeMap = useMemo(() => {
    const map: Record<string, string> = {};
    personal.forEach((p) => {
      if (p.roles.includes("operaciones")) map[p.nombre] = "OP";
    });
    return map;
  }, [personal]);

  const roleBadgeMap = useMemo(() => {
    const map: Record<string, string> = {};
    personal.forEach((p) => {
      const tags: string[] = [];
      if (p.roles.includes("operaciones")) tags.push("OP");
      if (p.roles.includes("chofer")) tags.push("CH");
      if (p.roles.includes("custodio")) tags.push("CU");
      if (tags.length > 0) map[p.nombre] = tags.join(" ");
    });
    return map;
  }, [personal]);

  useEffect(() => {
    setForm(service);
    setPeajes(service?.peajes ?? []);
    setComisiones(service?.comisiones ?? []);
    setServiciosOp(service?.serviciosOperaciones ?? []);
  }, [service]);

  if (!form) return null;

  const set = (field: keyof ServiceEntry, value: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const movilesCatalog = useMemo(() => getMoviles().filter((m) => m.activo), [open]);
  const movilOptions = useMemo(() => movilesCatalog.map((m) => m.patente), [movilesCatalog]);

  const setMovil = (value: string) => {
    const info = movilesCatalog.find((m) => m.patente === value);
    setForm((prev) =>
      prev ? { ...prev, movil: value, celular: info?.telefono || prev.celular } : prev,
    );
  };


  const computeHours = (f: ServiceEntry) => {
    const prod = calcTimeDiff(f.iniciaServicio, f.finalizaServicio);
    const improd1 = calcTimeDiff(f.salidaCenop, f.iniciaServicio);
    const endTime = f.horaFrancoChofer || f.horaFrancoCustodio || f.llegadaCenop;
    const improd2 = calcTimeDiff(f.finalizaServicio, endTime);
    const totalImprodMin = timeToMinutes(improd1) + timeToMinutes(improd2);
    const totalMin = timeToMinutes(prod) + totalImprodMin;
    return {
      horasProductivas: prod,
      horasImproductivas1: improd1,
      horasImproductivas2: improd2,
      horasImproductivas: minutesToTime(totalImprodMin),
      horasTotales: minutesToTime(totalMin),
    };
  };

  const handleSave = () => {
    if (!form) return;
    const trimmedRemito = form.remito.trim();
    if (
      trimmedRemito &&
      existingServices.some(
        (s) => s.id !== form.id && s.remito.trim().toUpperCase() === trimmedRemito.toUpperCase(),
      )
    ) {
      toast.error(`Ya existe un servicio con el remito "${trimmedRemito}"`);
      return;
    }
    if (!isValidDate(form.fecha)) {
      toast.error("La fecha del servicio no es válida o no existe");
      return;
    }
    const hours = computeHours(form);
    const updated: ServiceEntry = {
      ...form,
      ...hours,
      peajes: peajes.length > 0 ? peajes : undefined,
      comisiones: comisiones.length > 0 ? comisiones : undefined,
      serviciosOperaciones: serviciosOp.length > 0 ? serviciosOp : undefined,
      choferEsOperaciones: !!opsBadgeMap[form.chofer],
      custodioEsOperaciones: !!opsBadgeMap[form.custodio],
    };
    const collisions = findServiceCollisions(updated, existingServices);
    if (collisions.length > 0) {
      formatCollisionMessages(collisions).forEach((m) => toast.error(m));
      return;
    }
    onSave(updated);
    toast.success("Servicio actualizado");
    onClose();
  };

  const Field = ({ label, field, type = "text" }: { label: string; field: keyof ServiceEntry; type?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {type === "time" ? (
        <TimeInput value={(form[field] as string) || ""} onChange={(v) => set(field, v)} className="h-10" />
      ) : (
        <Input
          type={type}
          value={(form[field] as any) ?? ""}
          onChange={(e) => set(field, type === "number" ? Number(e.target.value) : e.target.value)}
          className="h-10"
        />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Servicio #{form.solicitud}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Datos generales */}
          <section className="space-y-3">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Datos generales</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Fecha" field="fecha" type="date" />
              <Field label="N°" field="solicitud" type="number" />
              <Field label="Solicitud de Custodia" field="horaSolicitud" type="time" />
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</Label>
                <SearchableSelect options={clientesList} value={form.cliente} onChange={(v) => set("cliente", v)} inputClassName="h-10" />
              </div>
              <Field label="Lugar de Salida" field="lugarSalida" />
              <Field label="Destino" field="destino" />
            </div>
          </section>

          {/* Personal */}
          <section className="space-y-3">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Personal</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chofer</Label>
                <SearchableSelect options={allPersonal} value={form.chofer} onChange={(v) => set("chofer", v)} badgeMap={roleBadgeMap} inputClassName="h-10" />
              </div>
              <Field label="Cita Chofer" field="citaChofer" type="time" />
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custodio</Label>
                <SearchableSelect options={allPersonal} value={form.custodio} onChange={(v) => set("custodio", v)} badgeMap={roleBadgeMap} inputClassName="h-10" />
              </div>
              <Field label="Cita Custodio" field="citaCustodio" type="time" />
            </div>
          </section>

          {/* Móvil */}
          <section className="space-y-3">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Móvil</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Móvil</Label>
                <SearchableSelect options={movilOptions} value={form.movil} onChange={setMovil} inputClassName="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Celular</Label>
                {(() => {
                  const info = movilesCatalog.find((m) => m.patente === form.movil);
                  const opts = (info?.telefono || "")
                    .split(/[,;/]| o /i)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  return (
                    <SearchableSelect
                      options={opts}
                      value={form.celular || ""}
                      onChange={(v) => set("celular", v)}
                      inputClassName="h-10"
                      placeholder={opts.length > 1 ? "Elegí un teléfono" : ""}
                    />
                  );
                })()}
              </div>

              <Field label="Orden de Carga Cliente" field="ordenCarga" />
            </div>
          </section>

          {/* Horarios */}
          <section className="space-y-3">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Horarios</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Salida de CENOP" field="salidaCenop" type="time" />
              <Field label="Llegada a Servicio" field="llegadaServicio" type="time" />
              <Field label="Inicia Servicio" field="iniciaServicio" type="time" />
              <Field label="Llegada a Destino" field="llegadaDestino" type="time" />
              <Field label="Finaliza Servicio" field="finalizaServicio" type="time" />
              <Field label="Llegada a CENOP" field="llegadaCenop" type="time" />
              <Field label="Hora Franco Chofer" field="horaFrancoChofer" type="time" />
              <Field label="Hora Franco Custodio" field="horaFrancoCustodio" type="time" />
            </div>
          </section>

          {/* Documentación */}
          <section className="space-y-3">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Documentación</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="N° Remito" field="remito" />
              <Field label="Continúa Orden N°" field="continuaOrden" />
              <div className="space-y-1.5 md:col-span-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observaciones</Label>
                <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={2} />
              </div>
            </div>
          </section>

          {/* Servicios Cruzados */}
          <section className="space-y-3 rounded-md border border-border p-4">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Servicios Cruzados</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                { value: "ninguno", label: "Ninguno" },
                { value: "cenop_en_op", label: "CENOP en Operaciones" },
                { value: "op_en_cenop", label: "Operaciones en CENOP" },
              ].map((opt) => {
                const current = form.tipoCenopOp ?? "ninguno";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("tipoCenopOp", opt.value)}
                    className={`h-11 rounded-md border-2 px-4 text-sm font-bold transition-all ${
                      current === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {(form.tipoCenopOp ?? "ninguno") !== "ninguno" && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Detalle de servicios cruzados</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setServiciosOp((p) => [...p, { id: generateId(), cliente: "", descripcion: "", persona: "", horaInicio: "", horaFin: "" }])}>
                    <Plus className="w-4 h-4" /> Agregar
                  </Button>
                </div>
                {serviciosOp.map((s, idx) => {
                  const dur = s.horaInicio && s.horaFin ? calcTimeDiff(s.horaInicio, s.horaFin) : "";
                  return (
                  <div key={s.id} className="rounded-md border border-border bg-card/40 p-3 space-y-3">
                    <div className="grid grid-cols-[10rem_1fr_3rem] gap-3 items-end">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cliente #{idx + 1}</Label>
                        <SearchableSelect options={clientesList} value={s.cliente} onChange={(v) => setServiciosOp((prev) => prev.map((x) => x.id === s.id ? { ...x, cliente: v } : x))} inputClassName="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Descripción</Label>
                        <Input value={s.descripcion} onChange={(e) => setServiciosOp((prev) => prev.map((x) => x.id === s.id ? { ...x, descripcion: e.target.value } : x))} className="h-10" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => setServiciosOp((prev) => prev.filter((x) => x.id !== s.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-[1fr_7rem_7rem_7rem] gap-3 items-end">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Realizado por</Label>
                        <SearchableSelect options={allPersonal} value={s.persona} onChange={(v) => setServiciosOp((prev) => prev.map((x) => x.id === s.id ? { ...x, persona: v } : x))} inputClassName="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Inicio</Label>
                        <TimeInput value={s.horaInicio} onChange={(v) => setServiciosOp((prev) => prev.map((x) => x.id === s.id ? { ...x, horaInicio: v } : x))} className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fin</Label>
                        <TimeInput value={s.horaFin} onChange={(v) => setServiciosOp((prev) => prev.map((x) => x.id === s.id ? { ...x, horaFin: v } : x))} className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Duración</Label>
                        <div className="h-10 flex items-center justify-center rounded-md border border-border bg-muted/30 text-sm font-mono font-bold text-primary">{dur || "—"}</div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>
          <section className="space-y-3 rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold uppercase tracking-wider">Peajes</h4>
              <Button type="button" variant="outline" size="sm" onClick={() => setPeajes((p) => [...p, { id: generateId(), ubicacion: "", monto: 0 }])}>
                <Plus className="w-4 h-4" /> Agregar
              </Button>
            </div>
            {peajes.map((p, idx) => (
              <div key={p.id} className="grid grid-cols-[1fr_8rem_3rem] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ubicación #{idx + 1}</Label>
                  <Input value={p.ubicacion} onChange={(e) => setPeajes((prev) => prev.map((x) => x.id === p.id ? { ...x, ubicacion: e.target.value } : x))} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monto ($)</Label>
                  <Input type="number" value={p.monto || ""} onChange={(e) => setPeajes((prev) => prev.map((x) => x.id === p.id ? { ...x, monto: Number(e.target.value) } : x))} className="h-10" />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => setPeajes((prev) => prev.filter((x) => x.id !== p.id))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </section>

          {/* Comisiones */}
          <section className="space-y-3 rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold uppercase tracking-wider">Comisiones</h4>
              <Button type="button" variant="outline" size="sm" onClick={() => setComisiones((p) => [...p, { id: generateId(), descripcion: "", persona: "", horaInicio: "", horaFin: "" }])}>
                <Plus className="w-4 h-4" /> Agregar
              </Button>
            </div>
            {comisiones.map((c, idx) => {
              const dur = c.horaInicio && c.horaFin ? calcTimeDiff(c.horaInicio, c.horaFin) : "";
              return (
              <div key={c.id} className="rounded-md border border-border bg-card/40 p-3 space-y-3">
                <div className="grid grid-cols-[1fr_3rem] gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descripción #{idx + 1}</Label>
                    <Input value={c.descripcion} onChange={(e) => setComisiones((prev) => prev.map((x) => x.id === c.id ? { ...x, descripcion: e.target.value } : x))} className="h-10" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => setComisiones((prev) => prev.filter((x) => x.id !== c.id))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-[1fr_7rem_7rem_7rem] gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Realizado por</Label>
                    <SearchableSelect options={allPersonal} value={c.persona} onChange={(v) => setComisiones((prev) => prev.map((x) => x.id === c.id ? { ...x, persona: v } : x))} inputClassName="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Inicio</Label>
                    <TimeInput value={c.horaInicio} onChange={(v) => setComisiones((prev) => prev.map((x) => x.id === c.id ? { ...x, horaInicio: v } : x))} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fin</Label>
                    <TimeInput value={c.horaFin} onChange={(v) => setComisiones((prev) => prev.map((x) => x.id === c.id ? { ...x, horaFin: v } : x))} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Duración</Label>
                    <div className="h-10 flex items-center justify-center rounded-md border border-border bg-muted/30 text-sm font-mono font-bold text-primary">{dur || "—"}</div>
                  </div>
                </div>
              </div>
              );
            })}
          </section>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
