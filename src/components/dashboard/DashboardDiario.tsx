import { useMemo } from "react";
import { ServiceEntry, FuelEntry, getAdjustedHours } from "@/lib/types";
import { formatHoursMinutes, getDayAbbr } from "@/lib/formatTime";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, AreaChart, Area, LabelList,
} from "recharts";
import { StatCard } from "./DashboardResumen";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
}

const tooltipFormatter = (value: number) => formatHoursMinutes(value);

const DayTick = ({ x, y, payload }: any) => {
  const parts = (payload.value || "").split("\n");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={10} fill="hsl(0,0%,70%)">{parts[0]}</text>
      <text x={0} y={0} dy={24} textAnchor="middle" fontSize={8} fill="hsl(0,0%,50%)" fontStyle="italic">{parts[1] || ""}</text>
    </g>
  );
};

export default function DashboardDiario({ services, fuelEntries }: Props) {
  const byDay = useMemo(() => {
    const map: Record<string, { prod: number; improd: number; solCliente: Set<number>; solBase: Set<number>; fuel: number; detalleProd: Record<string, number>; detalleImprod: Record<string, number> }> = {};
    services.forEach((s) => {
      if (!s.fecha) return;
      if (!map[s.fecha]) map[s.fecha] = { prod: 0, improd: 0, solCliente: new Set(), solBase: new Set(), fuel: 0, detalleProd: {}, detalleImprod: {} };
      const h = getAdjustedHours(s);
      const esCenop = !s.cliente || s.cliente.toUpperCase().includes("CENOP");
      const nombre = esCenop ? "CENOP (Base)" : s.cliente;
      map[s.fecha].prod += h.prod;
      map[s.fecha].improd += h.improd;
      if (h.prod > 0) map[s.fecha].detalleProd[nombre] = (map[s.fecha].detalleProd[nombre] || 0) + h.prod;
      if (h.improd > 0) map[s.fecha].detalleImprod[nombre] = (map[s.fecha].detalleImprod[nombre] || 0) + h.improd;
      if (esCenop) {
        map[s.fecha].solBase.add(s.solicitud);
      } else {
        map[s.fecha].solCliente.add(s.solicitud);
      }
    });
    fuelEntries.forEach((f) => {
      if (!f.fecha) return;
      if (!map[f.fecha]) map[f.fecha] = { prod: 0, improd: 0, solCliente: new Set(), solBase: new Set(), fuel: 0, detalleProd: {}, detalleImprod: {} };
      map[f.fecha].fuel += f.monto;
    });
    return Object.entries(map)
      .map(([fecha, v]) => {
        const dia = getDayAbbr(fecha);
        return {
          fecha,
          label: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`,
          dia,
          labelConDia: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}\n${dia}`,
          prod: v.prod,
          improd: v.improd,
          total: v.prod + v.improd,
          serviciosCliente: v.solCliente.size,
          serviciosBase: v.solBase.size,
          serviciosTotal: new Set([...v.solCliente, ...v.solBase]).size,
          eficiencia: v.prod + v.improd > 0 ? Math.round((v.prod / (v.prod + v.improd)) * 100) : 0,
          fuel: v.fuel,
          detalleProd: Object.entries(v.detalleProd).sort((a, b) => b[1] - a[1]),
          detalleImprod: Object.entries(v.detalleImprod).sort((a, b) => b[1] - a[1]),
        };
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [services, fuelEntries]);

  const bestDay = byDay.reduce((best, d) => d.eficiencia > (best?.eficiencia || 0) ? d : best, byDay[0]);
  const worstDay = byDay.reduce((worst, d) => d.eficiencia < (worst?.eficiencia || 100) ? d : worst, byDay[0]);
  const maxServDay = byDay.reduce((max, d) => d.serviciosCliente > (max?.serviciosCliente || 0) ? d : max, byDay[0]);

  return (
    <div className="space-y-5">
      {/* Daily KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Días con Datos" value={byDay.length} />
        <StatCard label="Mejor Eficiencia" value={bestDay ? `${bestDay.eficiencia}% (${bestDay.label})` : "—"} className="text-success" />
        <StatCard label="Peor Eficiencia" value={worstDay ? `${worstDay.eficiencia}% (${worstDay.label})` : "—"} className="text-destructive" />
        <StatCard label="Día con Más Servicios" value={maxServDay ? `${maxServDay.serviciosCliente} (${maxServDay.label})` : "—"} />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Servicios por Día (Clientes vs Base)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={byDay} margin={{ top: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,30%)" />
            <XAxis dataKey="labelConDia" tick={<DayTick />} height={40} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} label={{ value: "Cant. Servicios", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(0,0%,60%)" } }} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-md border border-border bg-card p-2 shadow-lg text-xs">
                  <p className="font-semibold mb-1">{label}</p>
                  <p>Servicios a clientes: <span className="font-bold text-success">{payload[0]?.value}</span></p>
                  <p>Servicios en base (CENOP): <span className="font-bold text-destructive">{payload[1]?.value}</span></p>
                  <p>Total: <span className="font-bold">{Number(payload[0]?.value || 0) + Number(payload[1]?.value || 0)}</span></p>
                </div>
              );
            }} />
            <Legend />
            <Bar dataKey="serviciosCliente" name="Clientes" fill="hsl(142, 70%, 45%)" stackId="a" radius={[0, 0, 0, 0]}>
              <LabelList dataKey="serviciosCliente" position="center" style={{ fontSize: 10, fill: "white", fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ""} />
            </Bar>
            <Bar dataKey="serviciosBase" name="Base (CENOP)" fill="hsl(0, 72%, 50%)" stackId="a" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="serviciosBase" position="center" style={{ fontSize: 10, fill: "white", fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ""} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Horas productivas vs improductivas por día */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Horas Productivas vs Improductivas por Día</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={byDay} margin={{ top: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,30%)" />
            <XAxis dataKey="labelConDia" tick={<DayTick />} height={40} />
            <YAxis tickFormatter={(v) => `${Math.floor(v / 60)}h`} tick={{ fontSize: 11 }} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d) return null;
              return (
                <div className="rounded-md border border-border bg-card p-2.5 shadow-lg text-xs max-w-[280px]">
                  <p className="font-semibold mb-1.5">{d.label} ({d.dia})</p>
                  <p className="text-success font-semibold">Hs Productivas: {formatHoursMinutes(d.prod)}</p>
                  {d.detalleProd.length > 0 && (
                    <div className="ml-2 mt-0.5 mb-1.5 space-y-0.5">
                      {d.detalleProd.map(([cliente, min]: [string, number]) => (
                        <p key={cliente} className="text-muted-foreground">• {cliente}: {formatHoursMinutes(min)}</p>
                      ))}
                    </div>
                  )}
                  <p className="text-destructive font-semibold">Hs Improductivas: {formatHoursMinutes(d.improd)}</p>
                  {d.detalleImprod.length > 0 && (
                    <div className="ml-2 mt-0.5 mb-1.5 space-y-0.5">
                      {d.detalleImprod.map(([cliente, min]: [string, number]) => (
                        <p key={cliente} className="text-muted-foreground">• {cliente}: {formatHoursMinutes(min)}</p>
                      ))}
                    </div>
                  )}
                  <p className="font-semibold mt-1 pt-1 border-t border-border">Total: {formatHoursMinutes(d.total)} — Eficiencia: {d.eficiencia}%</p>
                </div>
              );
            }} />
            <Legend />
            <Bar dataKey="prod" name="Hs Productivas" fill="hsl(142, 70%, 45%)" stackId="a" radius={[0, 0, 0, 0]}>
              <LabelList dataKey="prod" position="center" style={{ fontSize: 9, fill: "white", fontWeight: 600 }} formatter={(v: number) => v > 0 ? formatHoursMinutes(v) : ""} />
            </Bar>
            <Bar dataKey="improd" name="Hs Improductivas" fill="hsl(0, 72%, 50%)" stackId="a" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="improd" position="center" style={{ fontSize: 9, fill: "white", fontWeight: 600 }} formatter={(v: number) => v > 0 ? formatHoursMinutes(v) : ""} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Eficiencia diaria - Line chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Tendencia de Eficiencia Diaria (%)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={byDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,30%)" />
            <XAxis dataKey="labelConDia" tick={<DayTick />} height={40} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Line type="monotone" dataKey="eficiencia" name="Eficiencia" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Combustible diario */}
      {byDay.some(d => d.fuel > 0) && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Gasto de Combustible por Día</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,30%)" />
            <XAxis dataKey="labelConDia" tick={<DayTick />} height={40} />
              <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString("es-AR")}`} />
              <Area type="monotone" dataKey="fuel" name="Combustible" fill="hsl(280, 60%, 55%)" fillOpacity={0.3} stroke="hsl(280, 60%, 55%)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla diaria */}
      <DailyTable data={byDay} />
    </div>
  );
}

function DailyTable({ data }: { data: { fecha: string; label: string; dia: string; prod: number; improd: number; total: number; serviciosCliente: number; serviciosBase: number; serviciosTotal: number; eficiencia: number; fuel: number }[] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              {["Fecha", "Día", "Serv. Clientes", "Serv. Base", "Total", "Hs Prod.", "Hs Improd.", "Hs Total", "Eficiencia", "Combustible"].map((c) => (
                <th key={c} className="px-3 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.fecha} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="px-3 py-2.5 font-semibold font-mono text-xs">{d.fecha}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground italic capitalize">{d.dia}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-success font-semibold">{d.serviciosCliente}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-destructive font-semibold">{d.serviciosBase}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{d.serviciosTotal}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-success font-semibold">{formatHoursMinutes(d.prod)}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-destructive font-semibold">{formatHoursMinutes(d.improd)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{formatHoursMinutes(d.total)}</td>
                <td className="px-3 py-2.5 font-mono text-xs font-semibold">{d.eficiencia}%</td>
                <td className="px-3 py-2.5 font-mono text-xs">${d.fuel.toLocaleString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
