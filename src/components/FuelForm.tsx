import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FuelEntry, generateId } from "@/lib/types";
import { MOVILES } from "@/lib/cenopData";
import { getActivePersonalNames } from "@/lib/personalStore";
import SearchableSelect from "@/components/SearchableSelect";
import { Camera, Plus, Upload, Fuel } from "lucide-react";

interface Props {
  onAdd: (entry: FuelEntry) => void;
  selectedDate: string;
}

export default function FuelForm({ onAdd, selectedDate }: Props) {
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full gap-2">
        <Plus className="w-4 h-4" /> Cargar Combustible
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-title text-sm">Carga de Combustible</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Patente (Móvil)</Label>
          <SearchableSelect options={MOVILES} value={movil} onChange={setMovil} placeholder="Seleccionar..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Asignación (Chofer)</Label>
          <SearchableSelect options={allPersonal} value={chofer} onChange={setChofer} placeholder="Seleccionar..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Kilometraje Actual</Label>
          <Input value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} placeholder="Ej: 125430" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Lugar de Carga</Label>
          <Input value={lugarCarga} onChange={(e) => setLugarCarga(e.target.value)} placeholder="Ej: YPF Ezeiza" className="h-9 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Litros Cargados</Label>
          <Input type="number" step="0.01" value={litros} onChange={(e) => setLitros(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Monto de Carga ($)</Label>
          <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Fuel className="w-3 h-3" /> Precio por Litro
          </Label>
          <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm font-mono font-semibold text-primary">
            {precioPorLitro !== "—" ? `$${precioPorLitro}` : "—"}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">N° Remito</Label>
          <Input value={numeroRemito} onChange={(e) => setNumeroRemito(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Estación</Label>
          <Input value={estacion} onChange={(e) => setEstacion(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Observaciones</Label>
          <Input value={obs} onChange={(e) => setObs(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
        <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
          <Camera className="w-4 h-4" /> {ticketImage ? "Cambiar Foto" : "Foto del Ticket"}
        </Button>
        {ticketImage && (
          <div className="w-16 h-16 rounded border border-border overflow-hidden">
            <img src={ticketImage} alt="Ticket" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <Button type="submit" className="w-full gap-2">
        <Upload className="w-4 h-4" /> Guardar Carga
      </Button>
    </form>
  );
}
