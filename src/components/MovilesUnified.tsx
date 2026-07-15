import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, BarChart3 } from "lucide-react";
import MovilesManager from "./MovilesManager";
import FleetDashboard from "./FleetDashboard";
import { FuelEntry, ServiceEntry } from "@/lib/types";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
}

export default function MovilesUnified({ services, fuelEntries }: Props) {
  return (
    <Tabs defaultValue="panel" className="space-y-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="panel" className="gap-2">
          <BarChart3 className="w-4 h-4" /> Panel de Flota
        </TabsTrigger>
        <TabsTrigger value="gestion" className="gap-2">
          <Car className="w-4 h-4" /> Gestión de Móviles
        </TabsTrigger>
      </TabsList>
      <TabsContent value="panel" className="mt-0">
        <FleetDashboard services={services} fuelEntries={fuelEntries} />
      </TabsContent>
      <TabsContent value="gestion" className="mt-0">
        <MovilesManager />
      </TabsContent>
    </Tabs>
  );
}
