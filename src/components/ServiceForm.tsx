import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServiceEntry, PeajeEntry, ComisionEntry, ServicioOperacionesEntry, generateId, calcTimeDiff, timeToMinutes, minutesToTime } from "@/lib/types";
import { MOVILES, MOVIL_TELEFONO } from "@/lib/cenopData";
import { getActiveClientNames } from "@/lib/clientStore";
import { getPersonal, getActivePersonalNames } from "@/lib/personalStore";
import SearchableSelect from "@/components/SearchableSelect";
import TimeInput from "@/components/TimeInput";
import { Plus, Trash2, CircleDollarSign, Briefcase, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onAdd: (entry: ServiceEntry) => void;
  selectedDate: string;
  existingServices: ServiceEntry[];
}

const defaultEntry = {
  solicitud: 1,
  fechaServicio: "",
  horaSolicitud: "",
  cliente: "",
  lugarSalida: "",
  destino: "",
  chofer: "",
  citaChofer: "",
  custodio: "",
  citaCustodio: "",
  movil: "",
  celular: "",
  salidaCenop: "",
  llegadaServicio: "",
  iniciaServicio: "",
  llegadaDestino: "",
  finalizaServicio: "",
  llegadaCenop: "",
  horaFrancoChofer: "",
  horaFrancoCustodio: "",
  ordenCarga: "",
  remito: "",
  continuaOrden: "",
  observaciones: "",
};

