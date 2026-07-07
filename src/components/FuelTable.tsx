import { FuelEntry } from "@/lib/types";
import { Trash2, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getBlobAccessUrl } from "@/lib/azureBlob";
import FuelEditDialog from "@/components/FuelEditDialog";

interface Props {
  entries: FuelEntry[];
  onDelete: (id: string) => void;
  onUpdate?: (entry: FuelEntry) => void;
  allEntries?: FuelEntry[];
}

export default function FuelTable({ entries, onDelete, onUpdate, allEntries }: Props) {
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [editing, setEditing] = useState<FuelEntry | null>(null);

  if (entries.length === 0) return null;

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="section-title text-sm">Combustible del Día</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Móvil", "Chofer", "Km", "Litros", "Monto", "$/L", "Lugar", "Remito", "Ticket", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((f) => {
                const precioLitro = f.litros > 0 ? (f.monto / f.litros).toFixed(2) : "—";
                return (
                <tr key={f.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs">{f.movil}</td>
                  <td className="px-3 py-2.5">{f.chofer}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{f.kilometraje || "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{f.litros}L</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-warning">${f.monto.toLocaleString("es-AR")}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-primary font-semibold">${precioLitro}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{f.lugarCarga || f.estacion || "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{f.numeroRemito || "—"}</td>
                  <td className="px-3 py-2.5">
                    {f.ticketImage ? (
                      <Button variant="ghost" size="sm" onClick={() => setViewImage(getBlobAccessUrl(f.ticketImage!))} className="h-7 gap-1 text-xs">
                        <Eye className="w-3 h-3" /> Ver
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {onUpdate && (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(f)} className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => onDelete(f.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewImage && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
          <div className="max-w-lg max-h-[80vh] overflow-hidden rounded-lg border border-border">
            <img src={viewImage} alt="Ticket de combustible" className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {onUpdate && (
        <FuelEditDialog
          entry={editing}
          open={editing !== null}
          onClose={() => setEditing(null)}
          onSave={(e) => onUpdate(e)}
          existingEntries={allEntries ?? entries}
        />
      )}
    </>
  );
}
