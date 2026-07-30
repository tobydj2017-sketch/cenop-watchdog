import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CalendarDays, Plus, Copy, Trash2, Save, Check, AlertTriangle, ClipboardPaste } from "lucide-react";
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
  const rowsRef = useRef<Draft[]>([]);
  const persistedIds = useRef<Set<string>>(new Set());
  /** id -> timestamp de la última edición local (protege de que un sync remoto pise lo recién tipeado) */
  const lastEdit = useRef<Record<string, number>>({});
  const statusTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  rowsRef.current = rows;

  // Cargar/actualizar filas cuando cambia la fecha o llegan servicios sincronizados
  useEffect(() => {
    const existing = services
      .filter((s) => s.fecha === fecha)
      .sort((a, b) => (a.horaSolicitud || "99:99").localeCompare(b.horaSolicitud || "99:99") || (a.id || "").localeCompare(b.id || ""));
    existing.forEach((s) => persistedIds.current.add(s.id));
    const now = Date.now();
    setRows((prev) => {
      const prevById = new Map(prev.map((r) => [r.id, r]));
      const asDrafts: Draft[] = existing.map((s) => {
        const local = prevById.get(s.id);
        // Si el usuario editó esta fila hace menos de 15s, gana lo local (nunca se pierde lo tipeado)
        if (local && now - (lastEdit.current[s.id] || 0) < 15000) {
          return { ...local, _persisted: true };
        }
        return { ...s, _persisted: true, _saveStatus: local?._saveStatus ?? "idle" };
      });
      const existingIds = new Set(asDrafts.map((s) => s.id));
      const kept = prev.filter((r) => !existingIds.has(r.id) && r.fecha === fecha);
      // Mantener el orden que ya está en pantalla: las filas no deben saltar mientras se carga
      const prevOrder = new Map(prev.map((r, i) => [r.id, i]));
      asDrafts.sort((a, b) => (prevOrder.get(a.id) ?? 9999) - (prevOrder.get(b.id) ?? 9999));
      const merged = [...asDrafts, ...kept];
      if (merged.length === 0) return [emptyDraft(fecha, 1)];
      return merged;
    });

  }, [fecha, services]);

  // Al desmontar, limpio timers de UI (los datos ya están guardados en el instante)
  useEffect(() => () => {
    Object.values(statusTimers.current).forEach(clearTimeout);
    statusTimers.current = {};
  }, []);

  const clientes = useMemo(() => getActiveClientNames(), [services]);
  const choferes = useMemo(() => getPersonalByRole("chofer").map((p) => p.nombre), [services]);
  const custodios = useMemo(() => getPersonalByRole("custodio").map((p) => p.nombre), [services]);
  const moviles = useMemo(() => getActivePatentes(), [services]);
  const movilesMap = useMemo(() => {
    const m = new Map<string, string>();
    getMoviles().forEach((mv) => m.set(mv.patente, mv.telefono || ""));
    return m;
  }, [services]);


  const overlaps = useMemo(() => detectOverlaps(rows), [rows]);

  /** Guarda la fila AL INSTANTE (localStorage sincrónico + cola de subida a Azure). */
  const persistNow = useCallback((r: Draft) => {
    const clone: ServiceEntry = { ...r };
    delete (clone as any)._persisted;
    delete (clone as any)._saveStatus;
    delete (clone as any)._error;
    Object.assign(clone, computeServiceHours(clone));
    const ks = parseFloat(clone.kmSalida || ""); const kl = parseFloat(clone.kmLlegada || "");
    if (!isNaN(ks) && !isNaN(kl) && kl >= ks) clone.kmRecorridos = String(kl - ks);

    if (!isCountableServiceEntry(clone)) return;

    const setStatus = (status: Draft["_saveStatus"], error?: string) =>
      setRows((prev) => prev.map((p) => (p.id === r.id ? { ...p, _persisted: status !== "error" ? true : p._persisted, _saveStatus: status, _error: error } : p)));

    try {
      if (persistedIds.current.has(r.id)) {
        updateService(clone);
      } else {
        addService(clone);
        persistedIds.current.add(r.id);
      }
      setStatus("saved");
      onChanged();
      if (statusTimers.current[r.id]) clearTimeout(statusTimers.current[r.id]);
      statusTimers.current[r.id] = setTimeout(() => {
        setRows((prev) => prev.map((p) => (p.id === r.id && p._saveStatus === "saved" ? { ...p, _saveStatus: "idle" } : p)));
      }, 1000);
    } catch (e: any) {
      setStatus("error", e?.message || "Error");
    }
  }, [onChanged]);

  const updateRow = useCallback((id: string, patch: Partial<Draft>) => {
    const current = rowsRef.current.find((r) => r.id === id);
    if (!current) return;
    const next: Draft = { ...current, ...patch };
    // autocompletar celular si eligió móvil
    if (patch.movil !== undefined) {
      const tel = movilesMap.get(patch.movil || "");
      if (tel && !next.celular) next.celular = tel;
    }
    lastEdit.current[id] = Date.now();
    rowsRef.current = rowsRef.current.map((r) => (r.id === id ? next : r));
    setRows(rowsRef.current);
    // guardado inmediato, sin espera
    persistNow(next);
  }, [movilesMap, persistNow]);


  const addRow = () => {
    setRows((prev) => [...prev, emptyDraft(fecha, prev.length + 1)]);
  };
  const duplicateRow = (id: string) => {
    const src = rowsRef.current.find((r) => r.id === id);
    if (!src) return;
    const copy: Draft = { ...src, id: generateId(), solicitud: rowsRef.current.length + 1, _persisted: false, _saveStatus: "idle", remito: "", ordenCarga: "" };
    rowsRef.current = [...rowsRef.current, copy];
    setRows(rowsRef.current);
    lastEdit.current[copy.id] = Date.now();
    persistNow(copy);
  };

  const removeRow = (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    if (r._persisted || persistedIds.current.has(id)) {
      if (!confirm("¿Eliminar este servicio del sistema?")) return;
      deleteService(id);
      persistedIds.current.delete(id);
      onChanged();
    }
    delete lastEdit.current[id];
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

  // ---- Navegación automática entre casilleros ----
  const gridRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  const focusNext = useCallback((from: HTMLElement | null) => {
    const root = gridRef.current;
    if (!root || !from) return;
    const cells = Array.from(root.querySelectorAll<HTMLElement>("td[data-cell]"));
    const td = (from.closest?.("td[data-cell]") as HTMLElement | null) ?? from;
    const idx = cells.indexOf(td);
    for (let i = idx + 1; i < cells.length; i++) {
      const inp = cells[i].querySelector<HTMLInputElement>("input:not([disabled])");
      if (inp) {
        inp.focus();
        inp.select?.();
        inp.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
      }
    }
    saveRef.current?.focus();
    saveRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  const guardarTodo = useCallback(() => {
    rowsRef.current.forEach((r) => persistNow(r));
    onChanged();
  }, [persistNow, onChanged]);

  // ---- Selección / copiar / pegar filas ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<Draft[]>([]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };

  const copiarSeleccion = () => {
    const sel = rowsRef.current.filter((r) => selected.has(r.id));
    if (sel.length === 0) return;
    setClipboard(sel.map((r) => ({ ...r })));
  };

  const pegarFilas = () => {
    if (clipboard.length === 0) return;
    const nuevas: Draft[] = clipboard.map((src, idx) => ({
      ...src,
      id: generateId(),
      fecha,
      solicitud: rowsRef.current.length + idx + 1,
      remito: "",
      ordenCarga: "",
      kmSalida: "",
      kmLlegada: "",
      kmRecorridos: "",
      _persisted: false,
      _saveStatus: "idle",
    }));
    rowsRef.current = [...rowsRef.current, ...nuevas];
    setRows(rowsRef.current);
    nuevas.forEach((n) => {
      lastEdit.current[n.id] = Date.now();
      persistNow(n);
    });
    onChanged();
  };


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
          <Button size="sm" variant="outline" onClick={copiarSeleccion} disabled={selected.size === 0} className="gap-1.5 text-xs">
            <Copy className="w-3.5 h-3.5" /> Copiar ({selected.size})
          </Button>
          <Button size="sm" variant="outline" onClick={pegarFilas} disabled={clipboard.length === 0} className="gap-1.5 text-xs">
            <ClipboardPaste className="w-3.5 h-3.5" /> Pegar ({clipboard.length})
          </Button>
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
      <div ref={gridRef} className="glass-card overflow-auto min-h-[400px] max-h-[calc(100vh-260px)]">
        <table className="text-xs border-collapse" style={{ minWidth: "3000px" }}>
          <thead className="sticky top-0 z-20 bg-card">
            <tr className="border-b border-border">
              <th className="sticky left-0 z-30 bg-card px-2 py-2 text-left text-[10px] uppercase tracking-wider font-bold w-10">#</th>
              <Th w={92}>H. Solic.</Th>
              <Th w={180}>Cliente</Th>
              <Th w={150}>Lugar Salida</Th>
              <Th w={150}>Destino</Th>
              <Th w={190}>Chofer</Th>
              <Th w={92}>Cita Ch.</Th>
              <Th w={190}>Custodio</Th>
              <Th w={92}>Cita Cu.</Th>
              <Th w={130}>Móvil</Th>
              <Th w={120}>Celular</Th>
              <Th w={92}>Sal. CENOP</Th>
              <Th w={92}>Lleg. Serv.</Th>
              <Th w={92}>Inicia</Th>
              <Th w={92}>Lleg. Dest.</Th>
              <Th w={92}>Finaliza</Th>
              <Th w={92}>Lleg. CENOP</Th>
              <Th w={92}>Franco Ch.</Th>
              <Th w={92}>Franco Cu.</Th>
              <Th w={90}>KM Sal.</Th>
              <Th w={90}>KM Lleg.</Th>
              <Th w={80}>KM Rec.</Th>
              <Th w={110}>Orden Carga</Th>
              <Th w={110}>Remito</Th>
              <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground whitespace-nowrap" style={{ minWidth: 100 }}>
                <div className="flex items-center gap-1">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 accent-primary cursor-pointer" title="Seleccionar todas" />
                  Funciones
                </div>
              </th>

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
                  <TdTime value={r.horaSolicitud} onChange={(v) => updateRow(r.id, { horaSolicitud: v })} onAdvance={focusNext} />
                  <TdSelect value={r.cliente} options={clientes} onChange={(v) => updateRow(r.id, { cliente: v })} onAdvance={focusNext} />
                  <TdText value={r.lugarSalida} onChange={(v) => updateRow(r.id, { lugarSalida: v })} onAdvance={focusNext} />
                  <TdText value={r.destino} onChange={(v) => updateRow(r.id, { destino: v })} onAdvance={focusNext} />
                  <TdSelect value={r.chofer} options={choferes} onChange={(v) => updateRow(r.id, { chofer: v })} highlight={overlapCh} onAdvance={focusNext} />
                  <TdTime value={r.citaChofer} onChange={(v) => updateRow(r.id, { citaChofer: v })} onAdvance={focusNext} />
                  <TdSelect value={r.custodio} options={custodios} onChange={(v) => updateRow(r.id, { custodio: v })} highlight={overlapCu} onAdvance={focusNext} />
                  <TdTime value={r.citaCustodio} onChange={(v) => updateRow(r.id, { citaCustodio: v })} onAdvance={focusNext} />
                  <TdSelect value={r.movil} options={moviles} onChange={(v) => updateRow(r.id, { movil: v })} highlight={overlapMv} onAdvance={focusNext} />
                  <TdText value={r.celular} onChange={(v) => updateRow(r.id, { celular: v })} onAdvance={focusNext} />
                  <TdTime value={r.salidaCenop} onChange={(v) => updateRow(r.id, { salidaCenop: v })} onAdvance={focusNext} />
                  <TdTime value={r.llegadaServicio} onChange={(v) => updateRow(r.id, { llegadaServicio: v })} onAdvance={focusNext} />
                  <TdTime value={r.iniciaServicio} onChange={(v) => updateRow(r.id, { iniciaServicio: v })} onAdvance={focusNext} />
                  <TdTime value={r.llegadaDestino} onChange={(v) => updateRow(r.id, { llegadaDestino: v })} onAdvance={focusNext} />
                  <TdTime value={r.finalizaServicio} onChange={(v) => updateRow(r.id, { finalizaServicio: v })} onAdvance={focusNext} />
                  <TdTime value={r.llegadaCenop} onChange={(v) => updateRow(r.id, { llegadaCenop: v })} onAdvance={focusNext} />
                  <TdTime value={r.horaFrancoChofer} onChange={(v) => updateRow(r.id, { horaFrancoChofer: v })} onAdvance={focusNext} />
                  <TdTime value={r.horaFrancoCustodio} onChange={(v) => updateRow(r.id, { horaFrancoCustodio: v })} onAdvance={focusNext} />
                  <TdText value={r.kmSalida || ""} onChange={(v) => updateRow(r.id, { kmSalida: v })} numeric onAdvance={focusNext} />
                  <TdText value={r.kmLlegada || ""} onChange={(v) => updateRow(r.id, { kmLlegada: v })} numeric onAdvance={focusNext} />
                  <td className="px-2 py-1 font-mono text-muted-foreground text-center">{kmRec || "—"}</td>
                  <TdText value={r.ordenCarga} onChange={(v) => updateRow(r.id, { ordenCarga: v })} onAdvance={focusNext} />
                  <TdText value={r.remito} onChange={(v) => updateRow(r.id, { remito: v })} onAdvance={focusNext} />
                  <td className="px-1 py-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        title="Seleccionar fila"
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                      
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

      <div className="flex items-center gap-3 px-1">
        <Button ref={saveRef} onClick={guardarTodo} className="gap-2">
          <Save className="w-4 h-4" /> Guardar planilla
        </Button>
        <span className="text-[11px] text-muted-foreground italic">
          Cada dato (hora, cliente, chofer…) se guarda <b>al instante</b> al escribirlo y se sincroniza con Azure automáticamente. Al completar una hora o presionar <b>Enter</b> el cursor salta solo al siguiente casillero.
        </span>
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

/**
 * Input de texto con estado local: mientras se escribe nada externo puede pisar
 * el texto. Se confirma (y guarda) al salir del casillero, al presionar Enter
 * y también automáticamente 700 ms después de dejar de tipear.
 */
type Advance = (from: HTMLElement) => void;

function TdText({ value, onChange, numeric, onAdvance }: { value: string; onChange: (v: string) => void; numeric?: boolean; onAdvance?: Advance }) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRef = useRef(value);
  localRef.current = local;

  // Solo aceptar valores externos cuando el usuario no está escribiendo acá
  useEffect(() => {
    if (!focused) setLocal(value);
  }, [value, focused]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const commit = (v: string) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (v !== value) onChange(v);
  };

  return (
    <td className="px-1 py-1" data-cell>
      <input
        value={local}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const v = numeric ? e.target.value.replace(/[^\d.]/g, "") : e.target.value;
          setLocal(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(localRef.current), 700);
        }}
        onBlur={() => { setFocused(false); commit(localRef.current); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(localRef.current);
            onAdvance?.(e.currentTarget);
          }
        }}
        className="w-full h-8 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        inputMode={numeric ? "numeric" : undefined}
      />
    </td>
  );
}


function TdTime({ value, onChange, onAdvance }: { value: string; onChange: (v: string) => void; onAdvance?: Advance }) {
  const tdRef = useRef<HTMLTableCellElement>(null);
  const advance = () => { if (tdRef.current) onAdvance?.(tdRef.current); };
  return (
    <td
      className="px-1 py-1"
      data-cell
      ref={tdRef}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          advance();
        }
      }}
    >
      <TimeInput value={value} onChange={onChange} onComplete={advance} className="h-8 text-xs px-1 tracking-normal" />
    </td>
  );
}

function TdSelect({ value, options, onChange, highlight, onAdvance }: { value: string; options: string[]; onChange: (v: string) => void; highlight?: boolean; onAdvance?: Advance }) {
  const tdRef = useRef<HTMLTableCellElement>(null);
  return (
    <td className={`px-1 py-1 ${highlight ? "bg-amber-500/25" : ""}`} data-cell ref={tdRef}>
      <SearchableSelect
        value={value}
        options={options}
        onChange={onChange}
        onSelect={() => { if (tdRef.current) onAdvance?.(tdRef.current); }}
        portal
        inputClassName="h-8 text-xs"
      />
    </td>
  );
}

