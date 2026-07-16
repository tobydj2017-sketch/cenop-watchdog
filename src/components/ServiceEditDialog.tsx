import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/SearchableSelect";
import TimeInput from "@/components/TimeInput";
import { ServiceEntry, PeajeEntry, ComisionEntry, ServicioOperacionesEntry, generateId, calcTimeDiff, timeToMinutes, minutesToTime, computeServiceHours } from "@/lib/types";
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

  const movilesCatalog = useMemo(() => getMoviles().filter((m) => m.activo), [open]);
  const movilOptions = useMemo(() => movilesCatalog.map((m) => m.patente), [movilesCatalog]);

  if (!form) return null;

  const set = (field: keyof ServiceEntry, value: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const setMovil = (value: string) => {
    const info = movilesCatalog.find((m) => m.patente === value);
    const first = (info?.telefono || "").split(/[,;/]| o /i)[0]?.trim() || "";
    setForm((prev) =>
      prev ? { ...prev, movil: value, celular: first || prev.celular } : prev,
    );
  };

  const setKm = (field: "kmSalida" | "kmLlegada", value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const salida = field === "kmSalida" ? value : prev.kmSalida || "";
      const llegada = field === "kmLlegada" ? value : prev.kmLlegada || "";
      const salidaNum = parseFloat(salida);
      const llegadaNum = parseFloat(llegada);
      const recorridos = !isNaN(salidaNum) && !isNaN(llegadaNum) && llegadaNum >= salidaNum
        ? String(Math.round(llegadaNum - salidaNum))
        : "";
      return { ...prev, [field]: value, kmRecorridos: recorridos };
    });
  };



  const computeHours = (f: ServiceEntry) => computeServiceHours(f);


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

  const timeFields = [
    "horaSolicitud", "citaChofer", "citaCustodio", "salidaCenop", "llegadaServicio",
    "iniciaServicio", "llegadaDestino", "finalizaServicio", "llegadaCenop",
    "horaFrancoChofer", "horaFrancoCustodio",
    "salidaCenopChofer", "llegadaCenopChofer", "salidaCenopCustodio", "llegadaCenopCustodio",
  ];

  const focusNextTimeField = (currentField: string) => {
    const idx = timeFields.indexOf(currentField);
    if (idx < 0 || idx >= timeFields.length - 1) return;
    const nextField = timeFields[idx + 1];
    const nextInput = document.querySelector(`[data-edit-timefield="${nextField}"] input`) as HTMLInputElement | null;
    nextInput?.focus();
  };

  const renderField = ({ label, field, type = "text" }: { label: string; field: keyof ServiceEntry; type?: string }) => (
    <div key={String(field)} className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {type === "time" ? (
        <div data-edit-timefield={String(field)}>
          <TimeInput
            value={(form[field] as string) || ""}
            onChange={(v) => set(field, v)}
            onComplete={() => focusNextTimeField(String(field))}
            className="h-10"
          />
        </div>
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
              {renderField({ label: "Fecha", field: "fecha", type: "date" })}
              {renderField({ label: "N°", field: "solicitud", type: "number" })}
              {renderField({ label: "Solicitud de Custodia", field: "horaSolicitud", type: "time" })}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</Label>
                <SearchableSelect options={clientesList} value={form.cliente} onChange={(v) => set("cliente", v)} inputClassName="h-10" />
              </div>
              {renderField({ label: "Lugar de Salida", field: "lugarSalida" })}
              {renderField({ label: "Destino", field: "destino" })}
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
              {renderField({ label: "Cita Chofer", field: "citaChofer", type: "time" })}
              {renderField({ label: "Llegada tarde Chofer (min)", field: "llegadaTardeChoferMin", type: "number" })}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custodio</Label>
                <SearchableSelect options={allPersonal} value={form.custodio} onChange={(v) => set("custodio", v)} badgeMap={roleBadgeMap} inputClassName="h-10" />
              </div>
              {renderField({ label: "Cita Custodio", field: "citaCustodio", type: "time" })}
              {renderField({ label: "Llegada tarde Custodio (min)", field: "llegadaTardeCustodioMin", type: "number" })}
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
                  const all = Array.from(new Set(
                    movilesCatalog.flatMap((m) =>
                      (m.telefono || "").split(/[,;/]| o /i).map((s) => s.trim()).filter(Boolean)
                    )
                  )).sort();
                  return (
                    <SearchableSelect
                      options={all}
                      value={form.celular || ""}
                      onChange={(v) => set("celular", v)}
                      inputClassName="h-10"
                      placeholder="Elegí un teléfono"
                    />
                  );
                })()}

              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">KM Salida</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.kmSalida || ""}
                  onChange={(e) => setKm("kmSalida", e.target.value)}
                  placeholder="Ej: 45200"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">KM Llegada</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.kmLlegada || ""}
                  onChange={(e) => setKm("kmLlegada", e.target.value)}
                  placeholder="Ej: 45680"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">KM Recorridos</Label>
                <Input
                  type="number"
                  value={form.kmRecorridos || ""}
                  readOnly
                  placeholder="Auto"
                  className="h-10 bg-muted font-mono font-bold"
                />
              </div>

              {renderField({ label: "Orden de Carga Cliente", field: "ordenCarga" })}
            </div>
          </section>

          {/* Horarios */}
          <section className="space-y-3">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Horarios</h4>
            <div className="grid md:grid-cols-3 gap-4">
              {renderField({ label: "Salida de CENOP", field: "salidaCenop", type: "time" })}
              {renderField({ label: "Llegada a Servicio", field: "llegadaServicio", type: "time" })}
              {renderField({ label: "Inicia Servicio", field: "iniciaServicio", type: "time" })}
              {renderField({ label: "Llegada a Destino", field: "llegadaDestino", type: "time" })}
              {renderField({ label: "Finaliza Servicio", field: "finalizaServicio", type: "time" })}
              {renderField({ label: "Llegada a CENOP", field: "llegadaCenop", type: "time" })}
              {renderField({ label: "Hora Franco Chofer", field: "horaFrancoChofer", type: "time" })}
              {renderField({ label: "Hora Franco Custodio", field: "horaFrancoCustodio", type: "time" })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Opcional: si el chofer y el custodio no entran/salen del CENOP juntos (p. ej. le dan franco al custodio antes),
              cargá acá los horarios individuales. Si quedan vacíos, se usan los de arriba para ambos.
            </p>
            <div className="grid md:grid-cols-4 gap-4">
              {renderField({ label: "Salida CENOP Chofer", field: "salidaCenopChofer", type: "time" })}
              {renderField({ label: "Llegada CENOP Chofer", field: "llegadaCenopChofer", type: "time" })}
              {renderField({ label: "Salida CENOP Custodio", field: "salidaCenopCustodio", type: "time" })}
              {renderField({ label: "Llegada CENOP Custodio", field: "llegadaCenopCustodio", type: "time" })}
            </div>
          </section>

          {/* Documentación */}
          <section className="space-y-3">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Documentación</h4>
            <div className="grid md:grid-cols-3 gap-4">
              {renderField({ label: "N° Remito", field: "remito" })}
              {renderField({ label: "Continúa Orden N°", field: "continuaOrden" })}
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
              <Button type="button" variant="outline" size="sm" onClick={() => setPeajes((p) => [...p, { id: generateId(), conCamion: false, monto: 0 }])}>
                <Plus className="w-4 h-4" /> Agregar
              </Button>
            </div>
            {peajes.map((p, idx) => (
              <div key={p.id} className="grid grid-cols-[2.5rem_1fr_8rem_3rem] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">#</Label>
                  <div className="h-10 flex items-center justify-center rounded-md border border-border bg-muted/40 text-sm font-bold">{idx + 1}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de peaje</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPeajes((prev) => prev.map((x) => x.id === p.id ? { ...x, conCamion: true } : x))}
                      className={`flex-1 h-10 rounded-md border-2 px-2 text-xs font-bold transition-all ${
                        p.conCamion === true
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {p.conCamion === true ? "✓ " : ""}Con camión
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeajes((prev) => prev.map((x) => x.id === p.id ? { ...x, conCamion: false } : x))}
                      className={`flex-1 h-10 rounded-md border-2 px-2 text-xs font-bold transition-all ${
                        p.conCamion === false
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {p.conCamion === false ? "✓ " : ""}Sin camión
                    </button>
                  </div>
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
            {peajes.length > 0 && (
              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Valor total</span>
                <span className="text-lg font-extrabold text-primary">${peajes.reduce((s, p) => s + (p.monto || 0), 0).toLocaleString("es-AR")}</span>
              </div>
            )}
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
