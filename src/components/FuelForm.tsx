import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FuelEntry, generateId } from "@/lib/types";
import { isValidDate, isValidTime, findFuelDuplicate } from "@/lib/validation";
import { LUGARES_CARGA, TIPOS_COMBUSTIBLE } from "@/lib/movilesData";
import { getMoviles } from "@/lib/movilesStore";

import SearchableSelect from "@/components/SearchableSelect";
import { Camera, Plus, Upload, Fuel, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onAdd: (entry: FuelEntry) => void;
  selectedDate: string;
  existingEntries: FuelEntry[];
  allEntries?: FuelEntry[]; // para buscar KM anterior
}

const defaultState = {
  fecha: "",
  hora: "",
  movil: "",
  chofer: "",
  numeroRemito: "",
  litros: "",
  kilometraje: "",
  monto: "",
  lugarCarga: "",
  marca: "",
  modelo: "",
  anio: "",
  consumoIdeal: "",
  tipoCombustible: "",
  estacion: "",
  observaciones: "",
};

export default function FuelForm({ onAdd, selectedDate, existingEntries, allEntries }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...defaultState });
  const [ticketImage, setTicketImage] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const movilesList = useMemo(() => getMoviles().filter((m) => m.activo), [open]);
  const patentes = useMemo(() => movilesList.map((m) => m.patente), [movilesList]);

  const historyEntries = allEntries ?? existingEntries;


  useEffect(() => {
    if (open && !form.fecha) {
      const now = new Date();
      setForm((p) => ({
        ...p,
        fecha: selectedDate || now.toISOString().slice(0, 10),
        hora: now.toTimeString().slice(0, 5),
      }));
    }
  }, [open, selectedDate]);

  const set = (field: keyof typeof defaultState, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  // Autocomplete al elegir móvil
  const handleMovil = (value: string) => {
    const info = movilesList.find((m) => m.patente === value);
    setForm((p) => ({
      ...p,
      movil: value,
      chofer: info?.asignacion || p.chofer,
      marca: info?.marca || "",
      modelo: info?.modelo || "",
      anio: info?.anio ? String(info.anio) : "",
      consumoIdeal: info?.consumoIdeal ? String(info.consumoIdeal) : "",
      tipoCombustible: info?.tipoCombustible || "",
      lugarCarga: info?.lugarCarga || p.lugarCarga,
    }));
  };


  // KM anterior del móvil (última carga histórica antes de esta fecha/hora)
  const kmAnterior = useMemo(() => {
    if (!form.movil) return "";
    const previas = historyEntries
      .filter((e) => e.movil === form.movil && e.kilometraje)
      .sort((a, b) => `${b.fecha} ${b.hora || ""}`.localeCompare(`${a.fecha} ${a.hora || ""}`));
    return previas[0]?.kilometraje || "";
  }, [form.movil, historyEntries]);

  const kmRecorridos = useMemo(() => {
    const a = Number(kmAnterior);
    const b = Number(form.kilometraje);
    if (!a || !b) return "";
    return String(b - a);
  }, [kmAnterior, form.kilometraje]);

  const precioPorLitro =
    Number(form.litros) > 0 && Number(form.monto) > 0
      ? (Number(form.monto) / Number(form.litros)).toFixed(2)
      : "";

  const kmPorLitro =
    Number(kmRecorridos) > 0 && Number(form.litros) > 0
      ? (Number(kmRecorridos) / Number(form.litros)).toFixed(2)
      : "";

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setTicketImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setForm({ ...defaultState });
    setTicketImage(undefined);
    setStep(1);
  };

  const closeForm = () => {
    reset();
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRemito = form.numeroRemito.trim();
    if (!trimmedRemito) {
      toast.error("El N° de Remito es obligatorio");
      return;
    }
    if (existingEntries.some((f) => f.numeroRemito.trim().toUpperCase() === trimmedRemito.toUpperCase())) {
      toast.error(`Ya existe una carga con el remito "${trimmedRemito}"`);
      return;
    }
    if (!form.movil) {
      toast.error("Seleccioná una patente");
      return;
    }
    if (!isValidDate(form.fecha)) {
      toast.error("La fecha no es válida o no existe");
      return;
    }
    if (form.hora && !isValidTime(form.hora)) {
      toast.error("La hora no es válida");
      return;
    }
    const candidate: FuelEntry = {
      id: generateId(),
      fecha: form.fecha,
      hora: form.hora,
      movil: form.movil,
      chofer: form.chofer,
      monto: Number(form.monto) || 0,
      litros: Number(form.litros) || 0,
      precioPorLitro: Number(precioPorLitro) || 0,
      kilometraje: form.kilometraje,
      kmAnterior: kmAnterior || "PRIMER REGISTRO",
      kmRecorridos,
      kmPorLitro,
      numeroRemito: form.numeroRemito,
      lugarCarga: form.lugarCarga,
      estacion: form.estacion,
      marca: form.marca,
      modelo: form.modelo,
      anio: form.anio,
      consumoIdeal: form.consumoIdeal,
      tipoCombustible: form.tipoCombustible,
      ticketImage,
      observaciones: form.observaciones,
    };
    const dup = findFuelDuplicate(candidate, historyEntries);
    if (dup) {
      toast.error(`Ya existe una carga del móvil ${dup.movil} el ${dup.fecha}${dup.hora ? ` a las ${dup.hora}` : ""}`);
      return;
    }
    if (kmAnterior && Number(form.kilometraje) > 0 && Number(form.kilometraje) < Number(kmAnterior)) {
      toast.error(`El KM actual (${form.kilometraje}) es menor que el KM anterior (${kmAnterior})`);
      return;
    }
    onAdd(candidate);
    closeForm();
  };

  const renderInput = (
    label: string,
    field: keyof typeof defaultState,
    type: string = "text",
    placeholder?: string,
    readOnly = false,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-bold">{label}</Label>
      <Input
        type={type}
        value={form[field]}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="h-9 text-sm bg-background text-foreground border-input"
      />
    </div>
  );

  const renderReadonly = (label: string, value: string) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-bold">{label}</Label>
      <div className="h-9 flex items-center px-3 rounded-md border border-input bg-background/70 text-sm font-mono text-muted-foreground">
        {value || "—"}
      </div>
    </div>
  );

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-9 gap-2 text-sm font-semibold">
        <Plus className="w-4 h-4" /> Cargar Combustible
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 border-primary/40 bg-foreground text-background">
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="section-title text-base">Carga de Combustible</h3>
                <p className="text-xs text-muted-foreground mt-1">Paso {step} de 3</p>
              </div>
              <Button type="button" size="sm" onClick={closeForm} className="bg-background text-foreground hover:bg-background/90">
                Cancelar
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["Vehículo", "Carga", "Comprobante"].map((label, index) => (
                <div
                  key={label}
                  className={`rounded-md border px-3 py-1.5 text-center text-xs font-bold ${
                    step === index + 1
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background/60 text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="grid md:grid-cols-2 gap-3">
                {renderInput("Fecha", "fecha", "date")}
                {renderInput("Hora", "hora", "time")}
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">Patente / Móvil</Label>
                  <SearchableSelect options={MOVILES} value={form.movil} onChange={handleMovil} placeholder="Seleccionar móvil..." />
                </div>
                {renderInput("Asignación (Chofer)", "chofer", "text", "Auto desde móvil")}
                {renderReadonly("Marca", form.marca)}
                {renderReadonly("Modelo", form.modelo)}
                {renderReadonly("Año", form.anio)}
                {renderReadonly("Consumo ideal (L/100km)", form.consumoIdeal)}
              </div>
            )}

            {step === 2 && (
              <div className="grid md:grid-cols-2 gap-3">
                {renderInput("N° Remito *", "numeroRemito")}
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">Tipo de combustible</Label>
                  <SearchableSelect options={TIPOS_COMBUSTIBLE} value={form.tipoCombustible} onChange={(v) => set("tipoCombustible", v)} placeholder="Seleccionar..." />
                </div>
                {renderInput("Litros cargados", "litros", "number")}
                {renderInput("Monto de carga ($)", "monto", "number")}
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Fuel className="w-4 h-4" /> Precio por litro
                  </Label>
                  <div className="h-9 flex items-center px-3 rounded-md border border-input bg-background/70 text-sm font-mono font-bold text-primary">
                    {precioPorLitro ? `$${precioPorLitro}` : "—"}
                  </div>
                </div>
                {renderInput("KM actual", "kilometraje", "number")}
                {renderReadonly("KM anterior", kmAnterior || "PRIMER REGISTRO")}
                {renderReadonly("KM recorridos", kmRecorridos)}
                {renderReadonly("KM por litro", kmPorLitro)}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold">Lugar de carga</Label>
                    <SearchableSelect options={LUGARES_CARGA} value={form.lugarCarga} onChange={(v) => set("lugarCarga", v)} placeholder="Seleccionar..." />
                  </div>
                  {renderInput("Estación / detalle", "estacion", "text", "Opcional")}
                  <div className="md:col-span-2">
                    {renderInput("Observaciones", "observaciones")}
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-md border border-border bg-background/60 p-3">
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
                  <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} className="h-9 gap-2 text-sm">
                    <Camera className="w-4 h-4" /> {ticketImage ? "Cambiar foto" : "Foto del ticket"}
                  </Button>
                  {ticketImage && (
                    <div className="w-20 h-20 rounded border border-border overflow-hidden">
                      <img src={ticketImage} alt="Ticket" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="h-9 px-4 text-sm gap-2 bg-background text-foreground hover:bg-background/90 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
              {step < 3 ? (
                <Button type="button" onClick={() => setStep((s) => Math.min(3, s + 1))} className="h-9 px-5 text-sm gap-2">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button type="submit" className="h-9 px-5 text-sm gap-2">
                  <Upload className="w-4 h-4" /> Guardar carga
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
