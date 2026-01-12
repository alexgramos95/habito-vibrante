import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/i18n/I18nContext";
import { lazy, Suspense } from "react";

// Lazy load pages to ensure proper provider context
const Index = lazy(() => import("./pages/Index"));
const Objetivos = lazy(() => import("./pages/Objetivos"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Financas = lazy(() => import("./pages/Financas"));
const Compras = lazy(() => import("./pages/Compras"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Progresso = lazy(() => import("./pages/Progresso"));
const Definicoes = lazy(() => import("./pages/Definicoes"));
const Landing = lazy(() => import("./pages/Landing"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Keep QueryClient outside component to prevent recreation
const queryClient = new QueryClient();

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Main application component with providers
const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Main routes */}
              <Route path="/" element={<Index />} />
              <Route path="/objetivos" element={<Objetivos />} />
              <Route path="/trackers" element={<Objetivos />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/calendar" element={<Calendario />} />
              <Route path="/financas" element={<Financas />} />
              <Route path="/finances" element={<Financas />} />
              <Route path="/compras" element={<Compras />} />
              <Route path="/shopping" element={<Compras />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/profile" element={<Perfil />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/landing" element={<Landing />} />
              
              {/* Legacy routes for backwards compatibility */}
              <Route path="/habitos" element={<Index />} />
              <Route path="/habits" element={<Index />} />
              <Route path="/triggers" element={<Index />} />
              <Route path="/progresso" element={<Progresso />} />
              <Route path="/progress" element={<Progresso />} />
              <Route path="/definicoes" element={<Definicoes />} />
              <Route path="/settings" element={<Definicoes />} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