export default function ServiceForm({ onAdd, selectedDate, existingServices }: Props) {
  const [form, setForm] = useState(defaultEntry);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [peajes, setPeajes] = useState<PeajeEntry[]>([]);
  const [comisiones, setComisiones] = useState<ComisionEntry[]>([]);
  const [serviciosOp, setServiciosOp] = useState<ServicioOperacionesEntry[]>([]);
  const [tipoCenopOp, setTipoCenopOp] = useState<"ninguno" | "cenop_en_op" | "op_en_cenop">("ninguno");

  const allPersonalEntries = getPersonal();
  const allPersonal = getActivePersonalNames();
  const clientesList = getActiveClientNames();

  // Badge map: show role abbreviations next to each name
  const roleBadgeMap = useMemo(() => {
    const map: Record<string, string> = {};
    allPersonalEntries.forEach((p) => {
      const tags: string[] = [];
      if (p.roles.includes("operaciones")) tags.push("OP");
      if (p.roles.includes("chofer")) tags.push("CH");
      if (p.roles.includes("custodio")) tags.push("CU");
      if (tags.length > 0) map[p.nombre] = tags.join(" ");
    });
    return map;
  }, [allPersonalEntries]);

  const opsBadgeMap = useMemo(() => {
    const map: Record<string, string> = {};
    allPersonalEntries.forEach((p) => {
      if (p.roles.includes("operaciones")) map[p.nombre] = "OP";
    });
    return map;
  }, [allPersonalEntries]);

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setMovil = (value: string) => {
    setForm((prev) => ({
      ...prev,
      movil: value,
      celular: MOVIL_TELEFONO[value] || prev.celular,
    }));
  };

  // Peajes
  const addPeaje = () => {
    setPeajes((prev) => [...prev, { id: generateId(), ubicacion: "", monto: 0 }]);
  };

  const updatePeaje = (id: string, field: keyof Omit<PeajeEntry, "id">, value: string | number) => {
    setPeajes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removePeaje = (id: string) => {
    setPeajes((prev) => prev.filter((p) => p.id !== id));
  };

  const totalPeajes = peajes.reduce((sum, p) => sum + (p.monto || 0), 0);

  // Servicios Operaciones
  const addServicioOp = () => {
    setServiciosOp((prev) => [...prev, { id: generateId(), cliente: "", descripcion: "", persona: "", horaInicio: "", horaFin: "" }]);
  };

  const updateServicioOp = (id: string, field: keyof Omit<ServicioOperacionesEntry, "id">, value: string) => {
    setServiciosOp((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeServicioOp = (id: string) => {
    setServiciosOp((prev) => prev.filter((s) => s.id !== id));
  };

  // Comisiones
  const addComision = () => {
    setComisiones((prev) => [...prev, { id: generateId(), descripcion: "", persona: "", horaInicio: "", horaFin: "" }]);
  };

  const updateComision = (id: string, field: keyof Omit<ComisionEntry, "id">, value: string | number) => {
    setComisiones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeComision = (id: string) => {
    setComisiones((prev) => prev.filter((c) => c.id !== id));
  };

  const calculateHours = () => {
    const prod = calcTimeDiff(form.iniciaServicio, form.finalizaServicio);
    const improd1 = calcTimeDiff(form.salidaCenop, form.iniciaServicio);
    const endTime = form.horaFrancoChofer || form.horaFrancoCustodio || form.llegadaCenop;
    const improd2 = calcTimeDiff(form.finalizaServicio, endTime);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      setStep((current) => Math.min(5, current + 1));
      return;
    }
    const trimmedRemito = form.remito.trim();
    if (trimmedRemito && existingServices.some((s) => s.remito.trim().toUpperCase() === trimmedRemito.toUpperCase())) {
      toast.error(`Ya existe un servicio con el remito "${trimmedRemito}"`);
      return;
    }
    const fechaFinal = form.fechaServicio || selectedDate;
    if (!isValidDate(fechaFinal)) {
      toast.error("La fecha del servicio no es válida o no existe");
      return;
    }
    if (isFutureDate(fechaFinal)) {
      toast.error("La fecha del servicio no puede ser futura");
      return;
    }
    const hours = calculateHours();
    const candidate: ServiceEntry = {
      ...form,
      ...hours,
      id: generateId(),
      fecha: fechaFinal,
      peajes: peajes.length > 0 ? peajes : undefined,
      comisiones: comisiones.length > 0 ? comisiones : undefined,
      serviciosOperaciones: serviciosOp.length > 0 ? serviciosOp : undefined,
      choferEsOperaciones: !!opsBadgeMap[form.chofer],
      custodioEsOperaciones: !!opsBadgeMap[form.custodio],
      tipoCenopOp,
    };
    const collisions = findServiceCollisions(candidate, existingServices);
    if (collisions.length > 0) {
      formatCollisionMessages(collisions).forEach((m) => toast.error(m));
      return;
    }
    onAdd(candidate);
    setForm(defaultEntry);
    setPeajes([]);
    setComisiones([]);
    setServiciosOp([]);
    setTipoCenopOp("ninguno");
    setStep(1);
    setOpen(false);
  };

  const closeForm = () => {
    setStep(1);
    setOpen(false);
  };

  const focusNextTimeInput = (currentField: string) => {
    const timeFields = ["horaSolicitud", "citaChofer", "citaCustodio", "salidaCenop", "llegadaServicio", "iniciaServicio", "llegadaDestino", "finalizaServicio", "llegadaCenop", "horaFrancoChofer", "horaFrancoCustodio"];
    const idx = timeFields.indexOf(currentField);
    if (idx < 0 || idx >= timeFields.length - 1) return;
    const nextField = timeFields[idx + 1];
    const nextInput = document.querySelector(`[data-timefield="${nextField}"] input`) as HTMLInputElement;
    nextInput?.focus();
  };

  const renderField = ({ label, field, type = "text", placeholder = "" }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-bold text-background">{label}</Label>
      {type === "time" ? (
        <div data-timefield={field}>
          <TimeInput
            value={(form as any)[field]}
            onChange={(v) => set(field, v)}
            onComplete={() => focusNextTimeInput(field)}
            className="h-9 text-sm bg-background text-foreground border-input"
          />
        </div>
      ) : (
        <Input
          type={type}
          value={(form as any)[field]}
          onChange={(e) => set(field, type === "number" ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm bg-background text-foreground border-input placeholder:text-muted-foreground"
        />
      )}
    </div>
  );

  const renderSelectField = ({ label, field, options, onCustomChange, showBadges }: { label: string; field: string; options: string[]; onCustomChange?: (v: string) => void; showBadges?: boolean }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-bold text-background">{label}</Label>
      <SearchableSelect
        options={options}
        value={(form as any)[field]}
        onChange={onCustomChange || ((v) => set(field, v))}
        placeholder={`Seleccionar...`}
        inputClassName="h-9 text-sm bg-background text-foreground border-input"
        badgeMap={showBadges ? opsBadgeMap : undefined}
      />
    </div>
  );

  return (
    <>
      <Button
        onClick={() => {
          setForm({ ...defaultEntry, fechaServicio: selectedDate || new Date().toISOString().slice(0, 10) });
          setOpen(true);
        }}
        className="h-9 gap-2 text-sm font-semibold"
      >
        <Plus className="w-4 h-4" /> Cargar Servicio
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 border-primary/40 bg-foreground text-background">
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-widest text-primary">Nuevo Servicio</h3>
                <p className="text-xs font-semibold text-muted">Paso {step} de 5</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeForm} className="h-8 text-background hover:text-background">
                Cancelar
              </Button>
            </div>


      <div className="grid grid-cols-5 gap-1.5" aria-label="Progreso de carga de servicio">
        {["Solicitud", "Destino", "Personal", "Horarios", "Extras"].map((label, index) => {
          const targetStep = index + 1;

          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(targetStep)}
              aria-current={step === targetStep ? "step" : undefined}
              className={`rounded-md border px-2 py-2 text-center text-xs font-extrabold transition-colors ${
                step === targetStep
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-3">
          {renderField({ label: "Fecha del servicio", field: "fechaServicio", type: "date" })}
          {renderField({ label: "Solicitud de Custodia", field: "horaSolicitud", type: "time" })}
          {renderSelectField({ label: "Cliente", field: "cliente", options: clientesList })}
          {renderField({ label: "Lugar de Salida", field: "lugarSalida", placeholder: "Ej: Villa Celina" })}
        </div>
      )}

      {step === 2 && (
        <div className="grid md:grid-cols-2 gap-3">
          {renderField({ label: "Destino", field: "destino" })}
          {renderSelectField({ label: "Móvil", field: "movil", options: MOVILES, onCustomChange: setMovil })}
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-background">Celular</Label>
            <Input value={form.celular} readOnly className="h-9 text-sm bg-background text-foreground border-input" />
          </div>
          {renderField({ label: "Orden de Carga Cliente", field: "ordenCarga" })}
        </div>
      )}

      {step === 3 && (
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-background flex items-center gap-2">
              Chofer
              {form.chofer && opsBadgeMap[form.chofer] && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-secondary text-secondary-foreground border border-border">OP</span>
              )}
            </Label>
            <SearchableSelect options={allPersonal} value={form.chofer} onChange={(v) => set("chofer", v)} placeholder="Seleccionar..." badgeMap={roleBadgeMap} inputClassName="h-9 text-sm bg-background text-foreground border-input" />
          </div>
          {renderField({ label: "Cita Chofer", field: "citaChofer", type: "time" })}
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-background flex items-center gap-2">
              Custodio
              {form.custodio && opsBadgeMap[form.custodio] && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-secondary text-secondary-foreground border border-border">OP</span>
              )}
            </Label>
            <SearchableSelect options={allPersonal} value={form.custodio} onChange={(v) => set("custodio", v)} placeholder="Seleccionar..." badgeMap={roleBadgeMap} inputClassName="h-9 text-sm bg-background text-foreground border-input" />
          </div>
          {renderField({ label: "Cita Custodio", field: "citaCustodio", type: "time" })}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Horarios del Servicio</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {renderField({ label: "Salida de CENOP", field: "salidaCenop", type: "time" })}
            {renderField({ label: "Llegada a Servicio", field: "llegadaServicio", type: "time" })}
            {renderField({ label: "Inicia Servicio", field: "iniciaServicio", type: "time" })}
            {renderField({ label: "Llegada a Destino", field: "llegadaDestino", type: "time" })}
            {renderField({ label: "Finaliza Servicio", field: "finalizaServicio", type: "time" })}
            {renderField({ label: "Llegada a CENOP", field: "llegadaCenop", type: "time" })}
            {renderField({ label: "Hora Franco Chofer", field: "horaFrancoChofer", type: "time" })}
            {renderField({ label: "Hora Franco Custodio", field: "horaFrancoCustodio", type: "time" })}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-3 gap-5">
            {renderField({ label: "N° Remito", field: "remito" })}
            {renderField({ label: "Continúa Orden N°", field: "continuaOrden" })}
            {renderField({ label: "Observaciones", field: "observaciones" })}
          </div>
          <div className="rounded-md border border-primary/40 bg-background p-4 text-foreground space-y-4">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-3">Servicios Cruzados — Tipo</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { value: "ninguno", label: "Ninguno" },
                  { value: "cenop_en_op", label: "CENOP en Operaciones" },
                  { value: "op_en_cenop", label: "Operaciones en CENOP" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTipoCenopOp(opt.value as typeof tipoCenopOp)}
                    className={`h-12 rounded-md border-2 px-4 text-sm font-bold transition-all ${
                      tipoCenopOp === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {tipoCenopOp !== "ninguno" && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Detalle de servicios cruzados</p>
                  <Button type="button" variant="outline" onClick={addServicioOp} className="h-10 gap-2 text-sm">
                    <Building2 className="w-4 h-4" /> Agregar
                  </Button>
                </div>
                {serviciosOp.map((sop, idx) => {
                  const dur = sop.horaInicio && sop.horaFin ? calcTimeDiff(sop.horaInicio, sop.horaFin) : "";
                  return (
                  <div key={sop.id} className="rounded-md border border-border bg-card/40 p-3 mb-3 space-y-3">
                    <div className="grid md:grid-cols-[12rem_1fr_3rem] items-end gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Cliente #{idx + 1}</Label>
                        <SearchableSelect options={clientesList} value={sop.cliente} onChange={(v) => updateServicioOp(sop.id, "cliente", v)} placeholder="Cliente..." inputClassName="h-11 text-base" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Descripción</Label>
                        <Input value={sop.descripcion} onChange={(e) => updateServicioOp(sop.id, "descripcion", e.target.value)} placeholder="Ej: Apoyo operativo" className="h-11 text-base" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-destructive" onClick={() => removeServicioOp(sop.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-[1fr_8rem_8rem_8rem] items-end gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Realizado por</Label>
                        <SearchableSelect options={allPersonal} value={sop.persona} onChange={(v) => updateServicioOp(sop.id, "persona", v)} placeholder="Chofer/Custodio..." inputClassName="h-11 text-base" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Hora inicio</Label>
                        <TimeInput value={sop.horaInicio} onChange={(v) => updateServicioOp(sop.id, "horaInicio", v)} className="h-11 text-base" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Hora fin</Label>
                        <TimeInput value={sop.horaFin} onChange={(v) => updateServicioOp(sop.id, "horaFin", v)} className="h-11 text-base" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Duración</Label>
                        <div className="h-11 flex items-center justify-center rounded-md border border-border bg-muted/30 text-sm font-mono font-bold text-primary">{dur || "—"}</div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="grid gap-4">
            <div className="rounded-md border border-border bg-background p-4 text-foreground">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Peajes</p>
                <div className="flex items-center gap-3">
                  {peajes.length > 0 && <span className="text-sm font-bold text-primary">Total: ${totalPeajes.toLocaleString("es-AR")}</span>}
                  <Button type="button" variant="outline" onClick={addPeaje} className="h-10 gap-2 text-sm">
                    <CircleDollarSign className="w-4 h-4" /> Agregar Peaje
                  </Button>
                </div>
              </div>
              {peajes.map((peaje, idx) => (
                <div key={peaje.id} className="grid md:grid-cols-[1fr_9rem_3rem] items-end gap-3 mb-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Ubicación #{idx + 1}</Label>
                    <Input value={peaje.ubicacion} onChange={(e) => updatePeaje(peaje.id, "ubicacion", e.target.value)} placeholder="Ej: Peaje Dock Sud" className="h-11 text-base" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Monto ($)</Label>
                    <Input type="number" value={peaje.monto || ""} onChange={(e) => updatePeaje(peaje.id, "monto", Number(e.target.value))} className="h-11 text-base" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-destructive" onClick={() => removePeaje(peaje.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-border bg-background p-4 text-foreground">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Comisiones Productivas</p>
                <Button type="button" variant="outline" onClick={addComision} className="h-10 gap-2 text-sm">
                  <Briefcase className="w-4 h-4" /> Agregar Comisión
                </Button>
              </div>
              {comisiones.map((comision, idx) => {
                const dur = comision.horaInicio && comision.horaFin ? calcTimeDiff(comision.horaInicio, comision.horaFin) : "";
                return (
                <div key={comision.id} className="rounded-md border border-border bg-card/40 p-3 mb-3 space-y-3">
                  <div className="grid md:grid-cols-[1fr_3rem] items-end gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">Descripción #{idx + 1}</Label>
                      <Input value={comision.descripcion} onChange={(e) => updateComision(comision.id, "descripcion", e.target.value)} placeholder="Ej: Comisión de entrega" className="h-11 text-base" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-destructive" onClick={() => removeComision(comision.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-[1fr_8rem_8rem_8rem] items-end gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">Realizado por</Label>
                      <SearchableSelect options={allPersonal} value={comision.persona} onChange={(v) => updateComision(comision.id, "persona", v)} placeholder="Chofer/Custodio..." inputClassName="h-11 text-base" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">Hora inicio</Label>
                      <TimeInput value={comision.horaInicio} onChange={(v) => updateComision(comision.id, "horaInicio", v)} className="h-11 text-base" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">Hora fin</Label>
                      <TimeInput value={comision.horaFin} onChange={(v) => updateComision(comision.id, "horaFin", v)} className="h-11 text-base" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">Duración</Label>
                      <div className="h-11 flex items-center justify-center rounded-md border border-border bg-muted/30 text-sm font-mono font-bold text-primary">{dur || "—"}</div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1} className="h-9 px-4 text-sm gap-2 bg-background text-foreground">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </Button>
        {step < 5 ? (
          <Button type="button" onClick={() => setStep((current) => Math.min(5, current + 1))} className="h-9 px-5 text-sm gap-2">
            Siguiente <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button type="submit" className="h-9 px-5 text-sm gap-2">
            <Plus className="w-4 h-4" /> Guardar Servicio
          </Button>
        )}
      </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
