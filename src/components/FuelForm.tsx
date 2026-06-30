import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FuelEntry, generateId } from "@/lib/types";
import { MOVILES } from "@/lib/cenopData";
import { getActivePersonalNames } from "@/lib/personalStore";
import SearchableSelect from "@/components/SearchableSelect";
import { Camera, Plus, Upload, Fuel, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onAdd: (entry: FuelEntry) => void;
  selectedDate: string;
  existingEntries: FuelEntry[];
}

export default function FuelForm({ onAdd, selectedDate, existingEntries }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const allPersonal = getActivePersonalNames();

  const [monto, setMonto] = useState("");
  const [litros, setLitros] = useState("");
  const [movil, setMovil] = useState("");
  const [chofer, setChofer] = useState("");
  const [estacion, setEstacion] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [numeroRemito, setNumeroRemito] = useState("");
  const [lugarCarga, setLugarCarga] = useState("");
  const [obs, setObs] = useState("");
  const [ticketImage, setTicketImage] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const precioPorLitro =
    Number(litros) > 0 && Number(monto) > 0
      ? (Number(monto) / Number(litros)).toFixed(2)
      : "—";

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setTicketImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRemito = numeroRemito.trim();
    if (!trimmedRemito) {
      toast.error("El N° de Remito es obligatorio");
      return;
    }
    if (existingEntries.some((f) => f.numeroRemito.trim().toUpperCase() === trimmedRemito.toUpperCase())) {
      toast.error(`Ya existe una carga con el remito "${trimmedRemito}"`);
      return;
    }
    onAdd({
      id: generateId(),
      fecha: selectedDate,
      movil,
      chofer,
      monto: Number(monto),
      litros: Number(litros),
      precioPorLitro: Number(litros) > 0 ? Number(monto) / Number(litros) : 0,
      kilometraje,
      numeroRemito,
      lugarCarga,
      estacion,
      ticketImage,
      observaciones: obs,
    });
    setMonto("");
    setLitros("");
    setMovil("");
    setChofer("");
    setEstacion("");
    setKilometraje("");
    setNumeroRemito("");
    setLugarCarga("");
    setObs("");
    setTicketImage(undefined);
    setStep(1);
    setOpen(false);
  };

  const closeForm = () => {
    setStep(1);
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-9 gap-2 text-sm font-semibold">
        <Plus className="w-4 h-4" /> Cargar Combustible
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 border-primary/40 bg-foreground text-background">
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="section-title text-base">Carga de Combustible</h3>
          <p className="text-sm text-muted-foreground mt-1">Paso {step} de 3</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2" aria-label="Progreso de carga de combustible">
        {["Vehículo", "Carga", "Comprobante"].map((label, index) => (
          <div
            key={label}
            className={`rounded-md border px-3 py-2 text-center text-sm font-bold ${
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
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-base font-bold">Patente / Móvil</Label>
            <SearchableSelect options={MOVILES} value={movil} onChange={setMovil} placeholder="Seleccionar móvil..." />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-bold">Chofer asignado</Label>
            <SearchableSelect options={allPersonal} value={chofer} onChange={setChofer} placeholder="Seleccionar chofer..." />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-bold">Kilometraje actual</Label>
            <Input value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} placeholder="Ej: 125430" className="h-12 text-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-bold">Lugar de carga</Label>
            <Input value={lugarCarga} onChange={(e) => setLugarCarga(e.target.value)} placeholder="Ej: YPF Ezeiza" className="h-12 text-lg" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-base font-bold">Litros cargados</Label>
            <Input type="number" step="0.01" value={litros} onChange={(e) => setLitros(e.target.value)} className="h-12 text-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-bold">Monto de carga ($)</Label>
            <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className="h-12 text-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-bold flex items-center gap-2">
              <Fuel className="w-4 h-4" /> Precio por litro
            </Label>
            <div className="h-12 flex items-center px-4 rounded-md border border-input bg-background/70 text-lg font-mono font-bold text-primary">
              {precioPorLitro !== "—" ? `$${precioPorLitro}` : "—"}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-bold">N° Remito <span className="text-destructive">*</span></Label>
            <Input value={numeroRemito} onChange={(e) => setNumeroRemito(e.target.value)} className="h-12 text-lg" required />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-base font-bold">Estación</Label>
              <Input value={estacion} onChange={(e) => setEstacion(e.target.value)} className="h-12 text-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-bold">Observaciones</Label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} className="h-12 text-lg" />
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-md border border-border bg-background/60 p-4">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} className="h-12 gap-2 text-base">
              <Camera className="w-5 h-5" /> {ticketImage ? "Cambiar foto" : "Foto del ticket"}
            </Button>
            {ticketImage && (
              <div className="w-24 h-24 rounded border border-border overflow-hidden">
                <img src={ticketImage} alt="Ticket" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1} className="h-12 px-5 text-base gap-2">
          <ChevronLeft className="w-5 h-5" /> Anterior
        </Button>
        {step < 3 ? (
          <Button type="button" onClick={() => setStep((current) => Math.min(3, current + 1))} className="h-12 px-6 text-base gap-2">
            Siguiente <ChevronRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button type="submit" className="h-12 px-6 text-base gap-2">
            <Upload className="w-5 h-5" /> Guardar carga
          </Button>
        )}
      </div>
    </form>
  );
}
