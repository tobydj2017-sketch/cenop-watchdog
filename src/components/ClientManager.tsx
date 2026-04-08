import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClientEntry, getClients, addClient, updateClient, deleteClient,
} from "@/lib/clientStore";
import { Plus, Trash2, Search, Pencil, Check, X, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function ClientManager() {
  const [clients, setClients] = useState<ClientEntry[]>(() => getClients());
  const [newName, setNewName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const refresh = () => setClients(getClients());

  const handleAdd = () => {
    const name = newName.trim().toUpperCase();
    if (!name) { toast.error("Ingresá un nombre"); return; }
    if (clients.some((c) => c.nombre === name)) { toast.error("Ya existe ese cliente"); return; }
    addClient(name);
    setNewName("");
    setShowForm(false);
    refresh();
    toast.success(`${name} agregado`);
  };

  const handleDelete = (id: string, nombre: string) => {
    deleteClient(id);
    refresh();
    toast.success(`${nombre} eliminado`);
  };

  const handleToggleActive = (c: ClientEntry) => {
    updateClient(c.id, { activo: !c.activo });
    refresh();
    toast.success(`${c.nombre} ${c.activo ? "desactivado" : "activado"}`);
  };

  const startEdit = (c: ClientEntry) => {
    setEditingId(c.id);
    setEditName(c.nombre);
  };

  const saveEdit = (id: string) => {
    const name = editName.trim().toUpperCase();
    if (!name) { toast.error("El nombre no puede estar vacío"); return; }
    if (clients.some((c) => c.nombre === name && c.id !== id)) { toast.error("Ya existe ese nombre"); return; }
    updateClient(id, { nombre: name });
    setEditingId(null);
    refresh();
    toast.success("Nombre actualizado");
  };

  const filtered = useMemo(() => {
    return clients.filter((c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const activeCount = clients.filter((c) => c.activo).length;
  const inactiveCount = clients.length - activeCount;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">Total Clientes</p>
          <p className="text-xl font-bold">{clients.length}</p>
        </div>
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">Activos</p>
          <p className="text-xl font-bold text-success">{activeCount}</p>
        </div>
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">Inactivos</p>
          <p className="text-xl font-bold text-destructive">{inactiveCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Building2 className="w-4 h-4" />
          Agregar Cliente
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Nuevo Cliente</h3>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nombre del cliente</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: ACME LOGISTICS"
              className="h-9"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Guardar
            </Button>
            <Button onClick={() => setShowForm(false)} size="sm" variant="ghost">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nombre</th>
                <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="text-center px-2 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "Sin resultados" : "No hay clientes cargados"}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${!c.activo ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2.5 font-medium">
                      {editingId === c.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-sm w-48"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(c.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => saveEdit(c.id)}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="cursor-pointer hover:text-primary" onDoubleClick={() => startEdit(c)}>
                          {c.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                          c.activo
                            ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                            : "bg-muted/30 text-muted-foreground border-transparent"
                        }`}
                      >
                        {c.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => startEdit(c)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id, c.nombre)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          {filtered.length} de {clients.length} registros
        </div>
      </div>
    </div>
  );
}
