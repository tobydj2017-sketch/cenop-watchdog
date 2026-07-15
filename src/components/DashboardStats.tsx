import { useState } from "react";
import { Shield, Clock, TrendingUp, TrendingDown, Truck, Fuel, Briefcase, Route } from "lucide-react";
import { ServiceEntry, FuelEntry, getAdjustedHours, getServiceKey, getCenopEnOperacionesMinutes } from "@/lib/types";
import { formatHoursMinutes } from "@/lib/formatTime";
import StatDetailPanel from "./StatDetailPanel";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
  selectedDate: string;
}

const STAT_KEYS = ["servicios", "productivas", "improductivas", "cenop_ops", "moviles", "combustible", "eficiencia", "km"] as const;
type StatKey = typeof STAT_KEYS[number];

export default function DashboardStats({ services, fuelEntries, selectedDate }: Props) {
  const [activeKey, setActiveKey] = useState<StatKey | null>(null);

  const dayServices = selectedDate ? services.filter((s) => s.fecha === selectedDate) : services;
  const dayFuel = selectedDate ? fuelEntries.filter((f) => f.fecha === selectedDate) : fuelEntries;
  const totalServicios = new Set(dayServices.map(getServiceKey)).size;

  const totalProd = dayServices.reduce((acc, s) => acc + getAdjustedHours(s).prod, 0);
  const totalImprod = dayServices.reduce((acc, s) => acc + getAdjustedHours(s).improd, 0);
  const totalFuel = dayFuel.reduce((acc, f) => acc + f.monto, 0);
  const uniqueMoviles = new Set(dayServices.map((s) => s.movil).filter(Boolean)).size;
  const cenopEnOps = getCenopEnOperacionesMinutes(dayServices);
  const totalKm = dayServices.reduce((acc, s) => acc + (parseFloat((s.kmRecorridos || "0").replace(/,/g, ".")) || 0), 0);

  const stats: { key: StatKey; label: string; value: string | number; icon: typeof Shield; color: string }[] = [
    { key: "servicios", label: "Servicios", value: totalServicios, icon: Shield, color: "text-primary" },
    { key: "productivas", label: "Hs Productivas", value: formatHoursMinutes(totalProd), icon: TrendingUp, color: "text-success" },
    { key: "improductivas", label: "Hs Improductivas", value: formatHoursMinutes(totalImprod), icon: TrendingDown, color: "text-destructive" },
    { key: "cenop_ops", label: "CENOP en Ops", value: formatHoursMinutes(cenopEnOps), icon: Briefcase, color: "text-chart-4" },
    { key: "moviles", label: "Móviles", value: uniqueMoviles, icon: Truck, color: "text-primary" },
    { key: "combustible", label: "Combustible", value: `$${totalFuel.toLocaleString("es-AR")}`, icon: Fuel, color: "text-warning" },
    { key: "eficiencia", label: "Eficiencia", value: totalProd + totalImprod > 0 ? `${Math.round((totalProd / (totalProd + totalImprod)) * 100)}%` : "—", icon: Clock, color: "text-primary" },
  ];

  return (
    <div className="space-y-3 min-w-0">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {stats.map((stat) => (
          <button
            key={stat.key}
            onClick={() => setActiveKey((prev) => prev === stat.key ? null : stat.key)}
            className={`rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-1 text-left transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm min-w-0 ${
              activeKey === stat.key ? "ring-2 ring-primary shadow-sm" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <stat.icon className={`w-4 h-4 shrink-0 text-emerald-600`} />
              <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider truncate">{stat.label}</span>
            </div>
            <span className="font-semibold text-sm sm:text-base lg:text-lg text-slate-900 truncate">{stat.value}</span>
          </button>
        ))}
      </div>

      {activeKey && (
        <StatDetailPanel
          statKey={activeKey}
          services={services}
          fuelEntries={fuelEntries}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

