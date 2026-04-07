import { useMemo } from "react";
import { ServiceEntry, FuelEntry, timeToMinutes } from "@/lib/types";
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

const tooltipFormatter = (value: number) => formatHoursMinutes(value);

export default function DashboardResumen({ services, fuelEntries, byPerson, byMovil, byCliente, totalProd, totalImprod, totalServicios, uniqueDays, totalFuel }: Props & {
  byPerson: { nombre: string; prod: number; improd: number; servicios: number; total: number }[];
  byMovil: { patente: string; prod: number; improd: number; servicios: number; total: number }[];
  byCliente: { cliente: string; prod: number; improd: number; servicios: number; total: number }[];
  totalProd: number;
  totalImprod: number;
  totalServicios: number;
  uniqueDays: number;
  totalFuel: number;
}) {
  const pieData = [
    { name: "Productivas", value: totalProd },
    { name: "Improductivas", value: totalImprod },
  ];

  const avgServiciosPorDia = uniqueDays > 0 ? (totalServicios / uniqueDays).toFixed(1) : "—";
  const avgProdPorServicio = totalServicios > 0 ? formatHoursMinutes(Math.round(totalProd / totalServicios)) : "—";
  const avgFuelPorDia = uniqueDays > 0 ? `$${Math.round(totalFuel / uniqueDays).toLocaleString("es-AR")}` : "—";

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Servicios" value={totalServicios} />
        <StatCard label="Días Operados" value={uniqueDays} />
        <StatCard label="Hs Productivas" value={formatHoursMinutes(totalProd)} className="text-success" />
        <StatCard label="Hs Improductivas" value={formatHoursMinutes(totalImprod)} className="text-destructive" />
        <StatCard label="Eficiencia General" value={totalProd + totalImprod > 0 ? `${Math.round((totalProd / (totalProd + totalImprod)) * 100)}%` : "—"} />
        <StatCard label="Prom. Servicios/Día" value={avgServiciosPorDia} />
        <StatCard label="Prom. Prod/Servicio" value={avgProdPorServicio} />
        <StatCard label="Personal Activo" value={byPerson.length} />
        <StatCard label="Móviles Utilizados" value={byMovil.length} />
        <StatCard label="Clientes Atendidos" value={byCliente.length} />
        <StatCard label="Combustible Total" value={`$${totalFuel.toLocaleString("es-AR")}`} />
        <StatCard label="Prom. Combustible/Día" value={avgFuelPorDia} />
      </div>

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
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Top 10 Personal por Horas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byPerson.slice(0, 10)} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
              <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 11 }} />
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
