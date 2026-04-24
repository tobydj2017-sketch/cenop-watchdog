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

const tooltipFormatter = (value: number) => formatHoursMinutes(value);
const moneyFormatter = (value: number) => `$${value.toLocaleString("es-AR")}`;
const chartColor = (index: number) => `hsl(var(--chart-${(index % 5) + 1}))`;

function shortDate(fecha: string) {
  if (!fecha) return "Sin fecha";
  const [, month, day] = fecha.split("-");
  return day && month ? `${day}/${month}` : fecha;
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

export function StatCard({ label, value, className = "" }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`stat-value text-xl ${className}`}>{value}</span>
    </div>
  );
}
