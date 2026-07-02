import { useMemo, useState } from "react";
import { ServiceEntry, FuelEntry, getAdjustedHours, getServiceKey, normalizeClientName } from "@/lib/types";
import { formatHoursMinutes } from "@/lib/formatTime";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area,
} from "recharts";

interface DayData {
  fecha: string;
  label: string;
  prod: number;
  improd: number;
  total: number;
  servicios: number;
  eficiencia: number;
}

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
}

type KpiId = "servicios" | "dias" | "prod" | "improd" | "cenop" | "eficiencia" | "total-horas" | "personal" | "moviles" | "clientes" | "combustible";
type ChartRow = Record<string, string | number>;
type DetailMetric = { label: string; value: string; tone?: string };
type KpiDetail = {
  title: string;
  description: string;
  metrics: DetailMetric[];
  chartTitle: string;
  chartType: "bar" | "line" | "pie";
  data: ChartRow[];
  bars?: { key: string; name: string; color?: string }[];
  xKey?: string;
  valueKey?: string;
  tableTitle: string;
  rows: (string | number)[][];
  columns: string[];
  formatter?: (value: number) => string;
};

const tooltipFormatter = (value: number) => formatHoursMinutes(value);
const moneyFormatter = (value: number) => `$${value.toLocaleString("es-AR")}`;
const chartColor = (index: number) => `hsl(var(--chart-${(index % 5) + 1}))`;

function shortDate(fecha: string) {
  if (!fecha) return "Sin fecha";
  const [, month, day] = fecha.split("-");
  return day && month ? `${day}/${month}` : fecha;
}

