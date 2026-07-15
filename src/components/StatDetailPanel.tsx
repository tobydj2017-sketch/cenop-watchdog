import { useMemo } from "react";
import { ServiceEntry, FuelEntry, getAdjustedHours, getServiceKey, normalizeClientName, getCenopEnOperacionesMinutes } from "@/lib/types";
import { formatHoursMinutes } from "@/lib/formatTime";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--destructive))",
  "hsl(var(--chart-4))", "hsl(210,90%,55%)", "hsl(280,80%,60%)",
  "hsl(180,70%,40%)", "hsl(330,80%,55%)", "hsl(60,70%,45%)", "hsl(30,80%,50%)",
];

interface Props {
  statKey: string;
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
  selectedDate: string;
}

export default function StatDetailPanel({ statKey, services, fuelEntries, selectedDate }: Props) {
  const dayServices = selectedDate ? services.filter((s) => s.fecha === selectedDate) : services;
  const dayFuel = selectedDate ? fuelEntries.filter((f) => f.fecha === selectedDate) : fuelEntries;

  const content = useMemo(() => {
    switch (statKey) {
      case "servicios":
        return <ServiciosDetail services={dayServices} />;
      case "productivas":
        return <HorasDetail services={dayServices} type="prod" />;
      case "improductivas":
        return <HorasDetail services={dayServices} type="improd" />;
      case "cenop_ops":
        return <CenopOpsDetail services={dayServices} />;
      case "moviles":
        return <MovilesDetail services={dayServices} fuelEntries={dayFuel} />;
      case "combustible":
        return <CombustibleDetail fuelEntries={dayFuel} />;
      case "eficiencia":
        return <EficienciaDetail services={dayServices} />;
      case "km":
        return <KmDetail services={dayServices} />;
      default:
        return null;
    }
  }, [statKey, dayServices, dayFuel]);

  return (
    <div className="glass-card p-5 animate-in slide-in-from-top-2 duration-300">
      {content}
    </div>
  );
}

