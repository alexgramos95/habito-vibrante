import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, RotateCcw, Trash2, Coins, ArrowLeft, Bell, RefreshCw, Settings } from "lucide-react";
import { NotificationSetup } from "@/components/Habits/NotificationSetup";
import { useI18n } from "@/i18n/I18nContext";
import { localeNames, currencyNames, type Locale, type Currency } from "@/i18n";
import { resetMonth } from "@/data/storage";
import { Navigation } from "@/components/Layout/Navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/contexts/DataContext";
import { ResetAppDialog } from "@/components/Profile/ResetAppDialog";
import { clearPwaRuntime } from "@/lib/pwaRefresh";

const Definicoes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, locale, setLocale, currency, setCurrency } = useI18n();
  const { setState, resetAppData } = useData();
  const [showResetMonthConfirm, setShowResetMonthConfirm] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const handleResetMonth = () => {
    setState(prev => resetMonth(prev, new Date().getFullYear(), new Date().getMonth()));
    toast({ title: t.settings.monthReset });
    setShowResetMonthConfirm(false);
  };

  const handleResetAll = async () => {
    setIsResetting(true);
    const isPT = locale === "pt-PT";
    try {
      await resetAppData();
      toast({
        title: isPT ? "Progresso reiniciado." : "Progress reset.",
        description: isPT ? "Todos os dados foram eliminados." : "All data has been deleted.",
      });
      window.location.reload();
    } catch {
      toast({
        title: isPT ? "Falha ao reiniciar" : "Reset failed",
        variant: "destructive",
      });
    } finally { setIsResetting(false); setShowResetAllConfirm(false); }
  };

  const handleHardReload = async () => {
    setIsReloading(true);
    try {
      // Trigger update check on any registered service worker
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.update().catch(() => null)));
      }
      await clearPwaRuntime();
      toast({
        title: locale === "pt-PT" ? "A recarregar..." : "Reloading...",
        description:
          locale === "pt-PT"
            ? "A obter a versão mais recente."
            : "Fetching the latest version.",
      });
      // Cache-busting reload
      const url = new URL(window.location.href);
      url.searchParams.set("_r", Date.now().toString());
      window.location.replace(url.toString());
    } catch {
      setIsReloading(false);
      toast({
        title: locale === "pt-PT" ? "Falha ao recarregar" : "Reload failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content max-w-xl mx-auto space-y-5">
        <PageHeader
          title={t.settings.title}
          subtitle={locale === 'pt-PT' ? 'Preferências da aplicação' : 'App preferences'}
          icon={Settings}
          backTo
          backLabel={locale === 'pt-PT' ? 'Voltar' : 'Back'}
        />

        {/* Language */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">{t.settings.language}</Label>
          </div>
          <Select value={locale} onValueChange={v => setLocale(v as Locale)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(localeNames).map(([code, name]) => (
                <SelectItem key={code} value={code}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-warning" />
            <Label className="text-sm font-semibold">{t.settings.currency}</Label>
          </div>
          <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(currencyNames).map(([code, names]) => (
                <SelectItem key={code} value={code}>{names[locale]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">
              {locale === 'pt-PT' ? 'Notificações' : 'Notifications'}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {locale === 'pt-PT'
              ? 'Recebe lembretes para os teus hábitos à hora agendada.'
              : 'Get reminders for your habits at their scheduled time.'}
          </p>
          <NotificationSetup />
        </div>

        {/* Reload App */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">
              {locale === "pt-PT" ? "Recarregar app" : "Reload app"}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {locale === "pt-PT"
              ? "Força a obtenção da versão mais recente, limpando a cache local."
              : "Force-fetch the latest version and clear local cache."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleHardReload}
            disabled={isReloading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? "animate-spin" : ""}`} />
            {locale === "pt-PT" ? "Recarregar" : "Reload"}
          </Button>
        </div>

        {/* Reset Data */}
        <div className="rounded-2xl border border-destructive/20 bg-destructive/3 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-destructive" />
            <Label className="text-sm font-semibold text-destructive">{t.settings.resetData}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{t.settings.resetDataDescription}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowResetMonthConfirm(true)} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> {t.actions.resetMonth}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowResetAllConfirm(true)} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> {t.actions.resetAll}
            </Button>
          </div>
        </div>
      </main>

      {/* Reset Month */}
      <AlertDialog open={showResetMonthConfirm} onOpenChange={setShowResetMonthConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.actions.resetMonth}</AlertDialogTitle>
            <AlertDialogDescription>{t.settings.resetMonthConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetMonth}>{t.actions.reset}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset All */}
      <ResetAppDialog open={showResetAllConfirm} onOpenChange={setShowResetAllConfirm} onConfirm={handleResetAll} isLoading={isResetting} />
    </div>
  );
};

export default Definicoes;
