import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServiceEntry, PeajeEntry, generateId, calcTimeDiff, timeToMinutes, minutesToTime } from "@/lib/types";
import { MOVILES, CLIENTES, MOVIL_TELEFONO } from "@/lib/cenopData";
import { getPersonal, getActivePersonalNames } from "@/lib/personalStore";
import SearchableSelect from "@/components/SearchableSelect";
import TimeInput from "@/components/TimeInput";
import { Plus, Trash2, CircleDollarSign } from "lucide-react";

interface Props {
  onAdd: (entry: ServiceEntry) => void;
  selectedDate: string;
}

const defaultEntry = {
  solicitud: 1,
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

export default function ServiceForm({ onAdd, selectedDate }: Props) {
  const [form, setForm] = useState(defaultEntry);
  const [open, setOpen] = useState(false);
  const [peajes, setPeajes] = useState<PeajeEntry[]>([]);

  const allPersonalEntries = getPersonal();
  const allPersonal = getActivePersonalNames();

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
    const hours = calculateHours();
    onAdd({
      ...form,
      ...hours,
      id: generateId(),
      fecha: selectedDate,
      peajes: peajes.length > 0 ? peajes : undefined,
      choferEsOperaciones: !!opsBadgeMap[form.chofer],
      custodioEsOperaciones: !!opsBadgeMap[form.custodio],
    });
    setForm(defaultEntry);
    setPeajes([]);
    setOpen(false);
  };

  const focusNextTimeInput = (currentField: string) => {
    const timeFields = ["horaSolicitud", "citaChofer", "citaCustodio", "salidaCenop", "llegadaServicio", "iniciaServicio", "llegadaDestino", "finalizaServicio", "llegadaCenop", "horaFrancoChofer", "horaFrancoCustodio"];
    const idx = timeFields.indexOf(currentField);
    if (idx < 0 || idx >= timeFields.length - 1) return;
    const nextField = timeFields[idx + 1];
    const nextInput = document.querySelector(`[data-timefield="${nextField}"]`) as HTMLInputElement;
    nextInput?.focus();
  };

  const Field = ({ label, field, type = "text", placeholder = "" }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {type === "time" ? (
        <div data-timefield={field}>
          <TimeInput
            value={(form as any)[field]}
            onChange={(v) => set(field, v)}
            onComplete={() => focusNextTimeInput(field)}
          />
        </div>
      ) : (
        <Input
          type={type}
          value={(form as any)[field]}
          onChange={(e) => set(field, type === "number" ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
      )}
    </div>
  );

  const SelectField = ({ label, field, options, onCustomChange, showBadges }: { label: string; field: string; options: string[]; onCustomChange?: (v: string) => void; showBadges?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <SearchableSelect
        options={options}
        value={(form as any)[field]}
        onChange={onCustomChange || ((v) => set(field, v))}
        placeholder={`Seleccionar...`}
        badgeMap={showBadges ? opsBadgeMap : undefined}
      />
    </div>
  );

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full gap-2">
        <Plus className="w-4 h-4" /> Cargar Nuevo Servicio
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-title text-sm">Nuevo Servicio</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="N° Solicitud" field="solicitud" type="number" />
        <Field label="Hora Solicitud" field="horaSolicitud" type="time" />
        <SelectField label="Cliente" field="cliente" options={CLIENTES} />
        <Field label="Lugar de Salida" field="lugarSalida" placeholder="Ej: Villa Celina" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Destino" field="destino" />
        <SelectField label="Móvil" field="movil" options={MOVILES} onCustomChange={setMovil} />
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Celular</Label>
          <Input value={form.celular} readOnly className="h-9 text-sm bg-muted/50" />
        </div>
        <Field label="Orden de Carga" field="ordenCarga" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            Chofer
            {form.chofer && opsBadgeMap[form.chofer] && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">OP</span>
            )}
          </Label>
          <SearchableSelect options={allPersonal} value={form.chofer} onChange={(v) => set("chofer", v)} placeholder="Seleccionar..." badgeMap={roleBadgeMap} />
        </div>
        <Field label="Cita Chofer" field="citaChofer" type="time" />
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            Custodio
            {form.custodio && opsBadgeMap[form.custodio] && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">OP</span>
            )}
          </Label>
          <SearchableSelect options={allPersonal} value={form.custodio} onChange={(v) => set("custodio", v)} placeholder="Seleccionar..." badgeMap={roleBadgeMap} />
        </div>
        <Field label="Cita Custodio" field="citaCustodio" type="time" />
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Horarios del Servicio</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Field label="Salida CENOP" field="salidaCenop" type="time" />
          <Field label="Llegada Servicio" field="llegadaServicio" type="time" />
          <Field label="Inicia Servicio" field="iniciaServicio" type="time" />
          <Field label="Llegada Destino" field="llegadaDestino" type="time" />
          <Field label="Finaliza Servicio" field="finalizaServicio" type="time" />
          <Field label="Llegada CENOP" field="llegadaCenop" type="time" />
          <Field label="Franco Chofer" field="horaFrancoChofer" type="time" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Franco Custodio" field="horaFrancoCustodio" type="time" />
        <Field label="N° Remito" field="remito" />
        <Field label="Continúa Orden N°" field="continuaOrden" />
        <Field label="Observaciones" field="observaciones" />
      </div>

      {/* Peajes */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Peajes</p>
          <div className="flex items-center gap-3">
            {peajes.length > 0 && (
              <span className="text-xs font-semibold text-primary">
                Total: ${totalPeajes.toLocaleString("es-AR")}
              </span>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addPeaje} className="h-7 gap-1 text-xs">
              <CircleDollarSign className="w-3.5 h-3.5" /> Agregar Peaje
            </Button>
          </div>
        </div>
        {peajes.map((peaje, idx) => (
          <div key={peaje.id} className="flex items-end gap-2 mb-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Ubicación #{idx + 1}</Label>
              <Input
                value={peaje.ubicacion}
                onChange={(e) => updatePeaje(peaje.id, "ubicacion", e.target.value)}
                placeholder="Ej: Peaje Dock Sud"
                className="h-9 text-sm"
              />
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-xs text-muted-foreground">Monto ($)</Label>
              <Input
                type="number"
                value={peaje.monto || ""}
                onChange={(e) => updatePeaje(peaje.id, "monto", Number(e.target.value))}
                className="h-9 text-sm"
              />
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removePeaje(peaje.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="submit" className="w-full gap-2">
        <Plus className="w-4 h-4" /> Guardar Servicio
      </Button>
    </form>
  );
}
