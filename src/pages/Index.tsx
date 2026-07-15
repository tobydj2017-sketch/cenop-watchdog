import { useState, useEffect } from "react";
import MovilesHub from "@/components/MovilesHub";
import { ServiceEntry, FuelEntry } from "@/lib/types";
import { getServices, getFuelEntries } from "@/lib/store";

export default function Index() {
  const [services, setServices] = useState<ServiceEntry[]>(getServices);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(getFuelEntries);
  const [amLightTheme, setAmLightTheme] = useState(() => localStorage.getItem("cenop-theme") === "am-light");

  useEffect(() => {
    document.documentElement.classList.toggle("am-light", amLightTheme);
    localStorage.setItem("cenop-theme", amLightTheme ? "am-light" : "dark");
  }, [amLightTheme]);

  useEffect(() => {
    const onServices = () => setServices(getServices());
    const onFuel = () => setFuelEntries(getFuelEntries());
    window.addEventListener("cenop:services-synced", onServices);
    window.addEventListener("cenop:fuel-synced", onFuel);
    const iv = setInterval(() => {
      import("./../lib/azureBlob").then(async ({ downloadJson, BLOB_KEYS, isAzureConfigured }) => {
        if (!isAzureConfigured()) return;
        const [remoteSrv, remoteFuel] = await Promise.all([
          downloadJson<any[]>(BLOB_KEYS.services),
          downloadJson<any[]>(BLOB_KEYS.fuel),
        ]);
        if (Array.isArray(remoteSrv)) {
          const localRaw = localStorage.getItem("cenop_services");
          const local = localRaw ? JSON.parse(localRaw) : [];
          const byId = new Map<string, any>();
          for (const it of remoteSrv) if (it?.id) byId.set(it.id, it);
          for (const it of local) if (it?.id) byId.set(it.id, it);
          const merged = Array.from(byId.values());
          if (merged.length !== local.length) {
            localStorage.setItem("cenop_services", JSON.stringify(merged));
            setServices(getServices());
          }
        }
        if (Array.isArray(remoteFuel)) {
          const localRaw = localStorage.getItem("cenop_fuel");
          const local = localRaw ? JSON.parse(localRaw) : [];
          const byId = new Map<string, any>();
          for (const it of remoteFuel) if (it?.id) byId.set(it.id, it);
          for (const it of local) if (it?.id) byId.set(it.id, it);
          const merged = Array.from(byId.values());
          if (merged.length !== local.length) {
            localStorage.setItem("cenop_fuel", JSON.stringify(merged));
            setFuelEntries(getFuelEntries());
          }
        }
      });
    }, 30000);
    return () => {
      window.removeEventListener("cenop:services-synced", onServices);
      window.removeEventListener("cenop:fuel-synced", onFuel);
      clearInterval(iv);
    };
  }, []);

  return (
    <main className="min-h-screen w-full px-4 py-6 mx-auto max-w-[1600px]">
      <MovilesHub
        services={services}
        fuelEntries={fuelEntries}
        amLightTheme={amLightTheme}
        setAmLightTheme={setAmLightTheme}
      />
    </main>
  );
}
