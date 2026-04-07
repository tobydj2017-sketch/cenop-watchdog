import { useState, useMemo } from "react";
import { ServiceEntry, FuelEntry, timeToMinutes } from "@/lib/types";
import { formatHoursMinutes } from "@/lib/formatTime";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, Truck, Building2, CalendarDays, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardFilters from "@/components/DashboardFilters";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
  onBack: () => void;
}

const COLORS = [
  "hsl(142, 70%, 45%)", "hsl(0, 72%, 50%)", "hsl(38, 92%, 50%)",
  "hsl(200, 70%, 50%)", "hsl(280, 60%, 55%)", "hsl(160, 60%, 40%)",
  "hsl(20, 80%, 50%)", "hsl(320, 60%, 50%)", "hsl(60, 70%, 45%)",
  "hsl(100, 50%, 45%)",
];

type Tab = "resumen" | "personal" | "moviles" | "clientes";

export default function FullDashboard({ services, fuelEntries, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [filteredServices, setFilteredServices] = useState<ServiceEntry[]>(services);
  const [filteredFuel, setFilteredFuel] = useState<FuelEntry[]>(fuelEntries);

  const handleFilter = (s: ServiceEntry[], f: FuelEntry[]) => {
    setFilteredServices(s);
    setFilteredFuel(f);
  };
  // Aggregate by person (chofer + custodio combined as "personal")
  const byPerson = useMemo(() => {
    const map: Record<string, { prod: number; improd: number; servicios: number }> = {};
    filteredServices.forEach((s) => {
      const name = s.chofer || s.custodio;
      if (!name) return;
      if (!map[name]) map[name] = { prod: 0, improd: 0, servicios: 0 };
      map[name].prod += timeToMinutes(s.horasProductivas);
      map[name].improd += timeToMinutes(s.horasImproductivas);
      map[name].servicios += 1;
    });
    return Object.entries(map)
      .map(([nombre, v]) => ({ nombre, ...v, total: v.prod + v.improd }))
      .sort((a, b) => b.total - a.total);
  }, [filteredServices]);

  // Aggregate by vehicle
  const byMovil = useMemo(() => {
    const map: Record<string, { prod: number; improd: number; servicios: number }> = {};
    filteredServices.forEach((s) => {
      if (!s.movil) return;
      if (!map[s.movil]) map[s.movil] = { prod: 0, improd: 0, servicios: 0 };
      map[s.movil].prod += timeToMinutes(s.horasProductivas);
      map[s.movil].improd += timeToMinutes(s.horasImproductivas);
      map[s.movil].servicios += 1;
    });
    return Object.entries(map)
      .map(([patente, v]) => ({ patente, ...v, total: v.prod + v.improd }))
      .sort((a, b) => b.total - a.total);
  }, [filteredServices]);

  // Aggregate by client
  const byCliente = useMemo(() => {
    const map: Record<string, { prod: number; improd: number; servicios: number }> = {};
    filteredServices.forEach((s) => {
      if (!s.cliente) return;
      if (!map[s.cliente]) map[s.cliente] = { prod: 0, improd: 0, servicios: 0 };
      map[s.cliente].prod += timeToMinutes(s.horasProductivas);
      map[s.cliente].improd += timeToMinutes(s.horasImproductivas);
      map[s.cliente].servicios += 1;
    });
    return Object.entries(map)
      .map(([cliente, v]) => ({ cliente, ...v, total: v.prod + v.improd }))
      .sort((a, b) => b.total - a.total);
  }, [filteredServices]);

  // Summary stats
  const totalProd = services.reduce((a, s) => a + timeToMinutes(s.horasProductivas), 0);
  const totalImprod = services.reduce((a, s) => a + timeToMinutes(s.horasImproductivas), 0);
  const totalServicios = services.length;
  const uniqueDays = new Set(services.map((s) => s.fecha)).size;
  const totalFuel = fuelEntries.reduce((a, f) => a + f.monto, 0);

  const pieData = [
    { name: "Productivas", value: totalProd },
    { name: "Improductivas", value: totalImprod },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "resumen", label: "Resumen", icon: CalendarDays },
    { id: "personal", label: "Por Personal", icon: Users },
    { id: "moviles", label: "Por Móvil/Patente", icon: Truck },
    { id: "clientes", label: "Por Cliente", icon: Building2 },
  ];

  const tooltipFormatter = (value: number) => formatHoursMinutes(value);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <h2 className="section-title text-sm">Panel de Análisis Completo</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "default" : "secondary"}
            size="sm"
            onClick={() => setTab(t.id)}
            className="gap-2"
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </Button>
        ))}
      </div>

      {/* Resumen */}
      {tab === "resumen" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Servicios" value={totalServicios} />
            <StatCard label="Días Operados" value={uniqueDays} />
            <StatCard label="Hs Productivas Totales" value={formatHoursMinutes(totalProd)} className="text-success" />
            <StatCard label="Hs Improductivas Totales" value={formatHoursMinutes(totalImprod)} className="text-destructive" />
            <StatCard label="Eficiencia General" value={totalProd + totalImprod > 0 ? `${Math.round((totalProd / (totalProd + totalImprod)) * 100)}%` : "—"} />
            <StatCard label="Personal Activo" value={byPerson.length} />
            <StatCard label="Móviles Utilizados" value={byMovil.length} />
            <StatCard label="Combustible Total" value={`$${totalFuel.toLocaleString("es-AR")}`} />
          </div>

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
      )}

      {/* Por Personal */}
      {tab === "personal" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Horas por Vigilador / Chofer</h3>
            <ResponsiveContainer width="100%" height={Math.max(400, byPerson.length * 30)}>
              <BarChart data={byPerson} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
                <YAxis type="category" dataKey="nombre" width={160} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="prod" name="Hs Productivas" fill="hsl(142, 70%, 45%)" stackId="a" />
                <Bar dataKey="improd" name="Hs Improductivas" fill="hsl(0, 72%, 50%)" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable
            columns={["Personal", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total", "Eficiencia"]}
            rows={byPerson.map((p) => [
              p.nombre,
              p.servicios,
              formatHoursMinutes(p.prod),
              formatHoursMinutes(p.improd),
              formatHoursMinutes(p.total),
              p.total > 0 ? `${Math.round((p.prod / p.total) * 100)}%` : "—",
            ])}
          />
        </div>
      )}

      {/* Por Móvil */}
      {tab === "moviles" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Horas por Patente / Móvil</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, byMovil.length * 35)}>
              <BarChart data={byMovil} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
                <YAxis type="category" dataKey="patente" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="prod" name="Hs Productivas" fill="hsl(142, 70%, 45%)" stackId="a" />
                <Bar dataKey="improd" name="Hs Improductivas" fill="hsl(0, 72%, 50%)" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable
            columns={["Patente", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total", "Eficiencia"]}
            rows={byMovil.map((m) => [
              m.patente,
              m.servicios,
              formatHoursMinutes(m.prod),
              formatHoursMinutes(m.improd),
              formatHoursMinutes(m.total),
              m.total > 0 ? `${Math.round((m.prod / m.total) * 100)}%` : "—",
            ])}
          />
        </div>
      )}

      {/* Por Cliente */}
      {tab === "clientes" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Horas por Cliente</h3>
            <ResponsiveContainer width="100%" height={Math.max(250, byCliente.length * 40)}>
              <BarChart data={byCliente} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
                <YAxis type="category" dataKey="cliente" width={150} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="prod" name="Hs Productivas" fill="hsl(142, 70%, 45%)" stackId="a" />
                <Bar dataKey="improd" name="Hs Improductivas" fill="hsl(0, 72%, 50%)" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Distribución de Servicios por Cliente</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byCliente.map((c) => ({ name: c.cliente, value: c.servicios }))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {byCliente.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <DataTable
            columns={["Cliente", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total", "Eficiencia"]}
            rows={byCliente.map((c) => [
              c.cliente,
              c.servicios,
              formatHoursMinutes(c.prod),
              formatHoursMinutes(c.improd),
              formatHoursMinutes(c.total),
              c.total > 0 ? `${Math.round((c.prod / c.total) * 100)}%` : "—",
            ])}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, className = "" }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`stat-value text-xl ${className}`}>{value}</span>
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c} className="px-3 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-3 py-2.5 ${j === 0 ? "font-semibold" : "font-mono text-xs"} ${
                    columns[j]?.includes("Prod.") && !columns[j]?.includes("Improd.") ? "text-success font-semibold" :
                    columns[j]?.includes("Improd.") ? "text-destructive font-semibold" : ""
                  }`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
