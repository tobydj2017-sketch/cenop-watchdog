// Sistema de autenticación y permisos.
// Los usuarios se persisten en Azure Blob (`users.json`) siguiendo el mismo
// patrón que personal/clientes. La sesión activa se guarda en localStorage.
//
// IMPORTANTE: este login NO es de nivel bancario — el blob es accesible con
// la SAS URL del proyecto. Es adecuado para uso interno controlado, pero las
// contraseñas se guardan hasheadas con SHA-256 + salt para que nadie pueda
// leerlas en claro desde el blob.

import { BLOB_KEYS, downloadJson, queueUpload, uploadJson, isAzureConfigured } from "./azureBlob";

export type UserRole = "admin" | "chofer" | "custodio" | "administracion" | "flota";

export interface UserPermissions {
  // Servicios
  createServices: boolean;
  editAllServices: boolean;
  editOwnServices: boolean;
  deleteServices: boolean;
  // Combustible
  createFuel: boolean;
  editFuel: boolean;
  deleteFuel: boolean;
  // Catálogos
  managePersonal: boolean;
  manageClients: boolean;
  manageMoviles: boolean;
  // Vistas
  viewDashboard: boolean;
  viewReportes: boolean;
  viewFleet: boolean;
  // Admin
  manageUsers: boolean;
}


export interface UserAccount {
  id: string;
  username: string;            // email o nombre de usuario (case-insensitive)
  passwordHash: string;        // "salt:sha256(salt:password)"
  role: UserRole;
  linkedPersonalName?: string; // nombre exacto del Personal (para filtrar "sus" servicios)
  permissions: UserPermissions;
  activo: boolean;
  createdAt: string;
}

const USERS_LOCAL_KEY = "cenop_users";
const SESSION_KEY = "cenop_session";
const USERS_BLOB = "users.json";

// Extender BLOB_KEYS sin tocar el archivo original
(BLOB_KEYS as Record<string, string>).users = USERS_BLOB;

// ---------------- defaults ----------------

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    createServices: true,
    editAllServices: true,
    editOwnServices: true,
    deleteServices: true,
    createFuel: true,
    editFuel: true,
    deleteFuel: true,
    managePersonal: true,
    manageClients: true,
    manageMoviles: true,


    viewDashboard: true,
    viewReportes: true,
    viewFleet: true,
    manageUsers: true,
  },
  chofer: {
    createServices: false,
    editAllServices: false,
    editOwnServices: true,
    deleteServices: false,
    createFuel: true,
    editFuel: false,
    deleteFuel: false,
    managePersonal: false,
    manageClients: false,
    manageMoviles: false,

    viewDashboard: false,
    viewReportes: false,
    manageUsers: false,
  },
  custodio: {
    createServices: false,
    editAllServices: false,
    editOwnServices: true,
    deleteServices: false,
    createFuel: false,
    editFuel: false,
    deleteFuel: false,
    managePersonal: false,
    manageClients: false,
    manageMoviles: false,

    viewDashboard: false,
    viewReportes: false,
    manageUsers: false,
  },
  administracion: {
    createServices: false,
    editAllServices: false,
    editOwnServices: false,
    deleteServices: false,
    createFuel: false,
    editFuel: false,
    deleteFuel: false,
    managePersonal: false,
    manageClients: false,
    manageMoviles: false,
    viewDashboard: true,
    viewReportes: true,
    manageUsers: false,
  },
};

export const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  createServices: "Crear servicios",
  editAllServices: "Editar TODOS los servicios",
  editOwnServices: "Editar sus propios servicios",
  deleteServices: "Eliminar servicios",
  createFuel: "Cargar combustible",
  editFuel: "Editar combustible",
  deleteFuel: "Eliminar combustible",
  managePersonal: "Gestionar Personal",
  manageClients: "Gestionar Clientes",
  manageMoviles: "Gestionar Móviles",

  viewDashboard: "Ver Panel de Análisis",
  viewReportes: "Ver Reportes",
  manageUsers: "Gestionar Usuarios (admin)",
};

