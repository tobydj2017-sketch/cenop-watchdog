import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/SearchableSelect";
import { FuelEntry } from "@/lib/types";
import { getMoviles } from "@/lib/movilesStore";
import { LUGARES_CARGA, TIPOS_COMBUSTIBLE } from "@/lib/movilesData";
import { uploadDataUrlBlob, getBlobAccessUrl } from "@/lib/azureBlob";
import { Camera, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  entry: FuelEntry | null;
  open: boolean;
  onClose: () => void;
  onSave: (entry: FuelEntry) => void;
  existingEntries: FuelEntry[];
}

export default function FuelEditDialog({ entry, open, onClose, onSave, existingEntries }: Props) {
  const [form, setForm] = useState<FuelEntry | null>(entry);
  const [saving, setSaving] = useState(false);
  const [newTicketDataUrl, setNewTicketDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setForm(entry);
    setNewTicketDataUrl(null);
    setSaving(false);
  }, [entry]);

  const movilesList = useMemo(() => getMoviles().filter((m) => m.activo), [open]);
  const patentes = useMemo(() => movilesList.map((m) => m.patente), [movilesList]);

  if (!form) return null;

  const set = <K extends keyof FuelEntry>(field: K, value: FuelEntry[K]) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const compressTicketImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer la foto del ticket"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("La foto del ticket no es válida"));
        img.onload = () => {
          const maxSide = 1100;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("No se pudo procesar la foto del ticket"));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressTicketImage(file);
      setNewTicketDataUrl(compressed);
      toast.success("Foto de ticket lista para guardar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar la foto del ticket");
    }
  };

  const handleSave = async () => {
    if (!form || saving) return;
    const remito = String(form.numeroRemito || "").trim();
    if (!remito) {
      toast.error("El N° de Remito es obligatorio");
      return;
    }
    const dup = existingEntries.some(
      (f) => f.id !== form.id && String(f.numeroRemito || "").trim().toUpperCase() === remito.toUpperCase(),
    );
    if (dup) {
      toast.error(`Ya existe una carga con el remito "${remito}"`);
      return;
    }

    setSaving(true);
    let ticketRef: string | undefined = form.ticketImage;
    if (newTicketDataUrl?.startsWith("data:")) {
      const uploaded = await uploadDataUrlBlob(
        `tickets/${form.fecha || new Date().toISOString().slice(0, 10)}/${form.id}.jpg`,
        newTicketDataUrl,
      );
      ticketRef = uploaded || newTicketDataUrl;
      if (!uploaded) toast.warning("No se pudo subir la foto. Se guardó en este equipo.");
    }

    const litros = Number(form.litros) || 0;
    const monto = Number(form.monto) || 0;
    const precioPorLitro = litros > 0 ? Number((monto / litros).toFixed(2)) : 0;

    const updated: FuelEntry = {
      ...form,
      numeroRemito: remito,
      monto,
      litros,
      precioPorLitro,
      ticketImage: ticketRef,
    };
    try {
      onSave(updated);
      toast.success("Carga de combustible actualizada");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
      setSaving(false);
    }
  };

  const currentTicketPreview = newTicketDataUrl
    ? newTicketDataUrl
    : form.ticketImage
    ? getBlobAccessUrl(form.ticketImage)
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar carga de combustible</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hora</Label>
              <Input type="time" value={form.hora} onChange={(e) => set("hora", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Móvil</Label>
              <SearchableSelect options={patentes} value={form.movil} onChange={(v) => set("movil", v)} inputClassName="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chofer</Label>
              <Input value={form.chofer} onChange={(e) => set("chofer", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">N° Remito *</Label>
              <Input value={form.numeroRemito} onChange={(e) => set("numeroRemito", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de combustible</Label>
              <SearchableSelect options={TIPOS_COMBUSTIBLE} value={form.tipoCombustible} onChange={(v) => set("tipoCombustible", v)} inputClassName="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Litros</Label>
              <Input type="number" value={form.litros} onChange={(e) => set("litros", Number(e.target.value))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto ($)</Label>
              <Input type="number" value={form.monto} onChange={(e) => set("monto", Number(e.target.value))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">KM actual</Label>
              <Input value={form.kilometraje} onChange={(e) => set("kilometraje", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lugar de carga</Label>
              <SearchableSelect options={LUGARES_CARGA} value={form.lugarCarga} onChange={(v) => set("lugarCarga", v)} inputClassName="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estación / detalle</Label>
              <Input value={form.estacion} onChange={(e) => set("estacion", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observaciones</Label>
              <Input value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} className="h-10" />
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-md border border-border bg-muted/30 p-3">
            <label className="inline-flex">
              <input type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
              <span className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-secondary text-secondary-foreground text-sm font-semibold cursor-pointer">
                <Camera className="w-4 h-4" /> {form.ticketImage || newTicketDataUrl ? "Cambiar foto de ticket" : "Agregar foto de ticket"}
              </span>
            </label>
            {currentTicketPreview && (
              <div className="w-20 h-20 rounded border border-border overflow-hidden">
                <img src={currentTicketPreview} alt="Ticket" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
