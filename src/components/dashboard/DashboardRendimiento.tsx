import { useMemo } from "react";
import { ServiceEntry, timeToMinutes } from "@/lib/types";
import { formatHoursMinutes } from "@/lib/formatTime";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend,
} from "recharts";
import { StatCard } from "./DashboardResumen";

interface Props {
  services: ServiceEntry[];
}

const tooltipFormatter = (value: number) => formatHoursMinutes(value);

export default function DashboardRendimiento({ services }: Props) {
  // Top/bottom performers
  const byPerson = useMemo(() => {
    const map: Record<string, { prod: number; improd: number; solicitudes: Set<number> }> = {};
    services.forEach((s) => {
      [s.chofer, s.custodio].forEach((name) => {
        if (!name) return;
        if (!map[name]) map[name] = { prod: 0, improd: 0, solicitudes: new Set() };
        map[name].prod += timeToMinutes(s.horasProductivas);
        map[name].improd += timeToMinutes(s.horasImproductivas);
        map[name].solicitudes.add(s.solicitud);
      });
    });
    return Object.entries(map)
      .map(([nombre, v]) => ({
        nombre,
        prod: v.prod,
        improd: v.improd,
        servicios: v.solicitudes.size,
        total: v.prod + v.improd,
        eficiencia: v.prod + v.improd > 0 ? Math.round((v.prod / (v.prod + v.improd)) * 100) : 0,
        promProdPorServ: v.solicitudes.size > 0 ? Math.round(v.prod / v.solicitudes.size) : 0,
      }))
      .filter((p) => p.servicios >= 2)
      .sort((a, b) => b.eficiencia - a.eficiencia);
  }, [services]);

  // By vehicle efficiency
  const byMovil = useMemo(() => {
    const map: Record<string, { prod: number; improd: number; solicitudes: Set<number> }> = {};
    services.forEach((s) => {
      if (!s.movil) return;
      if (!map[s.movil]) map[s.movil] = { prod: 0, improd: 0, solicitudes: new Set() };
      map[s.movil].prod += timeToMinutes(s.horasProductivas);
      map[s.movil].improd += timeToMinutes(s.horasImproductivas);
      map[s.movil].solicitudes.add(s.solicitud);
    });
    return Object.entries(map)
      .map(([patente, v]) => ({
        patente,
        prod: v.prod,
        improd: v.improd,
        servicios: v.solicitudes.size,
        total: v.prod + v.improd,
        eficiencia: v.prod + v.improd > 0 ? Math.round((v.prod / (v.prod + v.improd)) * 100) : 0,
      }))
      .sort((a, b) => b.eficiencia - a.eficiencia);
  }, [services]);

  const top5 = byPerson.slice(0, 5);
  const bottom5 = byPerson.slice(-5).reverse();
  const avgEff = byPerson.length > 0 ? Math.round(byPerson.reduce((a, p) => a + p.eficiencia, 0) / byPerson.length) : 0;
  const avgProdPerServ = byPerson.length > 0 ? Math.round(byPerson.reduce((a, p) => a + p.promProdPorServ, 0) / byPerson.length) : 0;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Eficiencia Prom. Personal" value={`${avgEff}%`} />
        <StatCard label="Prom. Prod/Servicio" value={formatHoursMinutes(avgProdPerServ)} />
        <StatCard label="Personal Evaluado" value={byPerson.length} />
        <StatCard label="Móviles Evaluados" value={byMovil.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top 5 */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">🏆 Top 5 — Mayor Eficiencia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top5} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="eficiencia" name="Eficiencia" fill="hsl(142, 70%, 45%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom 5 */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">⚠️ Bottom 5 — Menor Eficiencia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bottom5} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="eficiencia" name="Eficiencia" fill="hsl(0, 72%, 50%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Eficiencia por Móvil */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Eficiencia por Móvil / Patente</h3>
        <ResponsiveContainer width="100%" height={Math.max(250, byMovil.length * 30)}>
          <BarChart data={byMovil} layout="vertical">
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="patente" width={100} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar dataKey="eficiencia" name="Eficiencia" fill="hsl(200, 70%, 50%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Prom productivas por servicio por persona */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Promedio Hs Productivas por Servicio (por persona)</h3>
        <ResponsiveContainer width="100%" height={Math.max(300, byPerson.length * 25)}>
          <BarChart data={byPerson} layout="vertical">
            <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h${v % 60 > 0 ? (v % 60).toString().padStart(2, "0") : ""}`} />
            <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 10 }} />
            <Tooltip formatter={tooltipFormatter} />
            <Bar dataKey="promProdPorServ" name="Prom. Prod/Serv" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full ranking table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                {["#", "Personal", "Servicios", "Hs Prod.", "Hs Improd.", "Prom/Serv", "Eficiencia"].map((c) => (
                  <th key={c} className="px-3 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byPerson.map((p, i) => (
                <tr key={p.nombre} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-xs">{p.nombre}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{p.servicios}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-success font-semibold">{formatHoursMinutes(p.prod)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-destructive font-semibold">{formatHoursMinutes(p.improd)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{formatHoursMinutes(p.promProdPorServ)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold">{p.eficiencia}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
