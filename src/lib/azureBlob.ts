// Cliente para Azure Blob Storage usando SAS Token.
// La SAS URL apunta al contenedor `appcenop` y permite leer/escribir blobs.

const SAS_URL = import.meta.env.VITE_AZURE_BLOB_SAS_URL as string | undefined;

export function isAzureConfigured(): boolean {
  return !!SAS_URL && SAS_URL.includes("?");
}

function encodeBlobName(blobName: string): string {
  return blobName.split("/").map(encodeURIComponent).join("/");
}

function buildBlobUrl(blobName: string): string {
  if (!SAS_URL) throw new Error("VITE_AZURE_BLOB_SAS_URL no está configurada");
  const [base, query] = SAS_URL.split("?");
  return `${base}/${encodeBlobName(blobName)}?${query}`;
}

export function getBlobAccessUrl(value: string): string {
  if (!value.startsWith("azure:")) return value;
  return buildBlobUrl(value.slice("azure:".length));
}

// ----- Rehidratación automática de blobs archivados -----
// Si el blob quedó en nivel Archive, Azure devuelve 409 BlobArchived y ni se
// puede leer ni escribir. Intentamos pasarlo a Hot (Set Blob Tier) y reintentar.
const rehydrating = new Set<string>();

async function setBlobTierHot(blobName: string): Promise<boolean> {
  try {
    const url = buildBlobUrl(blobName);
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}comp=tier`, {
      method: "PUT",
      headers: {
        "x-ms-version": "2025-05-05",
        "x-ms-access-tier": "Hot",
        "x-ms-rehydrate-priority": "High",
      },
    });
    if (res.ok || res.status === 202) {
      console.warn(`[Azure] ${blobName}: rehidratación a Hot solicitada`);
      return true;
    }
    console.warn(`[Azure] no se pudo rehidratar ${blobName} -> ${res.status}`);
    return false;
  } catch (err) {
    console.warn(`[Azure] error rehidratando ${blobName}:`, err);
    return false;
  }
}

async function isArchived(res: Response): Promise<boolean> {
  if (res.status !== 409) return false;
  try {
    const text = await res.clone().text();
    return text.includes("BlobArchived") || text.includes("archived blob");
  } catch {
    return false;
  }
}

async function handleArchived(blobName: string, res: Response): Promise<boolean> {
  if (!(await isArchived(res))) return false;
  if (rehydrating.has(blobName)) return false;
  rehydrating.add(blobName);
  const ok = await setBlobTierHot(blobName);
  if (!ok) rehydrating.delete(blobName);
  return ok;
}

export async function downloadJson<T>(blobName: string, retry = true): Promise<T | null> {
  if (!isAzureConfigured()) return null;
  try {
    const res = await fetch(buildBlobUrl(blobName), {
      method: "GET",
      headers: { "x-ms-version": "2025-05-05" },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      if (retry && (await handleArchived(blobName, res))) {
        await new Promise((r) => setTimeout(r, 2000));
        return downloadJson<T>(blobName, false);
      }
      console.warn(`[Azure] download ${blobName} -> ${res.status}`);
      return null;
    }
    rehydrating.delete(blobName);
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn(`[Azure] error descargando ${blobName}:`, err);
    return null;
  }
}

export async function uploadJson(blobName: string, data: unknown, retry = true): Promise<boolean> {
  if (!isAzureConfigured()) return false;
  try {
    const body = JSON.stringify(data);
    const res = await fetch(buildBlobUrl(blobName), {
      method: "PUT",
      headers: {
        "x-ms-version": "2025-05-05",
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": "application/json; charset=utf-8",
      },
      body,
    });
    if (!res.ok) {
      if (retry && (await handleArchived(blobName, res))) {
        await new Promise((r) => setTimeout(r, 2000));
        return uploadJson(blobName, data, false);
      }
      console.warn(`[Azure] upload ${blobName} -> ${res.status}`, await res.text());
      return false;
    }
    rehydrating.delete(blobName);
    return true;
  } catch (err) {
    console.warn(`[Azure] error subiendo ${blobName}:`, err);
    return false;
  }
}

export async function uploadDataUrlBlob(blobName: string, dataUrl: string): Promise<string | null> {
  if (!isAzureConfigured()) return null;
  try {
    const blob = await fetch(dataUrl).then((res) => res.blob());
    const res = await fetch(buildBlobUrl(blobName), {
      method: "PUT",
      headers: {
        "x-ms-version": "2025-05-05",
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": blob.type || "image/jpeg",
      },
      body: blob,
    });
    if (!res.ok) {
      console.warn(`[Azure] upload ticket ${blobName} -> ${res.status}`, await res.text());
      return null;
    }
    return `azure:${blobName}`;
  } catch (err) {
    console.warn(`[Azure] error subiendo ticket ${blobName}:`, err);
    return null;
  }
}

// ----- Cola con debounce por blob -----
const pending = new Map<string, ReturnType<typeof setTimeout>>();

export function queueUpload(blobName: string, getData: () => unknown, delayMs = 800) {
  const existing = pending.get(blobName);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    pending.delete(blobName);
    void uploadJson(blobName, getData());
  }, delayMs);
  pending.set(blobName, t);
}

// ----- Tombstones (para que un delete no reviva desde remoto) -----
function tombstoneBlobName(blobName: string): string {
  return blobName.replace(/\.json$/, ".deleted.json");
}
function tombstoneLocalKey(blobName: string): string {
  return `cenop_tombstones_${blobName}`;
}

export function getLocalTombstones(blobName: string): string[] {
  try {
    const raw = localStorage.getItem(tombstoneLocalKey(blobName));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addTombstone(blobName: string, id: string) {
  if (!id) return;
  const list = getLocalTombstones(blobName);
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(tombstoneLocalKey(blobName), JSON.stringify(list));
  }
}

async function syncTombstones(blobName: string): Promise<Set<string>> {
  const local = getLocalTombstones(blobName);
  if (!isAzureConfigured()) return new Set(local);
  const remote = (await downloadJson<string[]>(tombstoneBlobName(blobName))) ?? [];
  const union = new Set<string>([...remote, ...local]);
  if (union.size !== remote.length) {
    void uploadJson(tombstoneBlobName(blobName), Array.from(union));
  }
  localStorage.setItem(tombstoneLocalKey(blobName), JSON.stringify(Array.from(union)));
  return union;
}

// Sube MERGEANDO con lo remoto por id. Local pisa a remoto en conflictos,
// pero jamás se pierde lo que otro navegador haya cargado.
// Los ids en tombstones se excluyen para que los borrados no revivan.
export async function uploadMergedById<T extends { id?: string }>(
  blobName: string,
  local: T[],
): Promise<T[]> {
  if (!isAzureConfigured()) return local;
  const tombstones = await syncTombstones(blobName);
  const remote = (await downloadJson<T[]>(blobName)) ?? [];
  const byId = new Map<string, T>();
  for (const item of remote) if (item && item.id && !tombstones.has(item.id)) byId.set(item.id, item);
  for (const item of local) if (item && item.id && !tombstones.has(item.id)) byId.set(item.id, item);
  const merged = Array.from(byId.values());
  await uploadJson(blobName, merged);
  return merged;
}

const pendingMerge = new Map<string, ReturnType<typeof setTimeout>>();
export function queueUploadMerged<T extends { id?: string }>(
  blobName: string,
  getLocal: () => T[],
  onMerged: (merged: T[]) => void,
  delayMs = 600,
) {
  const existing = pendingMerge.get(blobName);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    pendingMerge.delete(blobName);
    try {
      const merged = await uploadMergedById(blobName, getLocal());
      onMerged(merged);
    } catch (err) {
      console.warn(`[Azure] merge upload ${blobName} falló:`, err);
    }
  }, delayMs);
  pendingMerge.set(blobName, t);
}

// ----- Bootstrap: descarga inicial -----
export const BLOB_KEYS = {
  services: "services.json",
  fuel: "fuel.json",
  // clientes.json quedó en nivel Archive en Azure (409 BlobArchived): usamos un blob nuevo en Hot.
  clientes: "clientes-v2.json",
  personal: "personal.json",
  moviles: "moviles.json",
} as const;

export const LOCAL_KEYS = {
  services: "cenop_services",
  fuel: "cenop_fuel",
  clientes: "cenop_clientes",
  personal: "cenop_personal",
  moviles: "cenop_moviles",
} as const;

export async function bootstrapFromAzure(): Promise<void> {
  if (!isAzureConfigured()) return;

  // Blobs que se MERGEAN por id (nunca se pierde lo local ni lo remoto)
  const mergeable = [
    [BLOB_KEYS.services, LOCAL_KEYS.services],
    [BLOB_KEYS.fuel, LOCAL_KEYS.fuel],
  ] as const;

  // Blobs de catálogo: remoto pisa a local
  const overwrite = [
    [BLOB_KEYS.clientes, LOCAL_KEYS.clientes],
    [BLOB_KEYS.personal, LOCAL_KEYS.personal],
    [BLOB_KEYS.moviles, LOCAL_KEYS.moviles],
  ] as const;

  await Promise.all([
    ...mergeable.map(async ([blob, localKey]) => {
      const tombstones = await syncTombstones(blob);
      const remote = (await downloadJson<any[]>(blob)) ?? [];
      const localRaw = localStorage.getItem(localKey);
      let local: any[] = [];
      try { local = localRaw ? JSON.parse(localRaw) : []; } catch { local = []; }
      const byId = new Map<string, any>();
      // En bootstrap: local primero, luego remoto pisa → la nube es la verdad
      // para ids compartidos. Los locales nuevos (id no existente en remoto)
      // se conservan hasta que se suban.
      for (const item of local) if (item && item.id && !tombstones.has(item.id)) byId.set(item.id, item);
      for (const item of remote) if (item && item.id && !tombstones.has(item.id)) byId.set(item.id, item);
      const merged = Array.from(byId.values());
      localStorage.setItem(localKey, JSON.stringify(merged));
      // Si hay locales no presentes en remoto, o tombstones a aplicar, sincronizar
      if (merged.length !== remote.length || remote.some((r) => r?.id && tombstones.has(r.id))) {
        void uploadJson(blob, merged);
      }
    }),
    ...overwrite.map(async ([blob, localKey]) => {
      const remote = await downloadJson<any[]>(blob);
      let local: any[] = [];
      try {
        const parsed = JSON.parse(localStorage.getItem(localKey) || "[]");
        if (Array.isArray(parsed)) local = parsed;
      } catch { local = []; }

      if (Array.isArray(remote)) {
        // Catálogos: fusión por id. Lo remoto manda en ids compartidos y se
        // conservan las altas locales todavía no subidas.
        const byId = new Map<string, any>();
        for (const item of local) if (item?.id) byId.set(item.id, item);
        for (const item of remote) if (item?.id) byId.set(item.id, item);
        const merged = Array.from(byId.values());
        localStorage.setItem(localKey, JSON.stringify(merged));
        if (merged.length !== remote.length) void uploadJson(blob, merged);
      } else if (remote === null && local.length > 0) {
        void uploadJson(blob, local);
      }
    }),
  ]);
}

// ----- Refresco periódico: trae lo que cargaron otros operadores sin recargar la página -----
let refreshing = false;

/**
 * Descarga los blobs y los fusiona con lo que hay en localStorage.
 * - services/fuel: fusión por id. Lo remoto pisa a lo local en ids compartidos,
 *   pero se conservan los ids que sólo existen localmente (todavía sin subir).
 * - catálogos (clientes/personal/móviles): fusión por id, conservando altas locales.
 * Nunca sube nada: sólo lee. Así un operador con la página abierta no puede
 * borrar lo que cargó otro.
 */
export async function refreshFromAzure(): Promise<boolean> {
  if (!isAzureConfigured() || refreshing) return false;
  refreshing = true;
  let changed = false;
  try {
    const targets = [
      [BLOB_KEYS.services, LOCAL_KEYS.services],
      [BLOB_KEYS.fuel, LOCAL_KEYS.fuel],
      [BLOB_KEYS.clientes, LOCAL_KEYS.clientes],
      [BLOB_KEYS.personal, LOCAL_KEYS.personal],
      [BLOB_KEYS.moviles, LOCAL_KEYS.moviles],
    ] as const;

    await Promise.all(
      targets.map(async ([blob, localKey]) => {
        const remote = await downloadJson<any[]>(blob);
        if (!Array.isArray(remote)) return;
        const tombstones = new Set(getLocalTombstones(blob));
        let local: any[] = [];
        try {
          const raw = localStorage.getItem(localKey);
          const parsed = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) local = parsed;
        } catch { local = []; }

        const byId = new Map<string, any>();
        for (const item of local) if (item?.id && !tombstones.has(item.id)) byId.set(item.id, item);
        for (const item of remote) if (item?.id && !tombstones.has(item.id)) byId.set(item.id, item);
        const merged = Array.from(byId.values());
        const next = JSON.stringify(merged);
        if (next !== JSON.stringify(local)) {
          localStorage.setItem(localKey, next);
          changed = true;
        }
      }),
    );
  } catch (err) {
    console.warn("[Azure] refresh falló:", err);
  } finally {
    refreshing = false;
  }
  if (changed) {
    window.dispatchEvent(new Event("cenop:services-synced"));
    window.dispatchEvent(new Event("cenop:fuel-synced"));
  }
  return changed;
}

/** Arranca el refresco automático (intervalo + al volver a la pestaña). */
export function startAutoRefresh(intervalMs = 20000): () => void {
  if (!isAzureConfigured()) return () => {};
  const tick = () => { void refreshFromAzure(); };
  const onVisible = () => { if (document.visibilityState === "visible") tick(); };
  const timer = setInterval(tick, intervalMs);
  window.addEventListener("focus", tick);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearInterval(timer);
    window.removeEventListener("focus", tick);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
