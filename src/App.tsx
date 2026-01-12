import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/i18n/I18nContext";

// Pages
import Index from "./pages/Index";
import Objetivos from "./pages/Objetivos";
import Calendario from "./pages/Calendario";
import Financas from "./pages/Financas";
import Compras from "./pages/Compras";
import Triggers from "./pages/Triggers";
import Perfil from "./pages/Perfil";
import Onboarding from "./pages/Onboarding";
import Progresso from "./pages/Progresso";
import Definicoes from "./pages/Definicoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Main routes */}
            <Route path="/" element={<Index />} />
            <Route path="/objetivos" element={<Objetivos />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/financas" element={<Financas />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/triggers" element={<Triggers />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/onboarding" element={<Onboarding />} />
            
            {/* Legacy routes for backwards compatibility */}
            <Route path="/habitos" element={<Index />} />
            <Route path="/progresso" element={<Progresso />} />
            <Route path="/definicoes" element={<Definicoes />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
