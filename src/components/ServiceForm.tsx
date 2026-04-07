import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServiceEntry, generateId, calcTimeDiff, timeToMinutes, minutesToTime } from "@/lib/types";
import { Plus } from "lucide-react";

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

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const calculateHours = () => {
    // Productivas: iniciaServicio -> finalizaServicio
    const prod = calcTimeDiff(form.iniciaServicio, form.finalizaServicio);
    // Improductivas 1: salidaCenop -> iniciaServicio (traslado ida)
    const improd1 = calcTimeDiff(form.salidaCenop, form.iniciaServicio);
    // Improductivas 2: finalizaServicio -> llegadaCenop o franco (tiempo post servicio)
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
    });
    setForm(defaultEntry);
    setOpen(false);
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full gap-2">
        <Plus className="w-4 h-4" /> Cargar Nuevo Servicio
      </Button>
    );
  }

  const Field = ({ label, field, type = "text", placeholder = "" }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={(form as any)[field]}
        onChange={(e) => set(field, type === "number" ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
    </div>
  );

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
        <Field label="Cliente" field="cliente" placeholder="Ej: SATRO" />
        <Field label="Lugar de Salida" field="lugarSalida" placeholder="Ej: Villa Celina" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Destino" field="destino" />
        <Field label="Móvil" field="movil" placeholder="Ej: RAM 301" />
        <Field label="Patente/Celular" field="celular" />
        <Field label="Orden de Carga" field="ordenCarga" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Chofer" field="chofer" />
        <Field label="Cita Chofer" field="citaChofer" type="time" />
        <Field label="Custodio" field="custodio" />
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

      <Button type="submit" className="w-full gap-2">
        <Plus className="w-4 h-4" /> Guardar Servicio
      </Button>
    </form>
  );
}
