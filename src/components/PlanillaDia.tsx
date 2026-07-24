import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CalendarDays, Plus, Copy, Trash2, Save, Check, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/SearchableSelect";
import TimeInput from "@/components/TimeInput";
import {
  ServiceEntry,
  generateId,
  computeServiceHours,
  isCountableServiceEntry,
  timeToMinutes,
} from "@/lib/types";
import { addService, updateService, deleteService, getServices } from "@/lib/store";
import { getActiveClientNames } from "@/lib/clientStore";
import { getPersonal, getPersonalByRole } from "@/lib/personalStore";
import { getMoviles, getActivePatentes } from "@/lib/movilesStore";

type Draft = ServiceEntry & { _persisted?: boolean; _saveStatus?: "idle" | "saving" | "saved" | "error"; _error?: string };

function emptyDraft(fecha: string, nro: number): Draft {
  return {
    id: generateId(),
    solicitud: nro,
    horaSolicitud: "",
    cliente: "",
    lugarSalida: "",
    destino: "",
    chofer: "",
    citaChofer: "",
    custodio: "",
    citaCustodio: "",
    movil: "",
    celular: "",
    salidaCenop: "",
    llegadaServicio: "",
    iniciaServicio: "",
    llegadaDestino: "",
    finalizaServicio: "",
    llegadaCenop: "",
    horaFrancoChofer: "",
    horaFrancoCustodio: "",
    ordenCarga: "",
    remito: "",
    continuaOrden: "",
    observaciones: "",
    horasProductivas: "0:00:00",
    horasImproductivas1: "0:00:00",
    horasImproductivas2: "0:00:00",
    horasImproductivas: "0:00:00",
    horasTotales: "0:00:00",
    kmSalida: "",
    kmLlegada: "",
    kmRecorridos: "",
    fecha,
    _persisted: false,
    _saveStatus: "idle",
  };
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Overlap detection: return set of "rowId:field" flagged as conflicts. */
function detectOverlaps(rows: Draft[]): Set<string> {
  const flags = new Set<string>();
  const groups: Record<string, { field: keyof Draft; value: string }[]> = {
    chofer: [],
    custodio: [],
    movil: [],
  };
  const spans = new Map<string, { start: number; end: number; rowId: string; who: string }[]>();

  rows.forEach((r) => {
    const start = timeToMinutes(r.citaChofer || r.citaCustodio || r.salidaCenop || "");
    const end = timeToMinutes(r.horaFrancoChofer || r.horaFrancoCustodio || r.llegadaCenop || "");
    if (!start || !end || end <= start) return;
    (["chofer", "custodio", "movil"] as const).forEach((k) => {
      const v = (r[k] as string || "").trim();
      if (!v) return;
      const key = `${k}::${v.toUpperCase()}`;
      if (!spans.has(key)) spans.set(key, []);
      spans.get(key)!.push({ start, end, rowId: r.id, who: v });
    });
  });

  spans.forEach((arr, key) => {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i]; const b = arr[j];
        if (a.start < b.end && b.start < a.end) {
          const field = key.split("::")[0];
          flags.add(`${a.rowId}:${field}`);
          flags.add(`${b.rowId}:${field}`);
        }
      }
    }
  });
  return flags;
}

interface Props {
  services: ServiceEntry[];
  onChanged: () => void;
  initialDate?: string;
}

