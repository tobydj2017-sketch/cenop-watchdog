import { Shield, Clock, TrendingUp, TrendingDown, Truck, Fuel } from "lucide-react";
import { ServiceEntry, FuelEntry, getAdjustedHours, getServiceKey } from "@/lib/types";
import { formatHoursMinutes } from "@/lib/formatTime";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
  selectedDate: string;
}

export default function DashboardStats({ services, fuelEntries, selectedDate }: Props) {
  const dayServices = services.filter((s) => s.fecha === selectedDate);
  const dayFuel = fuelEntries.filter((f) => f.fecha === selectedDate);
  const totalServicios = new Set(dayServices.map(getServiceKey)).size;

  const totalProd = dayServices.reduce((acc, s) => acc + getAdjustedHours(s).prod, 0);
  const totalImprod = dayServices.reduce((acc, s) => acc + getAdjustedHours(s).improd, 0);
  const totalFuel = dayFuel.reduce((acc, f) => acc + f.monto, 0);
  const uniqueMoviles = new Set(dayServices.map((s) => s.movil).filter(Boolean)).size;

  const stats = [
    { label: "Servicios", value: totalServicios, icon: Shield, color: "text-primary" },
    { label: "Hs Productivas", value: formatHoursMinutes(totalProd), icon: TrendingUp, color: "text-success" },
    { label: "Hs Improductivas", value: formatHoursMinutes(totalImprod), icon: TrendingDown, color: "text-destructive" },
    { label: "Móviles", value: uniqueMoviles, icon: Truck, color: "text-primary" },
    { label: "Combustible", value: `$${totalFuel.toLocaleString("es-AR")}`, icon: Fuel, color: "text-warning" },
    { label: "Eficiencia", value: totalProd + totalImprod > 0 ? `${Math.round((totalProd / (totalProd + totalImprod)) * 100)}%` : "—", icon: Clock, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </div>
          <span className="stat-value text-xl">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
