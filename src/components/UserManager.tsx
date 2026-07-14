import { useState, useMemo } from "react";
import {
  UserAccount,
  UserPermissions,
  UserRole,
  PERMISSION_LABELS,
  DEFAULT_PERMISSIONS,
  getUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
} from "@/lib/authStore";
import { getPersonal } from "@/lib/personalStore";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import SearchableSelect from "@/components/SearchableSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, KeyRound, Save, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  chofer: "Chofer",
  custodio: "Custodio",
  administracion: "Administración (solo lectura)",
  flota: "Flota (móviles y combustible)",
};

export default function UserManager() {
  const { user: currentUser, refresh } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>(getUsers);
  const [creating, setCreating] = useState(false);
  const [editingPermsId, setEditingPermsId] = useState<string | null>(null);
  const [changingPasswordId, setChangingPasswordId] = useState<string | null>(null);

  if (!currentUser?.permissions.manageUsers) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        No tenés permisos para gestionar usuarios.
      </div>
    );
  }

  const personalNames = useMemo(() => getPersonal().filter((p) => p.activo).map((p) => p.nombre), []);

  const reload = () => setUsers(getUsers());

  const handleDelete = (u: UserAccount) => {
    if (u.id === currentUser.id) {
      toast.error("No podés eliminar tu propio usuario");
      return;
    }
    if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) return;
    deleteUser(u.id);
    reload();
    toast.success("Usuario eliminado");
  };

  const handleToggleActive = (u: UserAccount, activo: boolean) => {
    if (u.id === currentUser.id && !activo) {
      toast.error("No podés desactivarte a vos mismo");
      return;
    }
    updateUser(u.id, { activo });
    reload();
  };

  const editingUser = users.find((u) => u.id === editingPermsId) || null;
  const passwordUser = users.find((u) => u.id === changingPasswordId) || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Usuarios del sistema</h2>
          <p className="text-xs text-muted-foreground">
            Creá las cuentas de choferes y custodios y configurá qué pueden hacer.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="border-b border-border">
                <th className="px-3 py-3 text-left text-xs uppercase text-muted-foreground">Usuario</th>
                <th className="px-3 py-3 text-left text-xs uppercase text-muted-foreground">Rol</th>
                <th className="px-3 py-3 text-left text-xs uppercase text-muted-foreground">Vinculado a Personal</th>
                <th className="px-3 py-3 text-center text-xs uppercase text-muted-foreground">Activo</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/40 hover:bg-card/50">
                  <td className="px-3 py-2.5 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      {u.role === "admin" ? (
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                      {u.username}
                      {u.id === currentUser.id && (
                        <span className="text-[10px] text-primary font-bold">(vos)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        u.role === "admin"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{u.linkedPersonalName || "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Switch
                      checked={u.activo}
                      onCheckedChange={(v) => handleToggleActive(u, v)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingPermsId(u.id)}
                        title="Configurar permisos"
                      >
                        Permisos
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setChangingPasswordId(u.id)}
                        title="Cambiar contraseña"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(u)}
                        className="text-destructive"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <CreateUserDialog
          personalNames={personalNames}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      )}

      {editingUser && (
        <PermissionsDialog
          user={editingUser}
          onClose={() => setEditingPermsId(null)}
          onSaved={() => {
            setEditingPermsId(null);
            reload();
            refresh();
          }}
        />
      )}

      {passwordUser && (
        <ChangePasswordDialog
          user={passwordUser}
          onClose={() => setChangingPasswordId(null)}
          onSaved={() => {
            setChangingPasswordId(null);
            toast.success("Contraseña actualizada");
          }}
        />
      )}
    </div>
  );
}

// ============ Create ============
function CreateUserDialog({
  personalNames,
  onClose,
  onCreated,
}: {
  personalNames: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("chofer");
  const [linked, setLinked] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || password.length < 6) {
      toast.error("Usuario requerido y contraseña de al menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      await createUser({
        username,
        password,
        role,
        linkedPersonalName: role === "admin" ? undefined : linked || undefined,
      });
      toast.success("Usuario creado");
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Usuario / email</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contraseña (mínimo 6)</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rol</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["admin", "administracion", "flota", "chofer", "custodio"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`h-10 rounded-md border-2 text-xs font-bold ${
                    role === r
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background"
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          {role !== "admin" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Vincular a Personal (para detectar "sus" servicios)</Label>
              <SearchableSelect options={personalNames} value={linked} onChange={setLinked} />
              <p className="text-[10px] text-muted-foreground">
                Si lo vinculás, solo podrá editar servicios donde figure como chofer o custodio.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ Permissions ============
function PermissionsDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [perms, setPerms] = useState<UserPermissions>(user.permissions);
  const [linked, setLinked] = useState(user.linkedPersonalName || "");
  const personalNames = useMemo(
    () => getPersonal().filter((p) => p.activo).map((p) => p.nombre),
    [],
  );

  const toggle = (k: keyof UserPermissions) =>
    setPerms((p) => ({ ...p, [k]: !p[k] }));

  const applyPreset = () => setPerms(DEFAULT_PERMISSIONS[user.role]);

  const save = () => {
    updateUser(user.id, {
      permissions: perms,
      linkedPersonalName: user.role === "admin" ? undefined : linked || undefined,
    });
    toast.success("Permisos actualizados");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permisos de {user.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {user.role !== "admin" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Personal vinculado</Label>
              <SearchableSelect options={personalNames} value={linked} onChange={setLinked} />
            </div>
          )}
          <div className="space-y-2">
            {(Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[]).map((k) => (
              <label
                key={k}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-card/60 cursor-pointer"
              >
                <Checkbox checked={perms[k]} onCheckedChange={() => toggle(k)} />
                <span className="text-sm">{PERMISSION_LABELS[k]}</span>
              </label>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={applyPreset}>
            Restablecer al preset de {ROLE_LABELS[user.role]}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} className="gap-2">
            <Save className="w-4 h-4" /> Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Change Password ============
function ChangePasswordDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (pwd.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      await updateUserPassword(user.id, pwd);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña — {user.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label className="text-xs">Nueva contraseña</Label>
          <Input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoFocus
            autoComplete="new-password"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
