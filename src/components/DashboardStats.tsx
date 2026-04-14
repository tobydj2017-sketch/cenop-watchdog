import { useState } from "react";
import { Shield, Clock, TrendingUp, TrendingDown, Truck, Fuel, Briefcase } from "lucide-react";
import { ServiceEntry, FuelEntry, getAdjustedHours, getServiceKey, getCenopEnOperacionesMinutes } from "@/lib/types";
import { formatHoursMinutes } from "@/lib/formatTime";
import StatDetailPanel from "./StatDetailPanel";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
  selectedDate: string;
}

const STAT_KEYS = ["servicios", "productivas", "improductivas", "cenop_ops", "moviles", "combustible", "eficiencia"] as const;
type StatKey = typeof STAT_KEYS[number];

export default function DashboardStats({ services, fuelEntries, selectedDate }: Props) {
  const [activeKey, setActiveKey] = useState<StatKey | null>(null);

  const dayServices = services.filter((s) => s.fecha === selectedDate);
  const dayFuel = fuelEntries.filter((f) => f.fecha === selectedDate);
  const totalServicios = new Set(dayServices.map(getServiceKey)).size;

  const totalProd = dayServices.reduce((acc, s) => acc + getAdjustedHours(s).prod, 0);
  const totalImprod = dayServices.reduce((acc, s) => acc + getAdjustedHours(s).improd, 0);
  const totalFuel = dayFuel.reduce((acc, f) => acc + f.monto, 0);
  const uniqueMoviles = new Set(dayServices.map((s) => s.movil).filter(Boolean)).size;
  const cenopEnOps = getCenopEnOperacionesMinutes(dayServices);

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
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {stats.map((stat) => (
          <button
            key={stat.key}
            onClick={() => setActiveKey((prev) => prev === stat.key ? null : stat.key)}
            className={`glass-card p-4 flex flex-col gap-2 text-left transition-all cursor-pointer hover:ring-2 hover:ring-primary/30 ${
              activeKey === stat.key ? "ring-2 ring-primary shadow-lg shadow-primary/10" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <span className="stat-value text-xl">{stat.value}</span>
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
