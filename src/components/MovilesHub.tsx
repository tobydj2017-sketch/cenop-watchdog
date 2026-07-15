import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart,
} from "recharts";
import {
  Car, Fuel, Gauge, DollarSign, Users, MapPin, Calendar, Search, ArrowLeft,
  TrendingUp, Route, Receipt, LogOut, Moon, Sun,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/dashboard/DataTable";
import { FuelEntry, ServiceEntry } from "@/lib/types";
import { getMoviles, MovilEntry } from "@/lib/movilesStore";
import { useAuth } from "@/lib/authContext";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
  amLightTheme: boolean;
  setAmLightTheme: (v: boolean) => void;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const num = (n: number, dec = 0) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: dec, minimumFractionDigits: dec });

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

const PIE_COLORS = [
  "hsl(38 92% 50%)", "hsl(142 70% 45%)", "hsl(200 80% 55%)", "hsl(280 70% 60%)",
  "hsl(340 75% 55%)", "hsl(20 85% 55%)", "hsl(160 60% 45%)", "hsl(260 60% 60%)",
  "hsl(50 90% 55%)", "hsl(0 72% 55%)",
];

export default function MovilesHub({ services, fuelEntries, amLightTheme, setAmLightTheme }: Props) {
  const { user, logout } = useAuth();
  const [selected, setSelected] = useState<string>("");
  const [search, setSearch] = useState("");

  const moviles = useMemo<MovilEntry[]>(() => getMoviles(), []);
  const infoByPatente = useMemo(() => new Map(moviles.map((m) => [m.patente, m])), [moviles]);

  // Todas las patentes (móviles activos + presentes en cargas/servicios)
  const allPatentes = useMemo(() => {
    const set = new Set<string>();
    moviles.filter((m) => m.activo).forEach((m) => set.add(m.patente));
    fuelEntries.forEach((f) => f.movil && set.add(f.movil));
    services.forEach((s) => s.movil && set.add(s.movil));
    return Array.from(set).sort();
  }, [moviles, fuelEntries, services]);

  // Métricas por móvil (para las tarjetas)
  const metrics = useMemo(() => {
    const map = new Map<string, {
      cargas: number; litros: number; monto: number; kmFuel: number;
      servicios: number; kmServ: number; ultKm: number; ultimaFecha: string;
      peajesTotal: number;
    }>();
    for (const p of allPatentes) {
      map.set(p, { cargas: 0, litros: 0, monto: 0, kmFuel: 0, servicios: 0, kmServ: 0, ultKm: 0, ultimaFecha: "", peajesTotal: 0 });
    }
    for (const f of fuelEntries) {
      const cur = map.get(f.movil);
      if (!cur) continue;
      cur.cargas += 1;
      cur.litros += toNum(f.litros);
      cur.monto += toNum(f.monto);
      cur.kmFuel += toNum(f.kmRecorridos);
      const km = toNum(f.kilometraje);
      if (km > cur.ultKm) cur.ultKm = km;
      if (!cur.ultimaFecha || f.fecha > cur.ultimaFecha) cur.ultimaFecha = f.fecha;
    }
    for (const s of services) {
      const cur = map.get(s.movil);
      if (!cur) continue;
      cur.servicios += 1;
      cur.kmServ += toNum(s.kmRecorridos);
      (s.peajes || []).forEach((p) => { cur.peajesTotal += toNum(p.monto); });
    }
    return map;
  }, [allPatentes, fuelEntries, services]);

  const filteredPatentes = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return allPatentes;
    return allPatentes.filter((p) => {
      const info = infoByPatente.get(p);
      const hay = `${p} ${info?.marca || ""} ${info?.modelo || ""} ${info?.asignacion || ""}`.toUpperCase();
      return hay.includes(q);
    });
  }, [allPatentes, search, infoByPatente]);

  // Datos del móvil seleccionado
  const detail = useMemo(() => {
    if (!selected) return null;
    const info = infoByPatente.get(selected);
    const fuel = fuelEntries.filter((f) => f.movil === selected).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const srv = services.filter((s) => s.movil === selected).sort((a, b) => (a.fecha).localeCompare(b.fecha));
    const totalMonto = fuel.reduce((s, f) => s + toNum(f.monto), 0);
    const totalLitros = fuel.reduce((s, f) => s + toNum(f.litros), 0);
    const totalKmFuel = fuel.reduce((s, f) => s + toNum(f.kmRecorridos), 0);
    const totalKmServ = srv.reduce((s, x) => s + toNum(x.kmRecorridos), 0);
    const ultKm = fuel.reduce((mx, f) => Math.max(mx, toNum(f.kilometraje)), 0);
    const kmL = totalLitros > 0 ? totalKmFuel / totalLitros : 0;
    const precioL = totalLitros > 0 ? totalMonto / totalLitros : 0;
    const peajes: { fecha: string; ubicacion: string; monto: number; conCamion?: boolean; solicitud: number }[] = [];
    srv.forEach((s) => (s.peajes || []).forEach((p) =>
      peajes.push({ fecha: s.fecha, ubicacion: p.ubicacion || "", monto: toNum(p.monto), conCamion: p.conCamion, solicitud: s.solicitud }),
    ));
    const peajesTotal = peajes.reduce((s, p) => s + p.monto, 0);

    // Personal que usó el móvil (frecuencia)
    const personalMap = new Map<string, { nombre: string; rol: string; veces: number; horas: number }>();
    srv.forEach((s) => {
      const addPersona = (n: string, rol: string, hrs: string) => {
        if (!n) return;
        const cur = personalMap.get(n) || { nombre: n, rol, veces: 0, horas: 0 };
        cur.veces += 1;
        const [h, m] = (hrs || "0:00").split(":").map(Number);
        cur.horas += (h || 0) + (m || 0) / 60;
        personalMap.set(n, cur);
      };
      addPersona(s.chofer, "Chofer", s.horasTotalesChofer || s.horasTotales);
      if (s.custodio && s.custodio !== s.chofer) {
        addPersona(s.custodio, "Custodio", s.horasTotalesCustodio || s.horasTotales);
      }
    });
    const personal = Array.from(personalMap.values()).sort((a, b) => b.veces - a.veces);

    // Serie por día (KM combustible + servicios + gasto)
    const diaMap = new Map<string, { fecha: string; kmComb: number; kmServ: number; monto: number; litros: number }>();
    fuel.forEach((f) => {
      const cur = diaMap.get(f.fecha) || { fecha: f.fecha, kmComb: 0, kmServ: 0, monto: 0, litros: 0 };
      cur.kmComb += toNum(f.kmRecorridos);
      cur.monto += toNum(f.monto);
      cur.litros += toNum(f.litros);
      diaMap.set(f.fecha, cur);
    });
    srv.forEach((s) => {
      const cur = diaMap.get(s.fecha) || { fecha: s.fecha, kmComb: 0, kmServ: 0, monto: 0, litros: 0 };
      cur.kmServ += toNum(s.kmRecorridos);
      diaMap.set(s.fecha, cur);
    });
    const porDia = Array.from(diaMap.values())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((d) => ({ ...d, dia: fmtDate(d.fecha) }));

    // Kilometraje acumulado (odómetro) por carga
    const odom = fuel.filter((f) => toNum(f.kilometraje) > 0)
      .map((f) => ({ dia: fmtDate(f.fecha), km: toNum(f.kilometraje) }));

    // Destinos frecuentes
    const destMap = new Map<string, number>();
    srv.forEach((s) => {
      const d = (s.destino || "").trim() || "—";
      destMap.set(d, (destMap.get(d) || 0) + 1);
    });
    const destinos = Array.from(destMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);

    // Gasto por estación
    const estMap = new Map<string, number>();
    fuel.forEach((f) => {
      const e = (f.estacion || f.lugarCarga || "—").trim() || "—";
      estMap.set(e, (estMap.get(e) || 0) + toNum(f.monto));
    });
    const estaciones = Array.from(estMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);

    return {
      info, fuel, srv, totalMonto, totalLitros, totalKmFuel, totalKmServ,
      ultKm, kmL, precioL, peajes, peajesTotal, personal, porDia, odom, destinos, estaciones,
    };
  }, [selected, fuelEntries, services, infoByPatente]);

  // ============ VISTA DETALLE ============
  if (selected && detail) {
    const { info } = detail;
    const kpis = [
      { label: "Kilometraje actual", value: `${num(detail.ultKm)} km`, icon: Gauge, tint: "from-sky-500/25 to-sky-500/5" },
      { label: "KM recorridos (total)", value: `${num(detail.totalKmFuel + detail.totalKmServ)} km`, icon: Route, tint: "from-indigo-500/25 to-indigo-500/5" },
      { label: "Gasto en combustible", value: money(detail.totalMonto), icon: DollarSign, tint: "from-emerald-500/25 to-emerald-500/5" },
      { label: "Litros cargados", value: `${num(detail.totalLitros, 1)} L`, icon: Fuel, tint: "from-amber-500/25 to-amber-500/5" },
      { label: "Rendimiento", value: `${num(detail.kmL, 2)} km/L`, icon: TrendingUp, tint: "from-teal-500/25 to-teal-500/5" },
      { label: "Precio prom. litro", value: money(detail.precioL), icon: DollarSign, tint: "from-lime-500/25 to-lime-500/5" },
      { label: "Servicios realizados", value: num(detail.srv.length), icon: Car, tint: "from-fuchsia-500/25 to-fuchsia-500/5" },
      { label: "Peajes acumulados", value: money(detail.peajesTotal), icon: Receipt, tint: "from-rose-500/25 to-rose-500/5" },
    ];

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelected("")}>
            <ArrowLeft className="w-4 h-4" /> Volver a la flota
          </Button>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Usuario:</span>
              <span className="font-mono font-bold">{user?.username}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Moon className="w-4 h-4 text-muted-foreground" />
              <Switch checked={amLightTheme} onCheckedChange={setAmLightTheme} aria-label="Cambiar tema" />
              <Sun className="w-4 h-4 text-primary" />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={logout}>
              <LogOut className="w-3.5 h-3.5" /> Salir
            </Button>
          </div>
        </div>

        {/* Encabezado del móvil */}
        <div className="glass-card p-5 bg-gradient-to-br from-primary/15 to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/40">
                <Car className="w-8 h-8 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight">{selected}</div>
                <div className="text-sm text-muted-foreground">
                  {[info?.marca, info?.modelo, info?.anio].filter(Boolean).join(" · ") || "Sin datos de ficha"}
                </div>
                {info?.asignacion && (
                  <div className="text-xs mt-1 text-primary font-semibold uppercase tracking-wider">
                    Asignado: {info.asignacion}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {info?.tipoCombustible && (
                <div><span className="text-muted-foreground">Combustible:</span> <span className="font-semibold">{info.tipoCombustible}</span></div>
              )}
              {info?.consumoIdeal && (
                <div><span className="text-muted-foreground">Consumo ideal:</span> <span className="font-semibold">{info.consumoIdeal} L/100km</span></div>
              )}
              {info?.telefono && (
                <div><span className="text-muted-foreground">Teléfono:</span> <span className="font-mono">{info.telefono}</span></div>
              )}
              {info?.lugarCarga && (
                <div><span className="text-muted-foreground">Lugar de carga:</span> <span className="font-semibold">{info.lugarCarga}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {kpis.map(({ label, value, icon: Icon, tint }) => (
            <div key={label} className={`glass-card p-3 bg-gradient-to-br ${tint} border-border`}>
              <Icon className="w-4 h-4 text-primary" />
              <div className="mt-2">
                <div className="text-lg font-extrabold tracking-tight">{value}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Gráficos día a día */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" /> Kilómetros por día
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={detail.porDia}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${num(v)} km`} />
                <Legend />
                <Bar dataKey="kmComb" name="KM Combustible" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="kmServ" name="KM Servicios" fill="hsl(200 80% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Gasto y litros por día
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={detail.porDia}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) => name === "Monto" ? money(v) : `${num(v, 1)} L`} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="monto" name="Monto" stroke="hsl(142 70% 45%)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="litros" name="Litros" stroke="hsl(38 92% 50%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Odómetro + destinos */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" /> Evolución del kilometraje (odómetro)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={detail.odom}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["dataMin", "dataMax"]} />
                <Tooltip formatter={(v: number) => `${num(v)} km`} />
                <Area type="monotone" dataKey="km" name="Km odómetro" stroke="hsl(200 80% 55%)" fill="hsl(200 80% 55% / 0.3)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Destinos más frecuentes
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={detail.destinos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={(e: { name: string; value: number }) => `${e.name} (${e.value})`}>
                  {detail.destinos.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estaciones + personal */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
              <Fuel className="w-4 h-4 text-primary" /> Gasto por estación de carga
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={detail.estaciones} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={(e: { name: string; value: number }) => `${e.name}`}>
                  {detail.estaciones.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Personal que operó el móvil
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={detail.personal.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${num(v)} servicios`} />
                <Bar dataKey="veces" name="Servicios" fill="hsl(280 70% 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tablas de detalle */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Servicios realizados ({detail.srv.length})
          </h3>
          <DataTable
            columns={["Fecha", "Sol.", "Cliente", "Origen", "Destino", "Chofer", "Custodio", "KM rec.", "Peajes"]}
            rows={detail.srv.map((s) => [
              fmtDate(s.fecha),
              String(s.solicitud || "—"),
              s.cliente || "—",
              s.lugarSalida || "—",
              s.destino || "—",
              s.chofer || "—",
              s.custodio || "—",
              num(toNum(s.kmRecorridos)),
              money((s.peajes || []).reduce((t, p) => t + toNum(p.monto), 0)),
            ])}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Fuel className="w-4 h-4 text-primary" /> Cargas de combustible ({detail.fuel.length})
          </h3>
          <DataTable
            columns={["Fecha", "Hora", "Chofer", "Estación", "Litros", "$/L", "Monto", "KM", "KM Rec.", "Km/L", "Remito"]}
            rows={[...detail.fuel].reverse().map((f) => [
              fmtDate(f.fecha),
              f.hora || "—",
              f.chofer || "—",
              f.estacion || f.lugarCarga || "—",
              num(toNum(f.litros), 2),
              money(toNum(f.precioPorLitro)),
              money(toNum(f.monto)),
              num(toNum(f.kilometraje)),
              num(toNum(f.kmRecorridos)),
              toNum(f.litros) > 0 ? num(toNum(f.kmRecorridos) / toNum(f.litros), 2) : "—",
              f.numeroRemito || "—",
            ])}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> Peajes ({detail.peajes.length}) · Total {money(detail.peajesTotal)}
          </h3>
          <DataTable
            columns={["Fecha", "Solicitud", "Ubicación", "Con camión", "Monto"]}
            rows={detail.peajes.map((p) => [
              fmtDate(p.fecha),
              String(p.solicitud || "—"),
              p.ubicacion || "—",
              p.conCamion ? "Sí" : "No",
              money(p.monto),
            ])}
          />
        </div>
      </div>
    );
  }

  // ============ VISTA LISTA ============
  return (
    <div className="space-y-5">
      {/* Header con controles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" /> Gestión de Flota
          </h1>
          <p className="text-xs text-muted-foreground">
            {allPatentes.length} móviles · Seleccioná uno para ver su historial completo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Usuario:</span>
            <span className="font-mono font-bold">{user?.username}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Moon className="w-4 h-4 text-muted-foreground" />
            <Switch checked={amLightTheme} onCheckedChange={setAmLightTheme} aria-label="Cambiar tema" />
            <Sun className="w-4 h-4 text-primary" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={logout}>
            <LogOut className="w-3.5 h-3.5" /> Salir
          </Button>
        </div>
      </div>

      {/* Selector + búsqueda */}
      <div className="glass-card p-4 grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Buscar móvil</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Patente, marca, modelo o asignado…"
              className="pl-8 h-10"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Seleccionar directo</label>
          <Select value={selected || undefined} onValueChange={setSelected}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Elegí un móvil de la lista…" /></SelectTrigger>
            <SelectContent className="max-h-80">
              {allPatentes.map((p) => {
                const info = infoByPatente.get(p);
                return (
                  <SelectItem key={p} value={p}>
                    {p} {info?.marca && `· ${info.marca} ${info.modelo}`} {info?.asignacion && `· ${info.asignacion}`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPatentes.map((p) => {
          const info = infoByPatente.get(p);
          const m = metrics.get(p)!;
          const kmL = m.litros > 0 ? m.kmFuel / m.litros : 0;
          return (
            <button
              key={p}
              onClick={() => setSelected(p)}
              className="text-left glass-card p-4 hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30 group-hover:bg-primary/25 transition-colors">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-base font-extrabold tracking-tight">{p}</div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                      {[info?.marca, info?.modelo].filter(Boolean).join(" ") || "Sin ficha"}
                    </div>
                  </div>
                </div>
                {info?.anio && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                    {info.anio}
                  </span>
                )}
              </div>
              {info?.asignacion && (
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-primary truncate">
                  {info.asignacion}
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Km actual</div>
                  <div className="font-bold">{m.ultKm ? num(m.ultKm) : "—"}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Gasto</div>
                  <div className="font-bold">{money(m.monto)}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Cargas</div>
                  <div className="font-bold">{num(m.cargas)}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Servicios</div>
                  <div className="font-bold">{num(m.servicios)}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Rend.</div>
                  <div className="font-bold">{kmL > 0 ? `${num(kmL, 2)} km/L` : "—"}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Últ. carga</div>
                  <div className="font-bold">{m.ultimaFecha ? fmtDate(m.ultimaFecha) : "—"}</div>
                </div>
              </div>
            </button>
          );
        })}
        {filteredPatentes.length === 0 && (
          <div className="col-span-full glass-card p-8 text-center text-muted-foreground">
            No se encontraron móviles con esa búsqueda.
          </div>
        )}
      </div>
    </div>
  );
}
