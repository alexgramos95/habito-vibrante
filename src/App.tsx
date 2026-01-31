import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/I18nContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { GatedPage } from "@/components/Premium/GatedPage";
import { PWAUpdateToast, usePWAUpdate } from "@/components/PWA/PWAUpdateToast";

// Lazy load pages (except Onboarding, que importamos diretamente)
const Index = lazy(() => import("./pages/Index"));
const Objetivos = lazy(() => import("./pages/Objetivos"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Compras = lazy(() => import("./pages/Compras"));
const Perfil = lazy(() => import("./pages/Perfil"));
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

// Gated page wrappers for PRO-only pages
// FREE users: only Hábitos, Calendário, Perfil
// PRO/TRIAL users: all pages

const GatedTrackers = () => (
  <GatedPage featureName="Trackers">
    <Objetivos />
  </GatedPage>
);

const GatedShopping = () => (
  <GatedPage featureName="Lista de Compras">
    <Compras />
  </GatedPage>
);

const GatedProgress = () => (
  <GatedPage featureName="Progresso">
    <Progresso />
  </GatedPage>
);

const GatedSettings = () => (
  <GatedPage featureName="Definições">
    <Definicoes />
  </GatedPage>
);

// PWA Update wrapper - must be inside BrowserRouter for hooks that use router
const PWAUpdateWrapper = ({ children }: { children: React.ReactNode }) => {
  const { showUpdateToast, applyUpdate, dismissUpdate } = usePWAUpdate();
  
  return (
    <>
      {children}
      {showUpdateToast && (
        <PWAUpdateToast onUpdate={applyUpdate} onDismiss={dismissUpdate} />
      )}
    </>
  );
};

// Inner app content that requires router context
const AppRoutes = () => (
  <PWAUpdateWrapper>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing page is the root */}
        <Route path="/" element={<Landing />} />

        {/* App shell routes - consistent /app/* paths */}
        {/* FREE pages: Hábitos, Calendário, Perfil */}
        <Route path="/app" element={<Index />} />
        <Route path="/app/calendar" element={<Calendario />} />
        <Route path="/app/profile" element={<Perfil />} />
        
        {/* PRO-only pages: Trackers, Shopping, Progress, Settings */}
        <Route path="/app/trackers" element={<GatedTrackers />} />
        <Route path="/app/shopping" element={<GatedShopping />} />
        <Route path="/app/progress" element={<GatedProgress />} />
        <Route path="/app/settings" element={<GatedSettings />} />

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
        <Route path="/objetivos" element={<GatedTrackers />} />
        <Route path="/trackers" element={<GatedTrackers />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/calendar" element={<Calendario />} />
        <Route path="/compras" element={<GatedShopping />} />
        <Route path="/shopping" element={<GatedShopping />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/profile" element={<Perfil />} />
        <Route path="/progresso" element={<GatedProgress />} />
        <Route path="/progress" element={<GatedProgress />} />
        <Route path="/definicoes" element={<GatedSettings />} />
        <Route path="/settings" element={<GatedSettings />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </PWAUpdateWrapper>
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
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </DataProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
