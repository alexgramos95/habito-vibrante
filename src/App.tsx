import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/i18n/I18nContext";
import Index from "./pages/Index";
import Habitos from "./pages/Habitos";
import Calendario from "./pages/Calendario";
import Progresso from "./pages/Progresso";
import Definicoes from "./pages/Definicoes";
import Compras from "./pages/Compras";
import Financas from "./pages/Financas";
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
            <Route path="/" element={<Index />} />
            <Route path="/habitos" element={<Habitos />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/progresso" element={<Progresso />} />
            <Route path="/definicoes" element={<Definicoes />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/financas" element={<Financas />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
