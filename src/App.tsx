import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginPage from "./components/LoginPage.tsx";
import { AuthProvider, useAuth } from "./lib/authContext";
import WorldMapBackground from "./components/WorldMapBackground";
import { bootstrapFromAzure, isAzureConfigured } from "./lib/azureBlob";
import { getServices, getFuelEntries } from "./lib/store";
import { getClients } from "./lib/clientStore";
import { getPersonal } from "./lib/personalStore";

const queryClient = new QueryClient();

function AppGate() {
  const { user, ready } = useAuth();
  const [dataReady, setDataReady] = useState(!isAzureConfigured());

  useEffect(() => {
    if (!isAzureConfigured()) return;
    getServices();
    getFuelEntries();
    getClients();
    getPersonal();
    bootstrapFromAzure().finally(() => setDataReady(true));
  }, []);

  if (!ready || !dataReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Sincronizando datos…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WorldMapBackground />
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
