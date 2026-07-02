// Cliente para Azure Blob Storage usando SAS Token.
// La SAS URL apunta al contenedor `appcenop` y permite leer/escribir blobs.

const SAS_URL = import.meta.env.VITE_AZURE_BLOB_SAS_URL as string | undefined;

export function isAzureConfigured(): boolean {
  return !!SAS_URL && SAS_URL.includes("?");
}

function buildBlobUrl(blobName: string): string {
  if (!SAS_URL) throw new Error("VITE_AZURE_BLOB_SAS_URL no está configurada");
  const [base, query] = SAS_URL.split("?");
  return `${base}/${encodeURIComponent(blobName)}?${query}`;
}

export async function downloadJson<T>(blobName: string): Promise<T | null> {
  if (!isAzureConfigured()) return null;
  try {
    const res = await fetch(buildBlobUrl(blobName), {
      method: "GET",
      headers: { "x-ms-version": "2025-05-05" },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`[Azure] download ${blobName} -> ${res.status}`);
      return null;
    }
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn(`[Azure] error descargando ${blobName}:`, err);
    return null;
  }
}

export async function uploadJson(blobName: string, data: unknown): Promise<boolean> {
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
      console.warn(`[Azure] upload ${blobName} -> ${res.status}`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Azure] error subiendo ${blobName}:`, err);
    return false;
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

// ----- Bootstrap: descarga inicial -----
export const BLOB_KEYS = {
  services: "services.json",
  fuel: "fuel.json",
  clientes: "clientes.json",
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
  const entries = [
    [BLOB_KEYS.services, LOCAL_KEYS.services],
    [BLOB_KEYS.fuel, LOCAL_KEYS.fuel],
    [BLOB_KEYS.clientes, LOCAL_KEYS.clientes],
    [BLOB_KEYS.personal, LOCAL_KEYS.personal],
    [BLOB_KEYS.moviles, LOCAL_KEYS.moviles],
  ] as const;


  await Promise.all(
    entries.map(async ([blob, localKey]) => {
      const remote = await downloadJson<unknown>(blob);
      if (remote !== null && Array.isArray(remote)) {
        localStorage.setItem(localKey, JSON.stringify(remote));
      } else if (remote === null) {
        // Si Azure no tiene el blob aún, subir lo que haya local (primera vez)
        const local = localStorage.getItem(localKey);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              void uploadJson(blob, parsed);
            }
          } catch {/* ignore */}
        }
      }
    })
  );
}
