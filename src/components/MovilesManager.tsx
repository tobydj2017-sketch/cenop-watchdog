import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MovilEntry, getMoviles, addMovil, updateMovil, deleteMovil,
} from "@/lib/movilesStore";
import { TIPOS_COMBUSTIBLE, LUGARES_CARGA } from "@/lib/movilesData";
import { Plus, Trash2, Search, Car, Check, X } from "lucide-react";
import { toast } from "sonner";

type Draft = Partial<Omit<MovilEntry, "id">>;

export default function MovilesManager() {
  const [moviles, setMoviles] = useState<MovilEntry[]>(() => getMoviles());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newPatente, setNewPatente] = useState("");

  const refresh = () => setMoviles(getMoviles());
  const hasPending = Object.keys(drafts).length > 0;

  const setField = (id: string, field: keyof MovilEntry, value: unknown) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const effective = (m: MovilEntry): MovilEntry => ({ ...m, ...(drafts[m.id] || {}) });

  const handleSaveAll = () => {
    Object.entries(drafts).forEach(([id, patch]) => {
      const cleaned: Draft = { ...patch };
      if (typeof cleaned.anio === "string") {
        cleaned.anio = cleaned.anio ? Number(cleaned.anio) : null;
      }
      if (typeof cleaned.consumoIdeal === "string") {
        cleaned.consumoIdeal = cleaned.consumoIdeal ? Number(cleaned.consumoIdeal) : null;
      }
      updateMovil(id, cleaned);
    });
    setDrafts({});
    refresh();
    toast.success("Cambios guardados");
  };

  const handleAdd = () => {
    const pat = newPatente.trim().toUpperCase();
    if (!pat) { toast.error("Ingresá una patente"); return; }
    try {
      addMovil(pat);
      setNewPatente("");
      setShowForm(false);
      refresh();
      toast.success(`${pat} agregado`);
    } catch (e: any) {
      toast.error(e.message || "Error al agregar");
    }
  };

  const handleDelete = (id: string, pat: string) => {
    if (!confirm(`¿Eliminar el móvil ${pat}?`)) return;
    deleteMovil(id);
    setDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
    refresh();
    toast.success(`${pat} eliminado`);
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return moviles.filter((m) => {
      const e = effective(m);
      return (
        e.patente.toLowerCase().includes(term) ||
        e.marca.toLowerCase().includes(term) ||
        e.modelo.toLowerCase().includes(term) ||
        e.asignacion.toLowerCase().includes(term) ||
        (e.telefono || "").toLowerCase().includes(term)
      );
    });
  }, [moviles, drafts, searchTerm]);

  const activos = moviles.filter((m) => m.activo).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">Total Móviles</p>
          <p className="text-xl font-bold">{moviles.length}</p>
        </div>
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">Activos</p>
          <p className="text-xl font-bold text-success">{activos}</p>
        </div>
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">Inactivos</p>
          <p className="text-xl font-bold text-muted-foreground">{moviles.length - activos}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar patente, marca, asignación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2">
          {hasPending && (
            <Button onClick={() => setDrafts({})} variant="ghost" size="sm" className="gap-1 text-xs">
              <X className="w-3.5 h-3.5" /> Descartar
            </Button>
          )}
          <Button
            onClick={handleSaveAll}
            size="sm"
            disabled={!hasPending}
            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {hasPending ? `Guardar (${Object.keys(drafts).length})` : "Guardar Cambios"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Car className="w-4 h-4" /> Agregar Móvil
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Nuevo Móvil</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Patente</Label>
              <Input
                value={newPatente}
                onChange={(e) => setNewPatente(e.target.value.toUpperCase())}
                placeholder="AB123CD"
                className="h-9 w-40"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Agregar
            </Button>
            <Button onClick={() => setShowForm(false)} size="sm" variant="ghost">Cancelar</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Luego podés completar marca, modelo, teléfono, asignación y demás datos en la tabla.
          </p>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-2 py-2 font-semibold">Patente</th>
                <th className="text-left px-2 py-2 font-semibold">Marca</th>
                <th className="text-left px-2 py-2 font-semibold">Modelo</th>
                <th className="text-left px-2 py-2 font-semibold w-16">Año</th>
                <th className="text-left px-2 py-2 font-semibold w-20">L/100km</th>
                <th className="text-left px-2 py-2 font-semibold">Combustible</th>
                <th className="text-left px-2 py-2 font-semibold">Asignación</th>
                <th className="text-left px-2 py-2 font-semibold">Lugar de carga</th>
                <th className="text-left px-2 py-2 font-semibold">Teléfonos <span className="font-normal text-muted-foreground">(separá con coma)</span></th>
                <th className="text-center px-2 py-2 font-semibold w-16">Activo</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">Sin resultados</td></tr>
              ) : filtered.map((m) => {
                const e = effective(m);
                const dirty = m.id in drafts;
                return (
                  <tr key={m.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${dirty ? "bg-primary/5" : ""}`}>
                    <td className="px-2 py-1.5 font-semibold">
                      <Input value={e.patente} onChange={(ev) => setField(m.id, "patente", ev.target.value.toUpperCase())} className="h-7 text-xs w-24" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={e.marca} onChange={(ev) => setField(m.id, "marca", ev.target.value)} className="h-7 text-xs w-28" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={e.modelo} onChange={(ev) => setField(m.id, "modelo", ev.target.value)} className="h-7 text-xs w-40" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={e.anio ?? ""} onChange={(ev) => setField(m.id, "anio", ev.target.value)} className="h-7 text-xs w-16" type="number" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={e.consumoIdeal ?? ""} onChange={(ev) => setField(m.id, "consumoIdeal", ev.target.value)} className="h-7 text-xs w-16" type="number" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={e.tipoCombustible}
                        onChange={(ev) => setField(m.id, "tipoCombustible", ev.target.value)}
                        className="h-7 text-xs border border-input rounded-md px-1 bg-background"
                      >
                        <option value=""></option>
                        {TIPOS_COMBUSTIBLE.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={e.asignacion} onChange={(ev) => setField(m.id, "asignacion", ev.target.value.toUpperCase())} className="h-7 text-xs w-36" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={e.lugarCarga}
                        onChange={(ev) => setField(m.id, "lugarCarga", ev.target.value)}
                        className="h-7 text-xs border border-input rounded-md px-1 bg-background"
                      >
                        <option value=""></option>
                        {LUGARES_CARGA.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={e.telefono} onChange={(ev) => setField(m.id, "telefono", ev.target.value)} placeholder="—" className="h-7 text-xs w-32" />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={e.activo}
                        onChange={(ev) => setField(m.id, "activo", ev.target.checked)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id, m.patente)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          {filtered.length} de {moviles.length} móviles
        </div>
      </div>
    </div>
  );
}