// ---------------- crypto ----------------

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bufToHex(hash);
}

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt || randomSalt();
  const h = await sha256(`${s}:${password}`);
  return `${s}:${h}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || !stored.includes(":")) return false;
  const [salt] = stored.split(":");
  const computed = await hashPassword(password, salt);
  return computed === stored;
}

// ---------------- persistence ----------------

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function readLocal(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_LOCAL_KEY);
    return raw ? (JSON.parse(raw) as UserAccount[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(users: UserAccount[]) {
  localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(users));
  queueUpload(USERS_BLOB, () => users);
}

export function getUsers(): UserAccount[] {
  return readLocal();
}

export function saveUsers(users: UserAccount[]) {
  writeLocal(users);
}

export async function createUser(input: {
  username: string;
  password: string;
  role: UserRole;
  linkedPersonalName?: string;
  permissions?: Partial<UserPermissions>;
}): Promise<UserAccount> {
  const users = readLocal();
  const username = input.username.trim().toLowerCase();
  if (users.some((u) => u.username === username)) {
    throw new Error(`Ya existe un usuario "${username}"`);
  }
  const passwordHash = await hashPassword(input.password);
  const user: UserAccount = {
    id: generateId(),
    username,
    passwordHash,
    role: input.role,
    linkedPersonalName: input.linkedPersonalName?.trim() || undefined,
    permissions: { ...DEFAULT_PERMISSIONS[input.role], ...(input.permissions || {}) },
    activo: true,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeLocal(users);
  return user;
}

export async function updateUserPassword(id: string, newPassword: string) {
  const users = readLocal();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("Usuario no encontrado");
  users[idx] = { ...users[idx], passwordHash: await hashPassword(newPassword) };
  writeLocal(users);
}

export function updateUser(id: string, updates: Partial<Omit<UserAccount, "id" | "passwordHash" | "createdAt">>) {
  const users = readLocal();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return;
  users[idx] = { ...users[idx], ...updates };
  writeLocal(users);
}

export function deleteUser(id: string) {
  const users = readLocal().filter((u) => u.id !== id);
  writeLocal(users);
}

// ---------------- bootstrap ----------------

const SEED_ADMIN_USERNAME = "tobiasbrito2023@gmail.com";
const SEED_ADMIN_PASSWORD = "Admin2026!";

/** Descarga users.json desde Azure y siembra el admin si no existe. */
export async function bootstrapUsers(): Promise<void> {
  if (isAzureConfigured()) {
    const remote = await downloadJson<UserAccount[]>(USERS_BLOB);
    if (remote && Array.isArray(remote)) {
      localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(remote));
    }
  }
  // Migración: rellenar permisos nuevos con los defaults del rol
  {
    const users = readLocal();
    let migrated = false;
    const patched = users.map((u) => {
      const merged = { ...DEFAULT_PERMISSIONS[u.role], ...u.permissions };
      if (Object.keys(merged).length !== Object.keys(u.permissions).length) migrated = true;
      return { ...u, permissions: merged };
    });
    if (migrated) writeLocal(patched);
  }
  const users = readLocal();

  if (!users.some((u) => u.username === SEED_ADMIN_USERNAME.toLowerCase())) {
    const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD);
    const admin: UserAccount = {
      id: generateId(),
      username: SEED_ADMIN_USERNAME.toLowerCase(),
      passwordHash,
      role: "admin",
      permissions: DEFAULT_PERMISSIONS.admin,
      activo: true,
      createdAt: new Date().toISOString(),
    };
    users.push(admin);
    writeLocal(users);
    if (isAzureConfigured()) {
      void uploadJson(USERS_BLOB, users);
    }
  }
}

// ---------------- session ----------------

export interface SessionInfo {
  userId: string;
  username: string;
  loggedAt: string;
}

export function getSession(): SessionInfo | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionInfo) : null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): UserAccount | null {
  const s = getSession();
  if (!s) return null;
  return readLocal().find((u) => u.id === s.userId && u.activo) || null;
}

export async function login(username: string, password: string): Promise<UserAccount> {
  const uname = username.trim().toLowerCase();
  const user = readLocal().find((u) => u.username === uname);
  if (!user) throw new Error("Usuario o contraseña incorrectos");
  if (!user.activo) throw new Error("Usuario desactivado");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error("Usuario o contraseña incorrectos");
  const session: SessionInfo = {
    userId: user.id,
    username: user.username,
    loggedAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// ---------------- helpers ----------------

/** ¿El usuario está asignado a este servicio? (chofer/custodio coincide) */
export function isOwnService(
  user: UserAccount,
  service: { chofer?: string; custodio?: string },
): boolean {
  if (!user.linkedPersonalName) return false;
  const name = user.linkedPersonalName.trim().toUpperCase();
  return (
    (service.chofer || "").trim().toUpperCase() === name ||
    (service.custodio || "").trim().toUpperCase() === name
  );
}