function buildKpiDetailData(
  services: ServiceEntry[],
  fuelEntries: FuelEntry[],
  byPerson: { nombre: string; prod: number; improd: number; servicios: number; total: number }[],
  byMovil: { patente: string; prod: number; improd: number; servicios: number; total: number }[],
  byCliente: { cliente: string; prod: number; improd: number; servicios: number; total: number }[],
): Record<KpiId, KpiDetail> {
  const totalProd = byPerson.reduce((sum, person) => sum + person.prod, 0);
  const totalImprod = byPerson.reduce((sum, person) => sum + person.improd, 0);
  const totalHoras = totalProd + totalImprod;
  const totalServicios = new Set(services.map(getServiceKey)).size;
  const daysMap = new Map<string, { fecha: string; servicios: Set<string>; prod: number; improd: number }>();
  const cenopPersonMap = new Map<string, { prod: number; servicios: Set<string> }>();
  const fuelByMovil = new Map<string, { monto: number; litros: number; cargas: number }>();

  services.forEach((service) => {
    const hours = getAdjustedHours(service);
    const day = daysMap.get(service.fecha) || { fecha: service.fecha, servicios: new Set<string>(), prod: 0, improd: 0 };
    day.servicios.add(getServiceKey(service));
    day.prod += hours.prod;
    day.improd += hours.improd;
    daysMap.set(service.fecha, day);

    [
      { nombre: service.chofer, activo: service.choferEsOperaciones },
      { nombre: service.custodio, activo: service.custodioEsOperaciones },
    ].forEach((worker) => {
      if (!worker.nombre || !worker.activo) return;
      const current = cenopPersonMap.get(worker.nombre) || { prod: 0, servicios: new Set<string>() };
      current.prod += hours.prod;
      current.servicios.add(getServiceKey(service));
      cenopPersonMap.set(worker.nombre, current);
    });
  });

  fuelEntries.forEach((fuel) => {
    const current = fuelByMovil.get(fuel.movil) || { monto: 0, litros: 0, cargas: 0 };
    current.monto += fuel.monto;
    current.litros += fuel.litros;
    current.cargas += 1;
    fuelByMovil.set(fuel.movil, current);
  });

  const dailyData = [...daysMap.values()]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((day) => ({ fecha: shortDate(day.fecha), servicios: day.servicios.size, prod: day.prod, improd: day.improd, total: day.prod + day.improd, eficiencia: day.prod + day.improd > 0 ? Math.round((day.prod / (day.prod + day.improd)) * 100) : 0 }));

  const personalData = byPerson.map((p) => ({ name: p.nombre, prod: p.prod, improd: p.improd, total: p.total, servicios: p.servicios, eficiencia: p.total > 0 ? Math.round((p.prod / p.total) * 100) : 0 }));
  const movilData = byMovil.map((m) => ({ name: m.patente, prod: m.prod, improd: m.improd, total: m.total, servicios: m.servicios }));
  const clienteData = byCliente.map((c) => ({ name: c.cliente, prod: c.prod, improd: c.improd, total: c.total, servicios: c.servicios }));
  const cenopData = [...cenopPersonMap.entries()].map(([name, value]) => ({ name, prod: value.prod, servicios: value.servicios.size })).sort((a, b) => b.prod - a.prod);
  const fuelData = [...fuelByMovil.entries()].map(([name, value]) => ({ name, monto: value.monto, litros: value.litros, cargas: value.cargas })).sort((a, b) => b.monto - a.monto);

  return {
    servicios: { title: "Detalle de Total Servicios", description: "Servicios únicos agrupados por fecha y solicitud, con evolución diaria y carga operativa.", metrics: [{ label: "Servicios únicos", value: totalServicios.toString() }, { label: "Promedio diario", value: daysMap.size ? Math.round(totalServicios / daysMap.size).toString() : "0" }, { label: "Días con actividad", value: daysMap.size.toString() }], chartTitle: "Servicios por día", chartType: "line", data: dailyData, xKey: "fecha", bars: [{ key: "servicios", name: "Servicios" }], tableTitle: "Días con mayor movimiento", columns: ["Fecha", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total"], rows: dailyData.slice().sort((a, b) => Number(b.servicios) - Number(a.servicios)).slice(0, 12).map((d) => [d.fecha, d.servicios, formatHoursMinutes(Number(d.prod)), formatHoursMinutes(Number(d.improd)), formatHoursMinutes(Number(d.total))]) },
    dias: { title: "Detalle de Días Operados", description: "Cantidad de días con registros, intensidad diaria, horas acumuladas y eficiencia por jornada.", metrics: [{ label: "Días operados", value: daysMap.size.toString() }, { label: "Día más cargado", value: dailyData.length ? String(dailyData.slice().sort((a, b) => Number(b.total) - Number(a.total))[0].fecha) : "—" }, { label: "Horas por día", value: daysMap.size ? formatHoursMinutes(Math.round(totalHoras / daysMap.size)) : "—" }], chartTitle: "Horas por día", chartType: "bar", data: dailyData, xKey: "fecha", bars: [{ key: "prod", name: "Productivas" }, { key: "improd", name: "Improductivas" }], tableTitle: "Detalle por jornada", columns: ["Fecha", "Servicios", "Eficiencia", "Hs Total"], rows: dailyData.map((d) => [d.fecha, d.servicios, `${d.eficiencia}%`, formatHoursMinutes(Number(d.total))]) },
    prod: { title: "Detalle de Horas Productivas", description: "Horas efectivas de servicio desglosadas por personal para detectar mayor aporte operativo.", metrics: [{ label: "Hs productivas", value: formatHoursMinutes(totalProd), tone: "text-success" }, { label: "Participación", value: totalHoras ? `${Math.round((totalProd / totalHoras) * 100)}%` : "—" }, { label: "Top personal", value: personalData[0]?.name || "—" }], chartTitle: "Productivas por personal", chartType: "bar", data: personalData.slice(0, 12), xKey: "name", bars: [{ key: "prod", name: "Hs Productivas" }], formatter: tooltipFormatter, tableTitle: "Ranking productivo", columns: ["Personal", "Hs Productivas", "Servicios", "Eficiencia"], rows: personalData.slice(0, 15).map((p) => [p.name, formatHoursMinutes(Number(p.prod)), p.servicios, `${p.eficiencia}%`]) },
    improd: { title: "Detalle de Horas Improductivas", description: "Tiempos no productivos acumulados para identificar esperas, base y oportunidades de mejora.", metrics: [{ label: "Hs improductivas", value: formatHoursMinutes(totalImprod), tone: "text-destructive" }, { label: "Participación", value: totalHoras ? `${Math.round((totalImprod / totalHoras) * 100)}%` : "—" }, { label: "Mayor impacto", value: personalData.slice().sort((a, b) => Number(b.improd) - Number(a.improd))[0]?.name || "—" }], chartTitle: "Improductivas por personal", chartType: "bar", data: personalData.slice().sort((a, b) => Number(b.improd) - Number(a.improd)).slice(0, 12), xKey: "name", bars: [{ key: "improd", name: "Hs Improductivas" }], formatter: tooltipFormatter, tableTitle: "Ranking improductivo", columns: ["Personal", "Hs Improd.", "Hs Total", "Servicios"], rows: personalData.slice().sort((a, b) => Number(b.improd) - Number(a.improd)).slice(0, 15).map((p) => [p.name, formatHoursMinutes(Number(p.improd)), formatHoursMinutes(Number(p.total)), p.servicios]) },
    cenop: { title: "Detalle de CENOP en Operaciones", description: "Personal marcado para operaciones externas, con horas productivas y cantidad de servicios asociados.", metrics: [{ label: "Horas CENOP en OP", value: formatHoursMinutes(cenopData.reduce((s, r) => s + Number(r.prod), 0)), tone: "text-chart-4" }, { label: "Personas", value: cenopData.length.toString() }, { label: "Servicios", value: cenopData.reduce((s, r) => s + Number(r.servicios), 0).toString() }], chartTitle: "Aporte por persona", chartType: "bar", data: cenopData, xKey: "name", bars: [{ key: "prod", name: "Hs Productivas" }], formatter: tooltipFormatter, tableTitle: "Detalle por personal", columns: ["Personal", "Hs Productivas", "Servicios"], rows: cenopData.map((r) => [r.name, formatHoursMinutes(Number(r.prod)), r.servicios]) },
    eficiencia: { title: "Detalle de Eficiencia General", description: "Relación entre horas productivas y horas totales, con lectura diaria para ubicar desvíos.", metrics: [{ label: "Eficiencia", value: totalHoras ? `${Math.round((totalProd / totalHoras) * 100)}%` : "—" }, { label: "Hs Productivas", value: formatHoursMinutes(totalProd), tone: "text-success" }, { label: "Hs Improductivas", value: formatHoursMinutes(totalImprod), tone: "text-destructive" }], chartTitle: "Eficiencia por día", chartType: "line", data: dailyData, xKey: "fecha", bars: [{ key: "eficiencia", name: "Eficiencia %" }], tableTitle: "Eficiencia diaria", columns: ["Fecha", "Eficiencia", "Hs Prod.", "Hs Improd."], rows: dailyData.map((d) => [d.fecha, `${d.eficiencia}%`, formatHoursMinutes(Number(d.prod)), formatHoursMinutes(Number(d.improd))]) },
    "total-horas": { title: "Detalle de Total Horas", description: "Composición completa entre horas productivas e improductivas por personal, móvil y cliente.", metrics: [{ label: "Horas totales", value: formatHoursMinutes(totalHoras) }, { label: "Productivas", value: formatHoursMinutes(totalProd), tone: "text-success" }, { label: "Improductivas", value: formatHoursMinutes(totalImprod), tone: "text-destructive" }], chartTitle: "Composición por personal", chartType: "bar", data: personalData.slice(0, 12), xKey: "name", bars: [{ key: "prod", name: "Productivas" }, { key: "improd", name: "Improductivas" }], formatter: tooltipFormatter, tableTitle: "Totales por personal", columns: ["Personal", "Hs Prod.", "Hs Improd.", "Hs Total"], rows: personalData.slice(0, 15).map((p) => [p.name, formatHoursMinutes(Number(p.prod)), formatHoursMinutes(Number(p.improd)), formatHoursMinutes(Number(p.total))]) },
    personal: { title: "Detalle de Personal Activo", description: "Personal con participación en servicios, volumen asignado, horas y eficiencia individual.", metrics: [{ label: "Personal activo", value: byPerson.length.toString() }, { label: "Servicios asignados", value: byPerson.reduce((s, p) => s + p.servicios, 0).toString() }, { label: "Mayor carga", value: personalData[0]?.name || "—" }], chartTitle: "Carga por personal", chartType: "bar", data: personalData, xKey: "name", bars: [{ key: "total", name: "Hs Total" }], formatter: tooltipFormatter, tableTitle: "Personal activo", columns: ["Personal", "Servicios", "Hs Total", "Eficiencia"], rows: personalData.map((p) => [p.name, p.servicios, formatHoursMinutes(Number(p.total)), `${p.eficiencia}%`]) },
    moviles: { title: "Detalle de Móviles Utilizados", description: "Uso de móviles por patente, cantidad de servicios y horas vinculadas.", metrics: [{ label: "Móviles", value: byMovil.length.toString() }, { label: "Servicios", value: byMovil.reduce((s, m) => s + m.servicios, 0).toString() }, { label: "Mayor uso", value: movilData[0]?.name || "—" }], chartTitle: "Horas por móvil", chartType: "bar", data: movilData.slice(0, 12), xKey: "name", bars: [{ key: "total", name: "Hs Total" }], formatter: tooltipFormatter, tableTitle: "Uso por móvil", columns: ["Móvil", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total"], rows: movilData.slice(0, 15).map((m) => [m.name, m.servicios, formatHoursMinutes(Number(m.prod)), formatHoursMinutes(Number(m.improd)), formatHoursMinutes(Number(m.total))]) },
    clientes: { title: "Detalle de Clientes Atendidos", description: "Clientes con servicios registrados y horas productivas dentro del período.", metrics: [{ label: "Clientes", value: byCliente.length.toString() }, { label: "Servicios", value: byCliente.reduce((s, c) => s + c.servicios, 0).toString() }, { label: "Principal", value: clienteData[0]?.name || "—" }], chartTitle: "Horas productivas por cliente", chartType: "bar", data: clienteData.slice(0, 12), xKey: "name", bars: [{ key: "prod", name: "Hs Prod." }], formatter: tooltipFormatter, tableTitle: "Carga por cliente", columns: ["Cliente", "Servicios", "Hs Prod."], rows: clienteData.slice(0, 15).map((c) => [c.name, c.servicios, formatHoursMinutes(Number(c.prod))]) },
    combustible: { title: "Detalle de Combustible Total", description: "Cargas de combustible agrupadas por móvil, monto, litros y cantidad de registros.", metrics: [{ label: "Monto total", value: moneyFormatter(fuelEntries.reduce((s, f) => s + f.monto, 0)) }, { label: "Litros", value: fuelEntries.reduce((s, f) => s + f.litros, 0).toLocaleString("es-AR") }, { label: "Cargas", value: fuelEntries.length.toString() }], chartTitle: "Gasto por móvil", chartType: "bar", data: fuelData, xKey: "name", bars: [{ key: "monto", name: "Monto" }], formatter: moneyFormatter, tableTitle: "Consumo por móvil", columns: ["Móvil", "Cargas", "Litros", "Monto"], rows: fuelData.map((f) => [f.name, f.cargas, Number(f.litros).toLocaleString("es-AR"), moneyFormatter(Number(f.monto))]) },
  };
}

export default function DashboardResumen({ services, fuelEntries, byPerson, byMovil, byCliente, totalProd, totalImprod, totalServicios, uniqueDays, totalFuel, cenopEnOps }: Props & {
  byPerson: { nombre: string; prod: number; improd: number; servicios: number; total: number }[];
  byMovil: { patente: string; prod: number; improd: number; servicios: number; total: number }[];
  byCliente: { cliente: string; prod: number; improd: number; servicios: number; total: number }[];
  totalProd: number;
  totalImprod: number;
  totalServicios: number;
  uniqueDays: number;
  totalFuel: number;
  cenopEnOps: number;
}) {
  const [selectedKpi, setSelectedKpi] = useState<KpiId | null>(null);
  const topPersonalCount = Math.min(10, byPerson.length);
  const pieData = [
    { name: "Productivas", value: totalProd },
    { name: "Improductivas", value: totalImprod },
  ];

  const totalHoras = totalProd + totalImprod;
  const uniqueServices = useMemo(() => new Set(services.map(getServiceKey)).size, [services]);
  const detailData = useMemo(() => buildKpiDetailData(services, fuelEntries, byPerson, byMovil, byCliente), [services, fuelEntries, byPerson, byMovil, byCliente]);
  const selectedDetail = selectedKpi ? detailData[selectedKpi] : null;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Servicios" value={totalServicios} active={selectedKpi === "servicios"} onClick={() => setSelectedKpi(selectedKpi === "servicios" ? null : "servicios")} />
        <StatCard label="Días Operados" value={uniqueDays} active={selectedKpi === "dias"} onClick={() => setSelectedKpi(selectedKpi === "dias" ? null : "dias")} />
        <StatCard label="Hs Productivas" value={formatHoursMinutes(totalProd)} className="text-success" active={selectedKpi === "prod"} onClick={() => setSelectedKpi(selectedKpi === "prod" ? null : "prod")} />
        <StatCard label="Hs Improductivas" value={formatHoursMinutes(totalImprod)} className="text-destructive" active={selectedKpi === "improd"} onClick={() => setSelectedKpi(selectedKpi === "improd" ? null : "improd")} />
        <StatCard label="CENOP en Operaciones" value={formatHoursMinutes(cenopEnOps)} className="text-chart-4" active={selectedKpi === "cenop"} onClick={() => setSelectedKpi(selectedKpi === "cenop" ? null : "cenop")} />
        <StatCard label="Eficiencia General" value={totalHoras > 0 ? `${Math.round((totalProd / totalHoras) * 100)}%` : "—"} active={selectedKpi === "eficiencia"} onClick={() => setSelectedKpi(selectedKpi === "eficiencia" ? null : "eficiencia")} />
        <StatCard label="Total Horas" value={formatHoursMinutes(totalHoras)} active={selectedKpi === "total-horas"} onClick={() => setSelectedKpi(selectedKpi === "total-horas" ? null : "total-horas")} />
        <StatCard label="Personal Activo" value={byPerson.length} active={selectedKpi === "personal"} onClick={() => setSelectedKpi(selectedKpi === "personal" ? null : "personal")} />
        <StatCard label="Móviles Utilizados" value={byMovil.length} active={selectedKpi === "moviles"} onClick={() => setSelectedKpi(selectedKpi === "moviles" ? null : "moviles")} />
        <StatCard label="Clientes Atendidos" value={byCliente.length} active={selectedKpi === "clientes"} onClick={() => setSelectedKpi(selectedKpi === "clientes" ? null : "clientes")} />
        <StatCard label="Combustible Total" value={`$${totalFuel.toLocaleString("es-AR")}`} active={selectedKpi === "combustible"} onClick={() => setSelectedKpi(selectedKpi === "combustible" ? null : "combustible")} />
      </div>

      {selectedDetail && (
        <KpiDetailPanel detail={selectedDetail} totalHoras={totalHoras} totalServicios={uniqueServices} />
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Distribución Productivas vs Improductivas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                <Cell fill="hsl(142, 70%, 45%)" />
                <Cell fill="hsl(0, 72%, 50%)" />
              </Pie>
              <Tooltip formatter={tooltipFormatter} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            {topPersonalCount > 0 ? `Top ${topPersonalCount} Personal por Horas` : "Personal por Horas"}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byPerson.slice(0, 10)} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
              <YAxis type="category" dataKey="nombre" width={120} interval={0} tick={{ fontSize: 11 }} />
              <Tooltip formatter={tooltipFormatter} />
              <Bar dataKey="prod" name="Productivas" fill="hsl(142, 70%, 45%)" stackId="a" />
              <Bar dataKey="improd" name="Improductivas" fill="hsl(0, 72%, 50%)" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiDetailPanel({ detail, totalHoras, totalServicios }: { detail: KpiDetail; totalHoras: number; totalServicios: number }) {
  const xKey = detail.xKey || "name";
  const formatter = detail.formatter || tooltipFormatter;
  const chartHeight = Math.max(280, Math.min(520, detail.data.length * 34));

  return (
    <div className="glass-card p-5 space-y-5 border-primary/40">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{detail.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{detail.description}</p>
        </div>
        <div className="text-xs text-muted-foreground">{formatHoursMinutes(totalHoras)} · {totalServicios} servicios</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {detail.metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border border-border/70 bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{metric.label}</div>
            <div className={`stat-value text-lg mt-1 ${metric.tone || ""}`}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="rounded-md border border-border/70 p-4 min-h-[320px]">
          <h4 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">{detail.chartTitle}</h4>
          <ResponsiveContainer width="100%" height={chartHeight}>
            {detail.chartType === "line" ? (
              <LineChart data={detail.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => detail.valueKey === "eficiencia" ? `${v}%` : `${Math.floor(Number(v) / 60)}h`} />
                <Tooltip formatter={(value: number) => detail.bars?.[0]?.key === "eficiencia" ? `${value}%` : formatter(value)} />
                {detail.bars?.map((bar, index) => <Line key={bar.key} type="monotone" dataKey={bar.key} name={bar.name} stroke={bar.color || chartColor(index)} strokeWidth={2} dot={{ r: 3 }} />)}
              </LineChart>
            ) : (
              <BarChart data={detail.data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => detail.formatter === moneyFormatter ? moneyFormatter(Number(v)) : `${Math.floor(Number(v) / 60)}h`} />
                <YAxis type="category" dataKey={xKey} width={130} interval={0} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatter(value)} />
                <Legend />
                {detail.bars?.map((bar, index) => <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color || chartColor(index)} stackId={detail.bars && detail.bars.length > 1 ? "a" : undefined} />)}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="rounded-md border border-border/70 p-4 overflow-auto">
          <h4 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">{detail.tableTitle}</h4>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{detail.columns.map((column) => <th key={column} className="text-left py-2 pr-3 font-medium">{column}</th>)}</tr>
            </thead>
            <tbody>
              {detail.rows.map((row, index) => (
                <tr key={index} className="border-t border-border/60">
                  {row.map((cell, cellIndex) => <td key={cellIndex} className="py-2 pr-3 text-foreground/90 whitespace-nowrap">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, className = "", active = false, onClick }: { label: string; value: string | number; className?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`glass-card p-4 flex flex-col gap-1 text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${active ? "border-primary/70 bg-primary/10" : ""}`}>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`stat-value text-xl ${className}`}>{value}</span>
    </button>
  );
}
