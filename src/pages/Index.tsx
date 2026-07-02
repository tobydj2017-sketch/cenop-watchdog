import { useState, useCallback, useMemo, useEffect } from "react";
import { Shield, CalendarDays, BarChart3, ClipboardList, Users, Building2, Download, Moon, Sun, FileText, LogOut, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import DashboardStats from "@/components/DashboardStats";
import ServiceForm from "@/components/ServiceForm";
import ServiceTable from "@/components/ServiceTable";
import FuelForm from "@/components/FuelForm";
import FuelTable from "@/components/FuelTable";
import FullDashboard from "@/components/FullDashboard";
import DashboardReportes from "@/components/dashboard/DashboardReportes";
import PersonalManager from "@/components/PersonalManager";
import ClientManager from "@/components/ClientManager";
import UserManager from "@/components/UserManager";
import amCustodiasAsset from "@/assets/am-custodias.png.asset.json";
import { ServiceEntry, FuelEntry, isCountableServiceEntry } from "@/lib/types";
import {
  getServices, addService, deleteService, updateService,
  getFuelEntries, addFuelEntry, deleteFuelEntry,
} from "@/lib/store";
import { exportCargaDiaPDF, exportPersonalManagerPDF, exportClientManagerPDF } from "@/lib/pdfExport";
import { useAuth } from "@/lib/authContext";
import { isOwnService } from "@/lib/authStore";

type AppTab = "carga" | "dashboard" | "personal" | "clientes" | "reportes" | "usuarios";

const ALL_NAV_ITEMS = [
  { key: "carga", label: "Carga de Datos", icon: ClipboardList, perm: null },
  { key: "dashboard", label: "Panel de Análisis", icon: BarChart3, perm: "viewDashboard" as const },
  { key: "personal", label: "Personal", icon: Users, perm: "managePersonal" as const },
  { key: "clientes", label: "Clientes", icon: Building2, perm: "manageClients" as const },
  { key: "reportes", label: "Reportes", icon: FileText, perm: "viewReportes" as const },
  { key: "usuarios", label: "Usuarios", icon: ShieldCheck, perm: "manageUsers" as const },
] as const;

function AppSidebar({
  activeTab,
  setActiveTab,
  navItems,
}: {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  navItems: typeof ALL_NAV_ITEMS[number][];
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3 rounded-lg px-1 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10 glow-amber">
            <Shield className="h-5 w-5 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">CENOP</h1>
              <p className="truncate text-xs text-sidebar-foreground/65">AM Seguridad</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ key, label, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    tooltip={label}
                    isActive={activeTab === key}
                    onClick={() => setActiveTab(key as AppTab)}
                    className="h-10 text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 text-xs text-sidebar-foreground/60">
        {!collapsed && <span>Control Operativo</span>}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default function Index() {
  const { user, logout, can, canEditService, canDeleteService } = useAuth();
  const [services, setServices] = useState<ServiceEntry[]>(getServices);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(getFuelEntries);
  const [selectedDate, setSelectedDate] = useState("");
  const [amLightTheme, setAmLightTheme] = useState(() => localStorage.getItem("cenop-theme") === "am-light");

  const navItems = useMemo(
    () => ALL_NAV_ITEMS.filter((item) => item.perm === null || can(item.perm)),
    [user, can],
  );

  const [activeTab, setActiveTab] = useState<AppTab>(navItems[0]?.key as AppTab || "carga");

  useEffect(() => {
    // Si el usuario perdió permiso a la pestaña actual, lo mandamos a la primera disponible
    if (!navItems.find((n) => n.key === activeTab)) {
      setActiveTab((navItems[0]?.key as AppTab) || "carga");
    }
  }, [navItems, activeTab]);

  useEffect(() => {
    document.documentElement.classList.toggle("am-light", amLightTheme);
    localStorage.setItem("cenop-theme", amLightTheme ? "am-light" : "dark");
  }, [amLightTheme]);

  const handleAddService = useCallback((entry: ServiceEntry) => {
    addService(entry);
    setServices(getServices());
  }, []);

  const handleDeleteService = useCallback((id: string) => {
    deleteService(id);
    setServices(getServices());
  }, []);

  const handleUpdateService = useCallback((entry: ServiceEntry) => {
    updateService(entry);
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

  // Filtrado por permisos: si el usuario solo puede editar sus propios servicios
  // y NO puede editar todos, mostrar únicamente los suyos.
  const visibleServices = useMemo(() => {
    if (!user) return [];
    if (user.permissions.editAllServices) return cleanServices;
    if (user.permissions.editOwnServices) {
      return cleanServices.filter((s) => isOwnService(user, s));
    }
    return cleanServices;
  }, [cleanServices, user]);

  const visibleFuel = useMemo(() => {
    if (!user) return [];
    if (user.permissions.editAllServices || user.role === "admin") return fuelEntries;
    if (user.linkedPersonalName) {
      const name = user.linkedPersonalName.trim().toUpperCase();
      return fuelEntries.filter((f) => (f.chofer || "").trim().toUpperCase() === name);
    }
    return fuelEntries;
  }, [fuelEntries, user]);

  const dayServices = selectedDate ? visibleServices.filter((s) => s.fecha === selectedDate) : visibleServices;
  const dayFuel = selectedDate ? visibleFuel.filter((f) => f.fecha === selectedDate) : visibleFuel;

  return (
    <SidebarProvider>
      <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} navItems={navItems} />
      <SidebarInset className="min-w-0 overflow-hidden bg-transparent">
          {/* Encabezado */}
          <header className="sticky top-0 z-40 border-b border-border bg-card/40 backdrop-blur-md">

            <div className="flex w-full items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-9 w-9" />
                <div>
                  <h2 className="text-base font-bold tracking-tight">
                    {navItems.find((item) => item.key === activeTab)?.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">CENOP — AM Seguridad</p>
                </div>
              </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Usuario:</span>
              <span className="font-mono font-bold">{user?.username}</span>
              <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold uppercase">
                {user?.role}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Moon className="w-4 h-4 text-muted-foreground" />
              <Switch
                checked={amLightTheme}
                onCheckedChange={setAmLightTheme}
                aria-label="Cambiar tema AM claro"
              />
              <Sun className="w-4 h-4 text-primary" />
            </div>
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
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={logout} title="Cerrar sesión">
              <LogOut className="w-3.5 h-3.5" /> Salir
            </Button>
          </div>
            </div>
          </header>

          {/* Principal */}
          <main className="w-full min-w-0 mx-auto px-4 py-6 space-y-5">
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
        ) : activeTab === "reportes" ? (
          <DashboardReportes services={cleanServices} fuelEntries={fuelEntries} />
        ) : activeTab === "usuarios" ? (
          <UserManager />
        ) : (
          <>
            <DashboardStats services={visibleServices} fuelEntries={visibleFuel} selectedDate={selectedDate} />

            <div className="flex flex-wrap items-center gap-3">
              {can("createServices") && (
                <ServiceForm onAdd={handleAddService} selectedDate={selectedDate} existingServices={services} />
              )}
              {can("createFuel") && (
                <FuelForm onAdd={handleAddFuel} selectedDate={selectedDate} existingEntries={fuelEntries} />
              )}
              {!can("createServices") && !can("createFuel") && (
                <p className="text-xs text-muted-foreground italic">
                  Tenés acceso solo de edición. Completá los datos faltantes en los servicios donde aparezcas.
                </p>
              )}
            </div>

            <ServiceTable
              services={dayServices}
              onDelete={handleDeleteService}
              onUpdate={handleUpdateService}
              allServices={services}
              canEdit={canEditService}
              canDelete={canDeleteService}
            />
            <FuelTable entries={dayFuel} onDelete={handleDeleteFuel} />
          </>
        )}
          </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
