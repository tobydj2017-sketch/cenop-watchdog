import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  PersonalEntry, PersonalRole, ALL_ROLES, ROLE_LABELS,
  getPersonal, addPersonal, updatePersonal, deletePersonal,
} from "@/lib/personalStore";
import { Plus, Trash2, UserPlus, Search, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

const ROLE_COLORS: Record<PersonalRole, string> = {
  chofer: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  custodio: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  playero: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  operaciones: "bg-purple-500/15 text-purple-700 border-purple-500/30",
};

export default function PersonalManager() {
  const [personal, setPersonal] = useState<PersonalEntry[]>(() => getPersonal());
  const [pendingChanges, setPendingChanges] = useState<Record<string, PersonalRole[]>>({});
  const [newName, setNewName] = useState("");
  const [newRoles, setNewRoles] = useState<PersonalRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<PersonalRole | "todos">("todos");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  const refresh = () => setPersonal(getPersonal());

  const handleAdd = () => {
    const name = newName.trim().toUpperCase();
    if (!name) { toast.error("Ingresá un nombre"); return; }
    if (personal.some((p) => p.nombre === name)) { toast.error("Ya existe ese nombre"); return; }
    addPersonal(name, newRoles);
    setNewName("");
    setNewRoles([]);
    setShowForm(false);
    refresh();
    toast.success(`${name} agregado`);
  };

  const handleDelete = (id: string, nombre: string) => {
    deletePersonal(id);
    setPendingChanges((prev) => { const next = { ...prev }; delete next[id]; return next; });
    refresh();
    toast.success(`${nombre} eliminado`);
  };

  const toggleRole = (id: string, role: PersonalRole, currentRoles: PersonalRole[]) => {
    const baseRoles = pendingChanges[id] ?? currentRoles;
    const updated = baseRoles.includes(role)
      ? baseRoles.filter((r) => r !== role)
      : [...baseRoles, role];
    setPendingChanges((prev) => ({ ...prev, [id]: updated }));
  };

  const handleSaveAll = () => {
    Object.entries(pendingChanges).forEach(([id, roles]) => {
      updatePersonal(id, { roles });
    });
    setPendingChanges({});
    refresh();
    toast.success("Cambios guardados correctamente");
  };

  const handleDiscardChanges = () => {
    setPendingChanges({});
  };

  const startEdit = (p: PersonalEntry) => {
    setEditingId(p.id);
    setEditName(p.nombre);
  };

  const saveEdit = (id: string) => {
    const name = editName.trim().toUpperCase();
    if (!name) { toast.error("El nombre no puede estar vacío"); return; }
    if (personal.some((p) => p.nombre === name && p.id !== id)) { toast.error("Ya existe ese nombre"); return; }
    updatePersonal(id, { nombre: name });
    setEditingId(null);
    refresh();
    toast.success("Nombre actualizado");
  };

  const toggleNewRole = (role: PersonalRole) => {
    setNewRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const filtered = useMemo(() => {
    return personal.filter((p) => {
      const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "todos" || p.roles.includes(filterRole);
      return matchesSearch && matchesRole;
    });
  }, [personal, searchTerm, filterRole]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: personal.length };
    ALL_ROLES.forEach((r) => { counts[r] = personal.filter((p) => p.roles.includes(r)).length; });
    return counts;
  }, [personal]);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[{ key: "todos", label: "Total Personal" }, ...ALL_ROLES.map((r) => ({ key: r, label: ROLE_LABELS[r] }))].map(
          ({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterRole(key as PersonalRole | "todos")}
              className={`glass-card p-3 text-left transition-all ${
                filterRole === key ? "ring-2 ring-primary" : ""
              }`}
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{roleCounts[key] || 0}</p>
            </button>
          )
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar personal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2">
          {hasPendingChanges && (
            <Button onClick={handleDiscardChanges} variant="ghost" size="sm" className="gap-1 text-xs">
              <X className="w-3.5 h-3.5" /> Descartar
            </Button>
          )}
          <Button
            onClick={handleSaveAll}
            size="sm"
            disabled={!hasPendingChanges}
            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {hasPendingChanges ? `Guardar Cambios (${Object.keys(pendingChanges).length})` : "Guardar Cambios"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Agregar Personal
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Nuevo Personal</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nombre completo</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: GARCIA CARLOS"
                className="h-9"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Roles</Label>
              <div className="flex flex-wrap gap-3">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={newRoles.includes(role)}
                      onCheckedChange={() => toggleNewRole(role)}
                    />
                    <span className="text-sm">{ROLE_LABELS[role]}</span>
                  </label>
                ))}
              </div>
            </div>
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
                <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Roles</th>
                <th className="text-center px-2 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterRole !== "todos" ? "Sin resultados para el filtro aplicado" : "No hay personal cargado"}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">
                      {editingId === p.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-sm w-48"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(p.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => saveEdit(p.id)}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="cursor-pointer hover:text-primary" onDoubleClick={() => startEdit(p)}>
                          {p.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {ALL_ROLES.map((role) => {
                          const effectiveRoles = pendingChanges[p.id] ?? p.roles;
                          const isActive = effectiveRoles.includes(role);
                          const isPending = p.id in pendingChanges;
                          return (
                            <button
                              key={role}
                              onClick={() => toggleRole(p.id, role, p.roles)}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                                isActive
                                  ? ROLE_COLORS[role] + (isPending ? " ring-1 ring-primary/50" : "")
                                  : "bg-muted/30 text-muted-foreground border-transparent opacity-40 hover:opacity-70"
                              }`}
                            >
                              {ROLE_LABELS[role]}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => startEdit(p)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(p.id, p.nombre)}
                        >
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
          {filtered.length} de {personal.length} registros
        </div>
      </div>
    </div>
  );
}
