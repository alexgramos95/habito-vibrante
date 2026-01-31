import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/I18nContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";

// Lazy load pages (except Onboarding, que importamos diretamente)
const Index = lazy(() => import("./pages/Index"));
const Objetivos = lazy(() => import("./pages/Objetivos"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Compras = lazy(() => import("./pages/Compras"));
const Perfil = lazy(() => import("./pages/Perfil"));
// Habitos removed - /app now handles habit management
// const Onboarding = lazy(() => import("./pages/Onboarding")); // <- removido
const Progresso = lazy(() => import("./pages/Progresso"));
const Definicoes = lazy(() => import("./pages/Definicoes"));
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Decision = lazy(() => import("./pages/Decision"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Account = lazy(() => import("./pages/Account"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Onboarding importado de forma direta (sem React.lazy)
import Onboarding from "./pages/Onboarding";

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
      <AuthProvider>
        <DataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Landing page is the root */}
                  <Route path="/" element={<Landing />} />

                  {/* App shell routes - consistent /app/* paths */}
                  <Route path="/app" element={<Index />} />
                  <Route path="/app/trackers" element={<Objetivos />} />
                  <Route path="/app/calendar" element={<Calendario />} />
                  <Route path="/app/shopping" element={<Compras />} />
                  <Route path="/app/profile" element={<Perfil />} />
                  <Route path="/app/progress" element={<Progresso />} />
                  <Route path="/app/settings" element={<Definicoes />} />

                  {/* Standalone pages */}
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/decision" element={<Decision />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />

                  {/* Legacy routes for backwards compatibility */}
                  <Route path="/habitos" element={<Index />} />
                  <Route path="/habits" element={<Index />} />
                  <Route path="/triggers" element={<Index />} />
                  <Route path="/objetivos" element={<Objetivos />} />
                  <Route path="/trackers" element={<Objetivos />} />
                  <Route path="/calendario" element={<Calendario />} />
                  <Route path="/calendar" element={<Calendario />} />
                  <Route path="/compras" element={<Compras />} />
                  <Route path="/shopping" element={<Compras />} />
                  <Route path="/perfil" element={<Perfil />} />
                  <Route path="/profile" element={<Perfil />} />
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
        </DataProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
