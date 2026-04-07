import { useState, useCallback } from "react";
import { Shield, CalendarDays, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DashboardStats from "@/components/DashboardStats";
import ServiceForm from "@/components/ServiceForm";
import ServiceTable from "@/components/ServiceTable";
import FuelForm from "@/components/FuelForm";
import FuelTable from "@/components/FuelTable";
import FullDashboard from "@/components/FullDashboard";
import { ServiceEntry, FuelEntry } from "@/lib/types";
import {
  getServices, saveServices, addService, deleteService,
  getFuelEntries, addFuelEntry, deleteFuelEntry,
} from "@/lib/store";

const today = "2025-12-01";

export default function Index() {
  const [services, setServices] = useState<ServiceEntry[]>(getServices);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(getFuelEntries);
  const [selectedDate, setSelectedDate] = useState(today);
  const [showDashboard, setShowDashboard] = useState(false);

  const handleAddService = useCallback((entry: ServiceEntry) => {
    addService(entry);
    setServices(getServices());
  }, []);

  const handleDeleteService = useCallback((id: string) => {
    deleteService(id);
    setServices(getServices());
  }, []);

  const handleAddFuel = useCallback((entry: FuelEntry) => {
    addFuelEntry(entry);
    setFuelEntries(getFuelEntries());
  }, []);

  const handleDeleteFuel = useCallback((id: string) => {
    deleteFuelEntry(id);
    setFuelEntries(getFuelEntries());
  }, []);

  const dayServices = services.filter((s) => s.fecha === selectedDate);
  const dayFuel = fuelEntries.filter((f) => f.fecha === selectedDate);

  return (
    <div className="min-h-screen bg-background">
      {/* Encabezado */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center glow-amber">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">CENOP</h1>
              <p className="text-xs text-muted-foreground">AM Seguridad — Control Operativo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={showDashboard ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowDashboard(!showDashboard)}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              {showDashboard ? "Volver a Carga" : "Panel de Análisis"}
            </Button>
            {!showDashboard && (
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 w-40 text-sm font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Principal */}
      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-5">
        {showDashboard ? (
          <FullDashboard
            services={services}
            fuelEntries={fuelEntries}
            onBack={() => setShowDashboard(false)}
          />
        ) : (
          <>
            <DashboardStats services={services} fuelEntries={fuelEntries} selectedDate={selectedDate} />

            <div className="grid lg:grid-cols-2 gap-4">
              <ServiceForm onAdd={handleAddService} selectedDate={selectedDate} />
              <FuelForm onAdd={handleAddFuel} selectedDate={selectedDate} />
            </div>

            <ServiceTable services={dayServices} onDelete={handleDeleteService} />
            <FuelTable entries={dayFuel} onDelete={handleDeleteFuel} />
          </>
        )}
      </main>
    </div>
  );
}
