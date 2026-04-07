import { useMemo, useState } from "react";
import { ServiceEntry, getAdjustedHours, getServiceKey, normalizeClientName } from "@/lib/types";
import { formatHoursMinutes, getDayAbbr } from "@/lib/formatTime";
import { StatCard } from "./DashboardResumen";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const PIE_COLORS = [
  "hsl(142, 70%, 45%)", "hsl(200, 70%, 50%)", "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 55%)", "hsl(0, 72%, 50%)", "hsl(160, 60%, 40%)",
  "hsl(320, 60%, 50%)", "hsl(60, 70%, 45%)",
];

interface Props {
  services: ServiceEntry[];
}

const tooltipFormatter = (value: number) => formatHoursMinutes(value);

const DayTick = ({ x, y, payload }: any) => {
  const parts = (payload.value || "").split("\n");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={9} fill="hsl(0,0%,70%)">{parts[0]}</text>
      <text x={0} y={0} dy={23} textAnchor="middle" fontSize={7} fill="hsl(0,0%,50%)" fontStyle="italic">{parts[1] || ""}</text>
    </g>
  );
};

interface PersonData {
  nombre: string;
  prod: number;
  improd: number;
  total: number;
  servicios: number;
  eficiencia: number;
  promProdPorServ: number;
  clientes: string[];
  clienteDetalle: { cliente: string; prod: number; improd: number; servicios: number }[];
  diaDetalle: { fecha: string; label: string; dia: string; labelConDia: string; prod: number; improd: number; servicios: number; clientes: string[] }[];
}