function ServiciosDetail({ services }: { services: ServiceEntry[] }) {
  const byClient = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Set<string>();
    services.forEach((s) => {
      const key = getServiceKey(s);
      if (seen.has(key)) return;
      seen.add(key);
      const client = normalizeClientName(s.cliente);
      map.set(client, (map.get(client) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [services]);

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Servicios por Cliente</h3>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byClient} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="Servicios" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {byClient.map((c, i) => (
            <div key={c.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-medium">{c.name}</span>
              </div>
              <span className="font-bold text-primary">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HorasDetail({ services, type }: { services: ServiceEntry[]; type: "prod" | "improd" }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      const worker = s.chofer || s.custodio || "—";
      const h = getAdjustedHours(s);
      const min = type === "prod" ? h.prod : h.improd;
      map.set(worker, (map.get(worker) || 0) + min);
    });
    return Array.from(map.entries())
      .map(([name, minutes]) => ({ name, minutes, label: formatHoursMinutes(minutes) }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 15);
  }, [services, type]);

  const title = type === "prod" ? "Horas Productivas por Personal" : "Horas Improductivas por Personal";
  const color = type === "prod" ? "hsl(var(--success))" : "hsl(var(--destructive))";

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatHoursMinutes(v)} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [formatHoursMinutes(v), type === "prod" ? "Productivas" : "Improductivas"]}
            />
            <Bar dataKey="minutes" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CenopOpsDetail({ services }: { services: ServiceEntry[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { prod: number; clients: Set<string> }>();

    services.forEach((s) => {
      const h = getAdjustedHours(s);
      const client = normalizeClientName(s.cliente);

      // Count chofer if flagged as operations
      if (s.chofer && s.choferEsOperaciones) {
        const existing = map.get(s.chofer) || { prod: 0, clients: new Set<string>() };
        existing.prod += h.prod;
        existing.clients.add(client);
        map.set(s.chofer, existing);
      }

      // Count custodio if flagged as operations (avoid double-count)
      if (s.custodio && s.custodioEsOperaciones && s.custodio !== s.chofer) {
        const existing = map.get(s.custodio) || { prod: 0, clients: new Set<string>() };
        existing.prod += h.prod;
        existing.clients.add(client);
        map.set(s.custodio, existing);
      }
    });

    return Array.from(map.entries())
      .map(([name, d]) => ({ name, minutes: d.prod, label: formatHoursMinutes(d.prod), clientes: Array.from(d.clients).join(", ") }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [services]);

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Personal CENOP en Operaciones</h3>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatHoursMinutes(v)} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatHoursMinutes(v), "Hs Productivas"]}
              />
              <Bar dataKey="minutes" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {data.map((d) => (
            <div key={d.name} className="px-3 py-2 rounded-lg bg-secondary/30 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.name}</span>
                <span className="font-bold" style={{ color: "hsl(var(--chart-4))" }}>{d.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{d.clientes}</span>
            </div>
          ))}
          {data.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin datos para esta fecha</p>}
        </div>
      </div>
    </div>
  );
}

function MovilesDetail({ services }: { services: ServiceEntry[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { servicios: number; prod: number; improd: number }>();
    services.forEach((s) => {
      if (!s.movil) return;
      const key = getServiceKey(s);
      const existing = map.get(s.movil) || { servicios: 0, prod: 0, improd: 0 };
      const h = getAdjustedHours(s);
      existing.prod += h.prod;
      existing.improd += h.improd;
      map.set(s.movil, existing);
    });
    // Count unique services per movil
    const svcMap = new Map<string, Set<string>>();
    services.forEach((s) => {
      if (!s.movil) return;
      const key = getServiceKey(s);
      if (!svcMap.has(s.movil)) svcMap.set(s.movil, new Set());
      svcMap.get(s.movil)!.add(key);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        servicios: svcMap.get(name)?.size || 0,
        prod: d.prod,
        improd: d.improd,
        prodLabel: formatHoursMinutes(d.prod),
        improdLabel: formatHoursMinutes(d.improd),
      }))
      .sort((a, b) => b.prod - a.prod);
  }, [services]);

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Detalle de Móviles</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatHoursMinutes(v)} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, name: string) => [formatHoursMinutes(v), name === "prod" ? "Productivas" : "Improductivas"]}
            />
            <Legend formatter={(v) => v === "prod" ? "Productivas" : "Improductivas"} />
            <Bar dataKey="prod" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
            <Bar dataKey="improd" stackId="a" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CombustibleDetail({ fuelEntries }: { fuelEntries: FuelEntry[] }) {
  const byMovil = useMemo(() => {
    const map = new Map<string, { monto: number; litros: number }>();
    fuelEntries.forEach((f) => {
      const existing = map.get(f.movil) || { monto: 0, litros: 0 };
      existing.monto += f.monto;
      existing.litros += f.litros;
      map.set(f.movil, existing);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, monto: d.monto, litros: d.litros }))
      .sort((a, b) => b.monto - a.monto);
  }, [fuelEntries]);

  const total = byMovil.reduce((acc, d) => acc + d.monto, 0);
  const totalLitros = byMovil.reduce((acc, d) => acc + d.litros, 0);

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Combustible por Móvil</h3>
      {byMovil.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sin cargas de combustible para esta fecha</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byMovil} dataKey="monto" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                  {byMovil.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString("es-AR")}`, "Monto"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 text-sm font-bold">
              <span>Total</span>
              <div className="text-right">
                <span className="text-primary">${total.toLocaleString("es-AR")}</span>
                <span className="text-xs text-muted-foreground ml-2">({totalLitros.toFixed(1)} lts)</span>
              </div>
            </div>
            {byMovil.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="font-medium">{d.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">${d.monto.toLocaleString("es-AR")}</span>
                  <span className="text-xs text-muted-foreground ml-2">({d.litros.toFixed(1)} lts)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EficienciaDetail({ services }: { services: ServiceEntry[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { prod: number; improd: number }>();
    services.forEach((s) => {
      const worker = s.chofer || s.custodio || "—";
      const h = getAdjustedHours(s);
      const existing = map.get(worker) || { prod: 0, improd: 0 };
      existing.prod += h.prod;
      existing.improd += h.improd;
      map.set(worker, existing);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        eficiencia: d.prod + d.improd > 0 ? Math.round((d.prod / (d.prod + d.improd)) * 100) : 0,
        prod: d.prod,
        improd: d.improd,
      }))
      .sort((a, b) => b.eficiencia - a.eficiencia)
      .slice(0, 15);
  }, [services]);

  const totalProd = services.reduce((acc, s) => acc + getAdjustedHours(s).prod, 0);
  const totalImprod = services.reduce((acc, s) => acc + getAdjustedHours(s).improd, 0);
  const pieData = [
    { name: "Productivas", value: totalProd },
    { name: "Improductivas", value: totalImprod },
  ];

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Eficiencia por Personal</h3>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                <Cell fill="hsl(var(--success))" />
                <Cell fill="hsl(var(--destructive))" />
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatHoursMinutes(v), ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-sm">
              <span className="font-medium">{d.name}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${d.eficiencia}%`,
                      background: d.eficiencia >= 80 ? "hsl(var(--success))" : d.eficiencia >= 50 ? "hsl(var(--primary))" : "hsl(var(--destructive))",
                    }}
                  />
                </div>
                <span className="font-bold w-10 text-right">{d.eficiencia}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KmDetail({ services }: { services: ServiceEntry[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { km: number; servicios: Set<string> }>();
    services.forEach((s) => {
      if (!s.movil) return;
      const km = parseFloat((s.kmRecorridos || "0").replace(/,/g, ".")) || 0;
      if (km <= 0) return;
      const current = map.get(s.movil) || { km: 0, servicios: new Set<string>() };
      current.km += km;
      current.servicios.add(getServiceKey(s));
      map.set(s.movil, current);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, km: Math.round(d.km), servicios: d.servicios.size }))
      .sort((a, b) => b.km - a.km);
  }, [services]);

  const total = data.reduce((acc, d) => acc + d.km, 0);

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Kilometraje Recorrido por Móvil</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sin datos de kilometraje para esta fecha</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v} km`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString("es-AR")} km`, "Km Recorridos"]}
                />
                <Bar dataKey="km" name="Km Recorridos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 text-sm font-bold">
              <span>Total</span>
              <span className="text-primary">{total.toLocaleString("es-AR")} km</span>
            </div>
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-sm">
                <span className="font-medium">{d.name}</span>
                <div className="text-right">
                  <span className="font-bold">{d.km.toLocaleString("es-AR")} km</span>
                  <span className="text-xs text-muted-foreground ml-2">({d.servicios} serv.)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
