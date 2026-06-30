import { useState, useMemo } from "react";
import { ServiceEntry, FuelEntry, getAdjustedHours, getServiceKey, normalizeClientName, getCenopEnOperacionesMinutes } from "@/lib/types";
import { formatHoursMinutes } from "@/lib/formatTime";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, Truck, Building2, CalendarDays, ArrowLeft, TrendingUp, LayoutDashboard, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardFilters from "@/components/DashboardFilters";
import DashboardResumen from "@/components/dashboard/DashboardResumen";
import DashboardDiario from "@/components/dashboard/DashboardDiario";
import DashboardRendimiento from "@/components/dashboard/DashboardRendimiento";
import DashboardJornada from "@/components/dashboard/DashboardJornada";
import { DataTable } from "@/components/dashboard/DataTable";
import DrillDownDialog, { DrillDownEntity } from "@/components/dashboard/DrillDownDialog";
import { exportResumenPDF, exportPersonalPDF, exportMovilesPDF, exportClientesPDF } from "@/lib/pdfExport";

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

type Tab = "resumen" | "diario" | "rendimiento" | "jornada" | "personal" | "moviles" | "clientes";

export default function FullDashboard({ services, fuelEntries, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [filteredServices, setFilteredServices] = useState<ServiceEntry[]>(services);
  const [filteredFuel, setFilteredFuel] = useState<FuelEntry[]>(fuelEntries);
  const [drill, setDrill] = useState<{ entity: DrillDownEntity; name: string } | null>(null);

  const openDrill = (entity: DrillDownEntity) => (data: any) => {
    const payload = data?.activePayload?.[0]?.payload ?? data?.payload ?? data;
    const name = payload?.nombre ?? payload?.patente ?? payload?.cliente ?? payload?.name;
    if (name) setDrill({ entity, name: String(name) });
  };

  const handleFilter = (s: ServiceEntry[], f: FuelEntry[]) => {
    setFilteredServices(s);
    setFilteredFuel(f);
  };

  const byPerson = useMemo(() => {
    const map: Record<string, { prod: number; improd: number; solicitudes: Set<string>; clientes: Set<string> }> = {};
    filteredServices.forEach((s) => {
      const name = s.chofer || s.custodio;
      if (!name) return;
      if (!map[name]) map[name] = { prod: 0, improd: 0, solicitudes: new Set(), clientes: new Set() };
      const h = getAdjustedHours(s);
      map[name].prod += h.prod;
      map[name].improd += h.improd;
      map[name].solicitudes.add(getServiceKey(s));
      map[name].clientes.add(normalizeClientName(s.cliente));
    });
    return Object.entries(map)
      .map(([nombre, v]) => ({ nombre, prod: v.prod, improd: v.improd, servicios: v.solicitudes.size, total: v.prod + v.improd, clientes: [...v.clientes].join(", ") }))
      .sort((a, b) => b.total - a.total);
  }, [filteredServices]);

  const byMovil = useMemo(() => {
    const map: Record<string, { prod: number; improd: number; solicitudes: Set<string> }> = {};
    filteredServices.forEach((s) => {
      if (!s.movil) return;
      if (!map[s.movil]) map[s.movil] = { prod: 0, improd: 0, solicitudes: new Set() };
      const h = getAdjustedHours(s);
      map[s.movil].prod += h.prod;
      map[s.movil].improd += h.improd;
      map[s.movil].solicitudes.add(getServiceKey(s));
    });
    return Object.entries(map)
      .map(([patente, v]) => ({ patente, prod: v.prod, improd: v.improd, servicios: v.solicitudes.size, total: v.prod + v.improd }))
      .sort((a, b) => b.total - a.total);
  }, [filteredServices]);

  const byCliente = useMemo(() => {
    const map: Record<string, { prod: number; improd: number; solicitudes: Set<string> }> = {};
    filteredServices.forEach((s) => {
      const cliente = normalizeClientName(s.cliente);
      if (!map[cliente]) map[cliente] = { prod: 0, improd: 0, solicitudes: new Set() };
      const h = getAdjustedHours(s);
      map[cliente].prod += h.prod;
      map[cliente].improd += h.improd;
      map[cliente].solicitudes.add(getServiceKey(s));
    });
    return Object.entries(map)
      .map(([cliente, v]) => ({ cliente, prod: v.prod, improd: v.improd, servicios: v.solicitudes.size, total: v.prod + v.improd }))
      .sort((a, b) => b.total - a.total);
  }, [filteredServices]);

  const totalProd = filteredServices.reduce((a, s) => a + getAdjustedHours(s).prod, 0);
  const totalImprod = filteredServices.reduce((a, s) => a + getAdjustedHours(s).improd, 0);
  const totalServicios = new Set(filteredServices.map(getServiceKey)).size;
  const uniqueDays = new Set(filteredServices.map((s) => s.fecha)).size;
  const totalFuel = filteredFuel.reduce((a, f) => a + f.monto, 0);
  const cenopEnOps = getCenopEnOperacionesMinutes(filteredServices);

  const tooltipFormatter = (value: number) => formatHoursMinutes(value);

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "resumen", label: "Resumen", icon: LayoutDashboard },
    { id: "diario", label: "Día a Día", icon: CalendarDays },
    { id: "rendimiento", label: "Rendimiento", icon: TrendingUp },
    { id: "jornada", label: "Jornada", icon: Clock },
    { id: "personal", label: "Personal", icon: Users },
    { id: "moviles", label: "Móviles", icon: Truck },
    { id: "clientes", label: "Clientes", icon: Building2 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
          <h2 className="section-title text-sm">Panel de Análisis Completo</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => {
            if (tab === "resumen") exportResumenPDF(filteredServices, filteredFuel, { totalProd, totalImprod, totalServicios, uniqueDays, totalFuel, cenopEnOps }, byPerson, byMovil, byCliente);
            else if (tab === "personal") exportPersonalPDF(byPerson);
            else if (tab === "moviles") exportMovilesPDF(byMovil);
            else if (tab === "clientes") exportClientesPDF(byCliente);
          }}
        >
          <Download className="w-3.5 h-3.5" /> Descargar PDF
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "default" : "secondary"}
            size="sm"
            onClick={() => setTab(t.id)}
            className="gap-1.5 text-xs"
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </Button>
        ))}
      </div>

      <DashboardFilters services={services} fuelEntries={fuelEntries} onFilter={handleFilter} />

      {tab === "resumen" && (
        <DashboardResumen
          services={filteredServices}
          fuelEntries={filteredFuel}
          byPerson={byPerson}
          byMovil={byMovil}
          byCliente={byCliente}
          totalProd={totalProd}
          totalImprod={totalImprod}
          totalServicios={totalServicios}
          uniqueDays={uniqueDays}
          totalFuel={totalFuel}
          cenopEnOps={cenopEnOps}
        />
      )}

      {tab === "diario" && (
        <DashboardDiario services={filteredServices} fuelEntries={filteredFuel} />
      )}

      {tab === "rendimiento" && (
        <DashboardRendimiento services={filteredServices} />
      )}

      {tab === "jornada" && (
        <DashboardJornada services={filteredServices} />
      )}

      {tab === "personal" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Horas por Vigilador / Chofer</h3>
            <ResponsiveContainer width="100%" height={Math.max(400, byPerson.length * 30)}>
              <BarChart data={byPerson} layout="vertical" onClick={openDrill("personal")}>
                <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
                <YAxis type="category" dataKey="nombre" width={160} tick={{ fontSize: 11, cursor: "pointer" }} onClick={(e: any) => e?.value && setDrill({ entity: "personal", name: String(e.value) })} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="prod" name="Hs Productivas" fill="hsl(142, 70%, 45%)" stackId="a" style={{ cursor: "pointer" }} />
                <Bar dataKey="improd" name="Hs Improductivas" fill="hsl(0, 72%, 50%)" stackId="a" style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable
            columns={["Personal", "Clientes", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total", "Eficiencia"]}
            rows={byPerson.map((p) => [
              p.nombre, p.clientes || "CENOP", p.servicios, formatHoursMinutes(p.prod), formatHoursMinutes(p.improd),
              formatHoursMinutes(p.total), p.total > 0 ? `${Math.round((p.prod / p.total) * 100)}%` : "—",
            ])}
          />
        </div>
      )}

      {tab === "moviles" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Horas por Patente / Móvil</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, byMovil.length * 35)}>
              <BarChart data={byMovil} layout="vertical" onClick={openDrill("movil")}>
                <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
                <YAxis type="category" dataKey="patente" width={100} tick={{ fontSize: 11, cursor: "pointer" }} onClick={(e: any) => e?.value && setDrill({ entity: "movil", name: String(e.value) })} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="prod" name="Hs Productivas" fill="hsl(142, 70%, 45%)" stackId="a" style={{ cursor: "pointer" }} />
                <Bar dataKey="improd" name="Hs Improductivas" fill="hsl(0, 72%, 50%)" stackId="a" style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable
            columns={["Patente", "Servicios", "Hs Prod.", "Hs Improd.", "Hs Total", "Eficiencia"]}
            rows={byMovil.map((m) => [
              m.patente, m.servicios, formatHoursMinutes(m.prod), formatHoursMinutes(m.improd),
              formatHoursMinutes(m.total), m.total > 0 ? `${Math.round((m.prod / m.total) * 100)}%` : "—",
            ])}
          />
        </div>
      )}

      {tab === "clientes" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Horas productivas por Cliente</h3>
            <ResponsiveContainer width="100%" height={Math.max(250, byCliente.length * 40)}>
              <BarChart data={byCliente} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
                <YAxis type="category" dataKey="cliente" width={150} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="prod" name="Hs Productivas" fill="hsl(142, 70%, 45%)" />
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
            columns={["Cliente", "Servicios", "Hs Prod."]}
            rows={byCliente.map((c) => [
              c.cliente, c.servicios, formatHoursMinutes(c.prod),
            ])}
          />
        </div>
      )}
    </div>
  );
}