export default function DashboardRendimiento({ services }: Props) {
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());

  const byPerson = useMemo((): PersonData[] => {
    const personMap: Record<string, {
      prod: number; improd: number; solicitudes: Set<string>;
      clienteMap: Record<string, { prod: number; improd: number; solicitudes: Set<string> }>;
      dayMap: Record<string, { prod: number; improd: number; solicitudes: Set<string>; clientes: Set<string> }>;
    }> = {};

    services.forEach((s) => {
      [s.chofer, s.custodio].forEach((name) => {
        if (!name) return;
        if (!personMap[name]) personMap[name] = {
          prod: 0, improd: 0, solicitudes: new Set(),
          clienteMap: {}, dayMap: {},
        };
        const p = personMap[name];
        const h = getAdjustedHours(s);
        const serviceKey = getServiceKey(s);
        const cli = normalizeClientName(s.cliente);

        p.prod += h.prod;
        p.improd += h.improd;
        p.solicitudes.add(serviceKey);

        if (!p.clienteMap[cli]) p.clienteMap[cli] = { prod: 0, improd: 0, solicitudes: new Set() };
        p.clienteMap[cli].prod += h.prod;
        p.clienteMap[cli].improd += h.improd;
        p.clienteMap[cli].solicitudes.add(serviceKey);

        if (s.fecha) {
          if (!p.dayMap[s.fecha]) p.dayMap[s.fecha] = { prod: 0, improd: 0, solicitudes: new Set(), clientes: new Set() };
          p.dayMap[s.fecha].prod += h.prod;
          p.dayMap[s.fecha].improd += h.improd;
          p.dayMap[s.fecha].solicitudes.add(serviceKey);
          p.dayMap[s.fecha].clientes.add(cli);
        }
      });
    });

    return Object.entries(personMap)
      .map(([nombre, v]) => {
        const total = v.prod + v.improd;
        const servicios = v.solicitudes.size;
        return {
          nombre,
          prod: v.prod,
          improd: v.improd,
          total,
          servicios,
          eficiencia: total > 0 ? Math.round((v.prod / total) * 100) : 0,
          promProdPorServ: servicios > 0 ? Math.round(v.prod / servicios) : 0,
          clientes: Object.keys(v.clienteMap),
          clienteDetalle: Object.entries(v.clienteMap)
            .map(([cliente, cv]) => ({ cliente, prod: cv.prod, improd: cv.improd, servicios: cv.solicitudes.size }))
            .sort((a, b) => b.servicios - a.servicios),
          diaDetalle: Object.entries(v.dayMap)
            .map(([fecha, dv]) => ({
              fecha,
              label: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`,
              dia: getDayAbbr(fecha),
              labelConDia: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}\n${getDayAbbr(fecha)}`,
              prod: dv.prod,
              improd: dv.improd,
              servicios: dv.solicitudes.size,
              clientes: [...dv.clientes],
            }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha)),
        };
      })
      .filter((p) => p.servicios >= 1)
      .sort((a, b) => b.total - a.total);
  }, [services]);

  const filtered = byPerson.filter((p) =>
    p.nombre.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const avgEff = filtered.length > 0 ? Math.round(filtered.reduce((a, p) => a + p.eficiencia, 0) / filtered.length) : 0;
  const avgProdPerServ = filtered.length > 0 ? Math.round(filtered.reduce((a, p) => a + p.promProdPorServ, 0) / filtered.length) : 0;
  const totalServAll = filtered.reduce((a, p) => a + p.servicios, 0);

  const compareData = useMemo(() => {
    if (!compareMode || compareSelection.size === 0) return [];
    return byPerson.filter((p) => compareSelection.has(p.nombre));
  }, [compareMode, compareSelection, byPerson]);

  const toggleExpand = (name: string) => {
    setExpandedPerson((prev) => (prev === name ? null : name));
  };

  const toggleCompare = (name: string) => {
    setCompareSelection((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Eficiencia Prom." value={`${avgEff}%`} />
        <StatCard label="Prom. Prod/Servicio" value={formatHoursMinutes(avgProdPerServ)} />
        <StatCard label="Personal Total" value={filtered.length} />
        <StatCard label="Servicios Totales" value={totalServAll} />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar personal..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="h-8 w-60 text-xs"
        />
        <Button
          variant={compareMode ? "default" : "secondary"}
          size="sm"
          className="text-xs gap-1"
          onClick={() => { setCompareMode(!compareMode); setCompareSelection(new Set()); }}
        >
          {compareMode ? "Salir de comparar" : "Comparar personas"}
        </Button>
        {compareMode && compareSelection.size > 0 && (
          <span className="text-xs text-muted-foreground">{compareSelection.size} seleccionados</span>
        )}
      </div>

      {/* Comparison chart */}
      {compareMode && compareData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Comparativa — {compareData.map((c) => c.nombre).join(" vs ")}
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(200, compareData.length * 50)}>
            <BarChart data={compareData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,30%)" />
              <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
              <YAxis type="category" dataKey="nombre" width={150} tick={{ fontSize: 11 }} />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Bar dataKey="prod" name="Hs Productivas" fill="hsl(142, 70%, 45%)" stackId="a" />
              <Bar dataKey="improd" name="Hs Improductivas" fill="hsl(0, 72%, 50%)" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Personal", "Servicios", "Clientes", "Hs Prod.", "Hs Improd.", "Total", "Prom/Serv", "Eficiencia"].map((c) => (
                    <th key={c} className="px-3 py-2 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareData.map((p) => (
                  <tr key={p.nombre} className="border-b border-border/50">
                    <td className="px-3 py-2 font-semibold text-xs">{p.nombre}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.servicios}</td>
                    <td className="px-3 py-2 text-xs">{p.clientes.join(", ")}</td>
                    <td className="px-3 py-2 font-mono text-xs text-success font-semibold">{formatHoursMinutes(p.prod)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-destructive font-semibold">{formatHoursMinutes(p.improd)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatHoursMinutes(p.total)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatHoursMinutes(p.promProdPorServ)}</td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{p.eficiencia}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full ranking table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                {compareMode && <th className="px-2 py-3 w-8"></th>}
                {["#", "Personal", "Servicios", "Clientes", "Hs Prod.", "Hs Improd.", "Hs Total", "Prom/Serv", "Eficiencia", ""].map((c) => (
                  <th key={c} className="px-3 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <>
                  <tr
                    key={p.nombre}
                    className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${expandedPerson === p.nombre ? "bg-secondary/20" : ""}`}
                    onClick={() => toggleExpand(p.nombre)}
                  >
                    {compareMode && (
                      <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={compareSelection.has(p.nombre)}
                          onCheckedChange={() => toggleCompare(p.nombre)}
                          className="h-3.5 w-3.5"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-xs flex items-center gap-1.5">
                      <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      {p.nombre}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{p.servicios}</td>
                    <td className="px-3 py-2.5 text-xs max-w-[200px] truncate" title={p.clientes.join(", ")}>{p.clientes.join(", ")}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-success font-semibold">{formatHoursMinutes(p.prod)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-destructive font-semibold">{formatHoursMinutes(p.improd)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{formatHoursMinutes(p.total)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{formatHoursMinutes(p.promProdPorServ)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold">
                      <span className={p.eficiencia >= 70 ? "text-success" : p.eficiencia >= 40 ? "text-primary" : "text-destructive"}>
                        {p.eficiencia}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {expandedPerson === p.nombre ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expandedPerson === p.nombre && (
                    <tr key={`${p.nombre}-detail`}>
                      <td colSpan={compareMode ? 11 : 10} className="p-0">
                        <div className="bg-secondary/10 border-y border-border/50 p-4 space-y-5">
                          {/* Charts row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Pie: distribución de horas por cliente */}
                            <div className="glass-card p-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Distribución de Horas por Cliente</h4>
                              <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                  <Pie
                                    data={p.clienteDetalle.map((cd) => ({ name: cd.cliente, value: cd.prod + cd.improd }))}
                                    cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={{ strokeWidth: 1 }}
                                  >
                                    {p.clienteDetalle.map((_, idx) => (
                                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(v: number) => formatHoursMinutes(v)} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Bar: tendencia diaria prod vs improd */}
                            <div className="glass-card p-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Horas Diarias — Prod. vs Improd.</h4>
                              <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={p.diaDetalle}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,25%)" />
                                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                                  <YAxis tickFormatter={(v) => `${Math.floor(v / 60)}h`} tick={{ fontSize: 10 }} />
                                  <Tooltip formatter={tooltipFormatter} />
                                  <Legend wrapperStyle={{ fontSize: 10 }} />
                                  <Bar dataKey="prod" name="Productivas" fill="hsl(142, 70%, 45%)" stackId="a" />
                                  <Bar dataKey="improd" name="Improductivas" fill="hsl(0, 72%, 50%)" stackId="a" radius={[2, 2, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Eficiencia diaria line */}
                          <div className="glass-card p-4">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tendencia de Eficiencia Diaria</h4>
                            <ResponsiveContainer width="100%" height={180}>
                              <LineChart data={p.diaDetalle.map((dd) => ({
                                ...dd,
                                eficiencia: dd.prod + dd.improd > 0 ? Math.round((dd.prod / (dd.prod + dd.improd)) * 100) : 0,
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,25%)" />
                                <XAxis dataKey="labelConDia" tick={<DayTick />} height={35} />
                                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(v: number) => `${v}%`} />
                                <Line type="monotone" dataKey="eficiencia" name="Eficiencia" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Per client breakdown table */}
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Desglose por Cliente</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border/50">
                                    {["Cliente", "Servicios", "Hs Prod.", "Hs Improd.", "Eficiencia"].map((c) => (
                                      <th key={c} className="px-2 py-1.5 text-left text-muted-foreground uppercase tracking-wider font-semibold">{c}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.clienteDetalle.map((cd) => (
                                    <tr key={cd.cliente} className="border-b border-border/30">
                                      <td className="px-2 py-1.5 font-semibold">{cd.cliente}</td>
                                      <td className="px-2 py-1.5 font-mono">{cd.servicios}</td>
                                      <td className="px-2 py-1.5 font-mono text-success">{formatHoursMinutes(cd.prod)}</td>
                                      <td className="px-2 py-1.5 font-mono text-destructive">{formatHoursMinutes(cd.improd)}</td>
                                      <td className="px-2 py-1.5 font-mono font-semibold">
                                        {cd.prod + cd.improd > 0 ? `${Math.round((cd.prod / (cd.prod + cd.improd)) * 100)}%` : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Per day breakdown table */}
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detalle Día a Día</h4>
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-card">
                                  <tr className="border-b border-border/50">
                                    {["Fecha", "Día", "Servicios", "Clientes", "Hs Prod.", "Hs Improd.", "Eficiencia"].map((c) => (
                                      <th key={c} className="px-2 py-1.5 text-left text-muted-foreground uppercase tracking-wider font-semibold">{c}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.diaDetalle.map((dd) => (
                                    <tr key={dd.fecha} className="border-b border-border/30">
                                      <td className="px-2 py-1.5 font-mono">{dd.label}</td>
                                      <td className="px-2 py-1.5 text-muted-foreground italic capitalize">{dd.dia}</td>
                                      <td className="px-2 py-1.5 font-mono">{dd.servicios}</td>
                                      <td className="px-2 py-1.5">{dd.clientes.join(", ")}</td>
                                      <td className="px-2 py-1.5 font-mono text-success">{formatHoursMinutes(dd.prod)}</td>
                                      <td className="px-2 py-1.5 font-mono text-destructive">{formatHoursMinutes(dd.improd)}</td>
                                      <td className="px-2 py-1.5 font-mono font-semibold">
                                        {dd.prod + dd.improd > 0 ? `${Math.round((dd.prod / (dd.prod + dd.improd)) * 100)}%` : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
