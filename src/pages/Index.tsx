import { useState, useCallback, useMemo } from "react";
import { Shield, CalendarDays, BarChart3, ClipboardList, Users, Building2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DashboardStats from "@/components/DashboardStats";
import ServiceForm from "@/components/ServiceForm";
import ServiceTable from "@/components/ServiceTable";
import FuelForm from "@/components/FuelForm";
import FuelTable from "@/components/FuelTable";
import FullDashboard from "@/components/FullDashboard";
import PersonalManager from "@/components/PersonalManager";
import ClientManager from "@/components/ClientManager";
import { ServiceEntry, FuelEntry, isCountableServiceEntry } from "@/lib/types";
import {
  getServices, saveServices, addService, deleteService,
  getFuelEntries, addFuelEntry, deleteFuelEntry,
} from "@/lib/store";
import { exportCargaDiaPDF, exportPersonalManagerPDF, exportClientManagerPDF } from "@/lib/pdfExport";

const today = "2025-12-01";

export default function Index() {
  const [services, setServices] = useState<ServiceEntry[]>(getServices);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(getFuelEntries);
  const [selectedDate, setSelectedDate] = useState("");
  const [activeTab, setActiveTab] = useState<"carga" | "dashboard" | "personal" | "clientes">("carga");

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

  const cleanServices = useMemo(
    () => services.filter(isCountableServiceEntry),
    [services],
  );
  const dayServices = selectedDate ? cleanServices.filter((s) => s.fecha === selectedDate) : cleanServices;
  const dayFuel = selectedDate ? fuelEntries.filter((f) => f.fecha === selectedDate) : fuelEntries;

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
          <div className="flex items-center gap-2">
            {activeTab === "carga" && (
              <>
                <div className="flex items-center gap-2 mr-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-9 w-40 text-sm font-mono"
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportCargaDiaPDF(dayServices, dayFuel, selectedDate)}>
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
              </>
            )}
            {activeTab === "personal" && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportPersonalManagerPDF}>
                <Download className="w-3.5 h-3.5" /> PDF
              </Button>
            )}
            {activeTab === "clientes" && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportClientManagerPDF}>
                <Download className="w-3.5 h-3.5" /> PDF
              </Button>
            )}
          </div>
        </div>
        {/* Navegación principal */}
        <div className="container max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 -mb-px">
            {([
              { key: "carga", label: "Carga de Datos", icon: ClipboardList },
              { key: "dashboard", label: "Panel de Análisis", icon: BarChart3 },
              { key: "personal", label: "Personal", icon: Users },
              { key: "clientes", label: "Clientes", icon: Building2 },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Principal */}
      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-5">
        {activeTab === "dashboard" ? (
          <FullDashboard
            services={cleanServices}
            fuelEntries={fuelEntries}
            onBack={() => setActiveTab("carga")}
          />
        ) : activeTab === "personal" ? (
          <PersonalManager />
        ) : activeTab === "clientes" ? (
          <ClientManager />
        ) : (
          <>
            <DashboardStats services={cleanServices} fuelEntries={fuelEntries} selectedDate={selectedDate} />

            <div className="grid lg:grid-cols-2 gap-4">
              <ServiceForm onAdd={handleAddService} selectedDate={selectedDate} existingServices={services} />
              <FuelForm onAdd={handleAddFuel} selectedDate={selectedDate} existingEntries={fuelEntries} />
            </div>

            <ServiceTable services={dayServices} onDelete={handleDeleteService} />
            <FuelTable entries={dayFuel} onDelete={handleDeleteFuel} />
          </>
        )}
      </main>
    </div>
  );
}