export default function PlanillaDia({ services, onChanged, initialDate }: Props) {
  const [fecha, setFecha] = useState(initialDate || todayISO());
  const [rows, setRows] = useState<Draft[]>([]);
  const debouncers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Cargar/actualizar filas cuando cambia la fecha o llegan servicios sincronizados
  useEffect(() => {
    const existing = services
      .filter((s) => s.fecha === fecha)
      .sort((a, b) => (a.horaSolicitud || "99:99").localeCompare(b.horaSolicitud || "99:99") || (a.id || "").localeCompare(b.id || ""));
    const asDrafts: Draft[] = existing.map((s) => ({ ...s, _persisted: true, _saveStatus: "idle" }));
    // preservar filas nuevas no persistidas (por id que no esté en existing)
    setRows((prev) => {
      const existingIds = new Set(asDrafts.map((s) => s.id));
      const kept = prev.filter((r) => !r._persisted && !existingIds.has(r.id) && (r as any).fecha === fecha);
      const merged = [...asDrafts, ...kept];
      if (merged.length === 0) return [emptyDraft(fecha, 1)];
      return merged;
    });
    // limpio debouncers
    return () => {
      Object.values(debouncers.current).forEach(clearTimeout);
      debouncers.current = {};
    };
  }, [fecha, services]);

  const clientes = useMemo(() => getActiveClientNames(), []);
  const choferes = useMemo(() => getPersonalByRole("chofer").map((p) => p.nombre), []);
  const custodios = useMemo(() => getPersonalByRole("custodio").map((p) => p.nombre), []);
  const moviles = useMemo(() => getActivePatentes(), []);
  const movilesMap = useMemo(() => {
    const m = new Map<string, string>();
    getMoviles().forEach((mv) => m.set(mv.patente, mv.telefono || ""));
    return m;
  }, []);

  const overlaps = useMemo(() => detectOverlaps(rows), [rows]);

  const persist = useCallback((r: Draft) => {
    // fila con al menos algún dato relevante
    const clone: ServiceEntry = { ...r };
    delete (clone as any)._persisted;
    delete (clone as any)._saveStatus;
    delete (clone as any)._error;
    // recompute hours
    Object.assign(clone, computeServiceHours(clone));
    // km recorridos
    const ks = parseFloat(clone.kmSalida || ""); const kl = parseFloat(clone.kmLlegada || "");
    if (!isNaN(ks) && !isNaN(kl) && kl >= ks) clone.kmRecorridos = String(kl - ks);

    if (!isCountableServiceEntry(clone)) return;

    setRows((prev) => prev.map((p) => p.id === r.id ? { ...p, _saveStatus: "saving" } : p));
    try {
      if (r._persisted) {
        updateService(clone);
      } else {
        addService(clone);
      }
      setRows((prev) => prev.map((p) => p.id === r.id ? { ...p, _persisted: true, _saveStatus: "saved" } : p));
      onChanged();
      setTimeout(() => {
        setRows((prev) => prev.map((p) => p.id === r.id && p._saveStatus === "saved" ? { ...p, _saveStatus: "idle" } : p));
      }, 1200);
    } catch (e: any) {
      setRows((prev) => prev.map((p) => p.id === r.id ? { ...p, _saveStatus: "error", _error: e?.message || "Error" } : p));
    }
  }, [onChanged]);

  const scheduleSave = useCallback((r: Draft) => {
    if (debouncers.current[r.id]) clearTimeout(debouncers.current[r.id]);
    debouncers.current[r.id] = setTimeout(() => persist(r), 400);
  }, [persist]);

  const updateRow = useCallback((id: string, patch: Partial<Draft>) => {
    setRows((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, ...patch } : r);
      const changed = next.find((r) => r.id === id);
      if (changed) {
        // autocompletar celular si eligió móvil
        if (patch.movil !== undefined) {
          const tel = movilesMap.get(patch.movil || "");
          if (tel && !changed.celular) {
            changed.celular = tel;
          }
        }
        scheduleSave(changed);
      }
      return next;
    });
  }, [movilesMap, scheduleSave]);

  const addRow = () => {
    setRows((prev) => [...prev, emptyDraft(fecha, prev.length + 1)]);
  };
  const duplicateRow = (id: string) => {
    setRows((prev) => {
      const src = prev.find((r) => r.id === id);
      if (!src) return prev;
      const copy: Draft = { ...src, id: generateId(), solicitud: prev.length + 1, _persisted: false, _saveStatus: "idle", remito: "", ordenCarga: "" };
      return [...prev, copy];
    });
  };
  const removeRow = (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    if (r._persisted) {
      if (!confirm("¿Eliminar este servicio del sistema?")) return;
      deleteService(id);
      onChanged();
    }
    setRows((prev) => prev.filter((x) => x.id !== id));
  };

  // Stats
  const stats = useMemo(() => {
    const persistedRows = rows.filter((r) => r._persisted || isCountableServiceEntry(r as any));
    const choferSet = new Set(persistedRows.map((r) => r.chofer).filter(Boolean));
    const custSet = new Set(persistedRows.map((r) => r.custodio).filter(Boolean));
    const movSet = new Set(persistedRows.map((r) => r.movil).filter(Boolean));
    const clientSet = new Set(persistedRows.map((r) => r.cliente).filter(Boolean));
    return {
      servicios: persistedRows.length,
      choferes: choferSet.size,
      custodios: custSet.size,
      moviles: movSet.size,
      clientes: clientSet.size,
    };
  }, [rows]);

  const anySaving = rows.some((r) => r._saveStatus === "saving");
  const anyError = rows.some((r) => r._saveStatus === "error");

  return (
    <div className="space-y-3">
      {/* Encabezado con controles y stats */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase font-semibold">Día proyectado</span>
          <Input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="h-9 w-40 text-sm font-mono"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-primary/15 text-primary font-bold">Servicios: {stats.servicios}</span>
          <span className="px-2 py-1 rounded bg-secondary font-semibold">Choferes: {stats.choferes}</span>
          <span className="px-2 py-1 rounded bg-secondary font-semibold">Custodios: {stats.custodios}</span>
          <span className="px-2 py-1 rounded bg-secondary font-semibold">Móviles: {stats.moviles}</span>
          <span className="px-2 py-1 rounded bg-secondary font-semibold">Clientes: {stats.clientes}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {anySaving && <span className="text-xs text-amber-400 flex items-center gap-1"><Save className="w-3.5 h-3.5 animate-pulse" /> Guardando…</span>}
          {!anySaving && !anyError && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Sincronizado</span>}
          {anyError && <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Error al guardar</span>}
          <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Agregar fila
          </Button>
        </div>
      </div>

      {overlaps.size > 0 && (
        <div className="glass-card p-2 border-l-4 border-amber-500 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Hay solapamientos horarios en chofer/custodio/móvil (celdas resaltadas en amarillo).</span>
        </div>
      )}

      {/* Grilla */}
      <div className="glass-card overflow-auto max-h-[calc(100vh-260px)]">
        <table className="text-xs border-collapse" style={{ minWidth: "2400px" }}>
          <thead className="sticky top-0 z-20 bg-card">
            <tr className="border-b border-border">
              <th className="sticky left-0 z-30 bg-card px-2 py-2 text-left text-[10px] uppercase tracking-wider font-bold w-10">#</th>
              <Th w={70}>H. Solic.</Th>
              <Th w={160}>Cliente</Th>
              <Th w={140}>Lugar Salida</Th>
              <Th w={140}>Destino</Th>
              <Th w={160}>Chofer</Th>
              <Th w={70}>Cita Ch.</Th>
              <Th w={160}>Custodio</Th>
              <Th w={70}>Cita Cu.</Th>
              <Th w={100}>Móvil</Th>
              <Th w={110}>Celular</Th>
              <Th w={70}>Sal. CENOP</Th>
              <Th w={70}>Lleg. Serv.</Th>
              <Th w={70}>Inicia</Th>
              <Th w={70}>Lleg. Dest.</Th>
              <Th w={70}>Finaliza</Th>
              <Th w={70}>Lleg. CENOP</Th>
              <Th w={70}>Franco Ch.</Th>
              <Th w={70}>Franco Cu.</Th>
              <Th w={90}>KM Sal.</Th>
              <Th w={90}>KM Lleg.</Th>
              <Th w={80}>KM Rec.</Th>
              <Th w={100}>Orden Carga</Th>
              <Th w={100}>Remito</Th>
              <Th w={100}>Continúa</Th>
              <Th w={180}>Observaciones</Th>
              <Th w={70}>{" "}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const kmRec = (() => {
                const ks = parseFloat(r.kmSalida || ""); const kl = parseFloat(r.kmLlegada || "");
                if (!isNaN(ks) && !isNaN(kl) && kl >= ks) return String(kl - ks);
                return "";
              })();
              const overlapCh = overlaps.has(`${r.id}:chofer`);
              const overlapCu = overlaps.has(`${r.id}:custodio`);
              const overlapMv = overlaps.has(`${r.id}:movil`);
              const statusColor = r._saveStatus === "saving" ? "bg-amber-500/10"
                : r._saveStatus === "saved" ? "bg-emerald-500/10"
                : r._saveStatus === "error" ? "bg-destructive/10"
                : "";
              return (
                <tr key={r.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${statusColor}`}>
                  <td className="sticky left-0 z-10 bg-card px-2 py-1 font-mono font-bold text-primary text-center">
                    {i + 1}
                    {r._saveStatus === "error" && (
                      <div className="text-[9px] text-destructive" title={r._error}>!</div>
                    )}
                  </td>
                  <TdTime value={r.horaSolicitud} onChange={(v) => updateRow(r.id, { horaSolicitud: v })} />
                  <TdSelect value={r.cliente} options={clientes} onChange={(v) => updateRow(r.id, { cliente: v })} />
                  <TdText value={r.lugarSalida} onChange={(v) => updateRow(r.id, { lugarSalida: v })} />
                  <TdText value={r.destino} onChange={(v) => updateRow(r.id, { destino: v })} />
                  <TdSelect value={r.chofer} options={choferes} onChange={(v) => updateRow(r.id, { chofer: v })} highlight={overlapCh} />
                  <TdTime value={r.citaChofer} onChange={(v) => updateRow(r.id, { citaChofer: v })} />
                  <TdSelect value={r.custodio} options={custodios} onChange={(v) => updateRow(r.id, { custodio: v })} highlight={overlapCu} />
                  <TdTime value={r.citaCustodio} onChange={(v) => updateRow(r.id, { citaCustodio: v })} />
                  <TdSelect value={r.movil} options={moviles} onChange={(v) => updateRow(r.id, { movil: v })} highlight={overlapMv} />
                  <TdText value={r.celular} onChange={(v) => updateRow(r.id, { celular: v })} />
                  <TdTime value={r.salidaCenop} onChange={(v) => updateRow(r.id, { salidaCenop: v })} />
                  <TdTime value={r.llegadaServicio} onChange={(v) => updateRow(r.id, { llegadaServicio: v })} />
                  <TdTime value={r.iniciaServicio} onChange={(v) => updateRow(r.id, { iniciaServicio: v })} />
                  <TdTime value={r.llegadaDestino} onChange={(v) => updateRow(r.id, { llegadaDestino: v })} />
                  <TdTime value={r.finalizaServicio} onChange={(v) => updateRow(r.id, { finalizaServicio: v })} />
                  <TdTime value={r.llegadaCenop} onChange={(v) => updateRow(r.id, { llegadaCenop: v })} />
                  <TdTime value={r.horaFrancoChofer} onChange={(v) => updateRow(r.id, { horaFrancoChofer: v })} />
                  <TdTime value={r.horaFrancoCustodio} onChange={(v) => updateRow(r.id, { horaFrancoCustodio: v })} />
                  <TdText value={r.kmSalida || ""} onChange={(v) => updateRow(r.id, { kmSalida: v })} numeric />
                  <TdText value={r.kmLlegada || ""} onChange={(v) => updateRow(r.id, { kmLlegada: v })} numeric />
                  <td className="px-2 py-1 font-mono text-muted-foreground text-center">{kmRec || "—"}</td>
                  <TdText value={r.ordenCarga} onChange={(v) => updateRow(r.id, { ordenCarga: v })} />
                  <TdText value={r.remito} onChange={(v) => updateRow(r.id, { remito: v })} />
                  <TdText value={r.continuaOrden} onChange={(v) => updateRow(r.id, { continuaOrden: v })} />
                  <TdText value={r.observaciones} onChange={(v) => updateRow(r.id, { observaciones: v })} />
                  <td className="px-1 py-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => duplicateRow(r.id)}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title="Duplicar fila"
                        type="button"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeRow(r.id)}
                        className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                        title={r._persisted ? "Eliminar del sistema" : "Eliminar fila"}
                        type="button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-muted-foreground italic px-1">
        Cada fila se guarda automáticamente al modificarla (auto-sync con Azure). El N° final se reasigna por orden de <b>Hora de Solicitud</b> tras guardar.
      </div>
    </div>
  );
}

function Th({ children, w }: { children: React.ReactNode; w: number }) {
  return (
    <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground whitespace-nowrap" style={{ minWidth: w }}>
      {children}
    </th>
  );
}

function TdText({ value, onChange, numeric }: { value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <td className="px-1 py-1">
      <input
        value={value}
        onChange={(e) => onChange(numeric ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)}
        className="w-full h-8 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        inputMode={numeric ? "numeric" : undefined}
      />
    </td>
  );
}

function TdTime({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <td className="px-1 py-1">
      <TimeInput value={value} onChange={onChange} className="h-8 text-xs" />
    </td>
  );
}

function TdSelect({ value, options, onChange, highlight }: { value: string; options: string[]; onChange: (v: string) => void; highlight?: boolean }) {
  return (
    <td className={`px-1 py-1 ${highlight ? "bg-amber-500/25" : ""}`}>
      <SearchableSelect
        value={value}
        options={options}
        onChange={onChange}
        inputClassName="h-8 text-xs"
      />
    </td>
  );
}
