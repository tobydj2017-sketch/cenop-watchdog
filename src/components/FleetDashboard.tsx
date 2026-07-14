import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Filter, Fuel, Gauge, Car, DollarSign, TrendingUp, X, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/dashboard/DataTable";
import { FuelEntry, ServiceEntry } from "@/lib/types";
import { getMoviles } from "@/lib/movilesStore";
import { exportFleetPDF } from "@/lib/pdfExport";
import { exportFleetExcel } from "@/lib/excelExport";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
}

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const num = (n: number, dec = 0) => n.toLocaleString("es-AR", { maximumFractionDigits: dec, minimumFractionDigits: dec });

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function FleetDashboard({ services, fuelEntries }: Props) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [movil, setMovil] = useState("todos");

  const moviles = useMemo(() => getMoviles(), []);
  const movilOptions = useMemo(
    () => Array.from(new Set([...moviles.map((m) => m.patente), ...fuelEntries.map((f) => f.movil)])).filter(Boolean).sort(),
    [moviles, fuelEntries],
  );

  const fuel = useMemo(() => fuelEntries.filter((f) => {
    if (desde && f.fecha < desde) return false;
    if (hasta && f.fecha > hasta) return false;
    if (movil !== "todos" && f.movil !== movil) return false;
    return true;
  }), [fuelEntries, desde, hasta, movil]);

  const srv = useMemo(() => services.filter((s) => {
    if (desde && s.fecha < desde) return false;
    if (hasta && s.fecha > hasta) return false;
    if (movil !== "todos" && s.movil !== movil) return false;
    return true;
  }), [services, desde, hasta, movil]);

  // KPIs generales
  const kpis = useMemo(() => {
    const totalMonto = fuel.reduce((s, f) => s + toNum(f.monto), 0);
    const totalLitros = fuel.reduce((s, f) => s + toNum(f.litros), 0);
    const totalKmFuel = fuel.reduce((s, f) => s + toNum(f.kmRecorridos), 0);
    const totalKmServ = srv.reduce((s, x) => s + toNum(x.kmRecorridos), 0);
    const cargas = fuel.length;
    const flotaActiva = new Set(fuel.map((f) => f.movil)).size;
    const precioLitro = totalLitros > 0 ? totalMonto / totalLitros : 0;
    const rendimiento = totalLitros > 0 ? totalKmFuel / totalLitros : 0;
    return { totalMonto, totalLitros, totalKmFuel, totalKmServ, cargas, flotaActiva, precioLitro, rendimiento };
  }, [fuel, srv]);

  // Agregado por móvil
  const porMovil = useMemo(() => {
    const map = new Map<string, {
      movil: string; marca: string; modelo: string; asignacion: string;
      cargas: number; litros: number; monto: number; kmFuel: number;
      kmServ: number; servicios: number; ultKm: number; ultimaCarga: string;
    }>();
    const info = new Map(moviles.map((m) => [m.patente, m]));
    for (const f of fuel) {
      const key = f.movil || "SIN MÓVIL";
      const cur = map.get(key) || {
        movil: key,
        marca: info.get(key)?.marca || f.marca || "",
        modelo: info.get(key)?.modelo || f.modelo || "",
        asignacion: info.get(key)?.asignacion || "",
        cargas: 0, litros: 0, monto: 0, kmFuel: 0, kmServ: 0, servicios: 0,
        ultKm: 0, ultimaCarga: "",
      };
      cur.cargas += 1;
      cur.litros += toNum(f.litros);
      cur.monto += toNum(f.monto);
      cur.kmFuel += toNum(f.kmRecorridos);
      const km = toNum(f.kilometraje);
      if (km > cur.ultKm) cur.ultKm = km;
      if (!cur.ultimaCarga || f.fecha > cur.ultimaCarga) cur.ultimaCarga = f.fecha;
      map.set(key, cur);
    }
    for (const s of srv) {
      const key = s.movil || "SIN MÓVIL";
      const cur = map.get(key) || {
        movil: key,
        marca: info.get(key)?.marca || "",
        modelo: info.get(key)?.modelo || "",
        asignacion: info.get(key)?.asignacion || "",
        cargas: 0, litros: 0, monto: 0, kmFuel: 0, kmServ: 0, servicios: 0,
        ultKm: 0, ultimaCarga: "",
      };
      cur.servicios += 1;
      cur.kmServ += toNum(s.kmRecorridos);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.monto - a.monto);
  }, [fuel, srv, moviles]);

  // Evolución mensual
  const porMes = useMemo(() => {
    const map = new Map<string, { mes: string; monto: number; litros: number; km: number }>();
    for (const f of fuel) {
      const mes = (f.fecha || "").slice(0, 7);
      if (!mes) continue;
      const cur = map.get(mes) || { mes, monto: 0, litros: 0, km: 0 };
      cur.monto += toNum(f.monto);
      cur.litros += toNum(f.litros);
      cur.km += toNum(f.kmRecorridos);
      map.set(mes, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [fuel]);

  const hasFilters = desde || hasta || movil !== "todos";

  const kpiCards = [
    { label: "Gasto total", value: money(kpis.totalMonto), icon: DollarSign, tint: "from-emerald-500/25 to-emerald-500/5" },
    { label: "Litros cargados", value: `${num(kpis.totalLitros, 1)} L`, icon: Fuel, tint: "from-amber-500/25 to-amber-500/5" },
    { label: "KM recorridos (combustible)", value: `${num(kpis.totalKmFuel)} km`, icon: Gauge, tint: "from-sky-500/25 to-sky-500/5" },
    { label: "KM recorridos (servicios)", value: `${num(kpis.totalKmServ)} km`, icon: Gauge, tint: "from-indigo-500/25 to-indigo-500/5" },
    { label: "Cargas realizadas", value: num(kpis.cargas), icon: Fuel, tint: "from-fuchsia-500/25 to-fuchsia-500/5" },
    { label: "Móviles con actividad", value: num(kpis.flotaActiva), icon: Car, tint: "from-rose-500/25 to-rose-500/5" },
    { label: "Precio promedio L", value: money(kpis.precioLitro), icon: TrendingUp, tint: "from-lime-500/25 to-lime-500/5" },
    { label: "Rendimiento km/L", value: num(kpis.rendimiento, 2), icon: TrendingUp, tint: "from-teal-500/25 to-teal-500/5" },
  ];

  const tableColumns = ["Móvil", "Marca / Modelo", "Asignación", "Cargas", "Litros", "Monto", "KM comb.", "KM serv.", "Km/L", "Últ. KM", "Últ. carga"];
  const tableRows = porMovil.map((m) => [
    m.movil,
    [m.marca, m.modelo].filter(Boolean).join(" ") || "—",
    m.asignacion || "—",
    num(m.cargas),
    num(m.litros, 1),
    money(m.monto),
    num(m.kmFuel),
    num(m.kmServ),
    m.litros > 0 ? num(m.kmFuel / m.litros, 2) : "—",
    num(m.ultKm),
    m.ultimaCarga ? m.ultimaCarga.split("-").reverse().join("/") : "—",
  ]);

  const fuelColumns = ["Fecha", "Hora", "Móvil", "Chofer", "Estación", "Litros", "$/L", "Monto", "KM", "KM Rec.", "Km/L", "Remito"];
  const fuelRows = [...fuel]
    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))
    .map((f) => [
      f.fecha ? f.fecha.split("-").reverse().join("/") : "—",
      f.hora || "—",
      f.movil || "—",
      f.chofer || "—",
      f.estacion || "—",
      num(toNum(f.litros), 2),
      money(toNum(f.precioPorLitro)),
      money(toNum(f.monto)),
      num(toNum(f.kilometraje)),
      num(toNum(f.kmRecorridos)),
      toNum(f.litros) > 0 ? num(toNum(f.kmRecorridos) / toNum(f.litros), 2) : "—",
      f.numeroRemito || "—",
    ]);

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="w-4 h-4 text-primary" /> Filtros del Panel de Flota
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => { setDesde(""); setHasta(""); setMovil("todos"); }}>
              <X className="w-3 h-3" /> Limpiar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Móvil</Label>
            <Select value={movil} onValueChange={setMovil}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="todos">Todos</SelectItem>
                {movilOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" className="gap-2 flex-1" onClick={() => exportFleetExcel({ porMovil, fuel, kpis, desde, hasta, movil })}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
            <Button className="gap-2 flex-1" onClick={() => exportFleetPDF({ porMovil, fuel, kpis, desde, hasta, movil, porMes })}>
              <Download className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {fuel.length} cargas · {srv.length} servicios {hasFilters && "(filtrados)"}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className={`glass-card p-3 bg-gradient-to-br ${tint} border-border`}>
            <div className="flex items-center justify-between">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2">
              <div className="text-lg font-extrabold tracking-tight">{value}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Gasto de combustible por móvil</h3>
          <ResponsiveContainer width="100%" height={Math.max(280, Math.min(600, porMovil.length * 26))}>
            <BarChart data={porMovil.slice(0, 20)} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="movil" width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="monto" name="Monto" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Rendimiento (km / litro) por móvil</h3>
          <ResponsiveContainer width="100%" height={Math.max(280, Math.min(600, porMovil.length * 26))}>
            <BarChart data={porMovil.filter((m) => m.litros > 0).map((m) => ({ movil: m.movil, kmL: m.kmFuel / m.litros })).sort((a, b) => b.kmL - a.kmL).slice(0, 20)} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="movil" width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${num(v, 2)} km/L`} />
              <Bar dataKey="kmL" name="km / L" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {porMes.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Evolución mensual</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(v: number, name: string) => name === "Monto" ? money(v) : num(v, 1)} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="monto" name="Monto" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="litros" name="Litros" stroke="hsl(var(--accent, 200 80% 50%))" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="km" name="KM" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla por móvil */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resumen por móvil</h3>
        <DataTable columns={tableColumns} rows={tableRows} />
      </div>

      {/* Tabla de cargas */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Detalle de cargas de combustible</h3>
        <DataTable columns={fuelColumns} rows={fuelRows} />
      </div>
    </div>
  );
}
