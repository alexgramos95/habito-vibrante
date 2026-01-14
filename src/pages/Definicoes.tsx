import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, RotateCcw, Trash2, Coins, ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import { localeNames, currencyNames, type Locale, type Currency } from "@/i18n";
import { AppState } from "@/data/types";
import { loadState, saveState, resetMonth, resetAll } from "@/data/storage";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const Definicoes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, locale, setLocale, currency, setCurrency } = useI18n();
  const [state, setState] = useState<AppState>(() => loadState());
  const [showResetConfirm, setShowResetConfirm] = useState<"month" | "all" | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const handleResetMonth = () => {
    setState((prev) => resetMonth(prev, currentYear, currentMonth));
    toast({ title: t.settings.monthReset });
    setShowResetConfirm(null);
  };

  const handleResetAll = () => {
    setState(resetAll());
    toast({ title: t.settings.allReset });
    setShowResetConfirm(null);
  };

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale as Locale);
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency as Currency);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t.settings.title}</h1>
        </div>

        {/* Idioma */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t.settings.language}
            </CardTitle>
            <CardDescription>
              {t.settings.languageDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={locale} onValueChange={handleLocaleChange}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder={t.settings.selectLanguage} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(localeNames).map(([code, name]) => (
                  <SelectItem key={code} value={code}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Moeda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              {t.settings.currency}
            </CardTitle>
            <CardDescription>
              {t.settings.currencyDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder={t.settings.selectCurrency} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(currencyNames).map(([code, names]) => (
                  <SelectItem key={code} value={code}>{names[locale]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Reiniciar Dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {t.settings.resetData}
            </CardTitle>
            <CardDescription>
              {t.settings.resetDataDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm("month")}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {t.actions.resetMonth}
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => setShowResetConfirm("all")}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t.actions.resetAll}
              </Button>
            </div>
            
            <div className="rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
              <p><strong>{t.actions.resetMonth}:</strong> {t.settings.resetMonthInfo}</p>
              <p className="mt-2"><strong>{t.actions.resetAll}:</strong> {t.settings.resetAllInfo}</p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Reset Confirmation Dialog */}
      <AlertDialog
        open={!!showResetConfirm}
        onOpenChange={() => setShowResetConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showResetConfirm === "month"
                ? t.actions.resetMonth
                : t.actions.resetAll}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showResetConfirm === "month"
                ? t.settings.resetMonthConfirm
                : t.settings.resetAllConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={showResetConfirm === "month" ? handleResetMonth : handleResetAll}
              className={showResetConfirm === "all" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {t.actions.reset}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Definicoes;
