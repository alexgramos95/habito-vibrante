import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, RotateCcw, Trash2, Coins, ArrowLeft, Bell, Bug, Clock, Wifi, WifiOff } from "lucide-react";
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
import { NotificationStatusBadge } from "@/components/Habits/NotificationSetup";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";

const Definicoes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, locale, setLocale, currency, setCurrency } = useI18n();
  const { state, setState, resetAppData } = useData();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const push = usePushNotifications(userId);
  const [showResetMonthConfirm, setShowResetMonthConfirm] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isResubscribing, setIsResubscribing] = useState(false);
  const [dbTimezone, setDbTimezone] = useState<string | null>(null);
  const [habitsWithReminder, setHabitsWithReminder] = useState<{ nome: string; time: string; days: number[]; enabled: boolean }[]>([]);

  // Fetch debug info
  useEffect(() => {
    if (!showDebug || !userId) return;
    
    supabase
      .from('push_subscriptions')
      .select('timezone, endpoint, created_at')
      .eq('user_id', userId)
      .then(({ data }) => {
        setDbTimezone(data?.[0]?.timezone ?? 'Not found');
      });

    // Parse habits with reminders
    const habits = state.habits?.filter((h: any) => h.scheduledTime && h.active) || [];
    setHabitsWithReminder(habits.map((h: any) => ({
      nome: h.nome,
      time: h.scheduledTime,
      days: h.scheduledDays || [],
      enabled: h.reminderEnabled !== false,
    })));
  }, [showDebug, userId, state.habits]);

  const handleResetMonth = () => {
    setState(prev => resetMonth(prev, new Date().getFullYear(), new Date().getMonth()));
    toast({ title: t.settings.monthReset });
    setShowResetMonthConfirm(false);
  };

  const handleResetAll = async () => {
    setIsResetting(true);
    try {
      await resetAppData();
      toast({ title: "Progress reset.", description: "All data has been deleted." });
      window.location.reload();
    } catch {
      toast({ title: "Reset failed", variant: "destructive" });
    } finally { setIsResetting(false); setShowResetAllConfirm(false); }
  };

  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t.settings.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === 'pt-PT' ? 'Preferências da aplicação' : 'App preferences'}
            </p>
          </div>
        </div>

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
            <Bell className="h-4 w-4 text-accent" />
            <Label className="text-sm font-semibold">Notifications</Label>
          </div>
          <NotificationStatusBadge />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            "Active (background)" = notifications work even with the app closed.
          </p>
        </div>

        {/* Debug Notifications */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Notification Debug</Label>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowDebug(v => !v)} className="text-xs h-7">
              {showDebug ? 'Hide' : 'Show'}
            </Button>
          </div>
          {showDebug && (
            <div className="space-y-2 text-[11px] font-mono">
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <span className="text-muted-foreground">Mode:</span>
                <span className={push.mode === 'background' ? 'text-green-500' : 'text-yellow-500'}>
                  {push.mode} {push.isSubscribed ? '(subscribed)' : '(not subscribed)'}
                </span>
                <span className="text-muted-foreground">Permission:</span>
                <span>{push.permission}</span>
                <span className="text-muted-foreground">Push supported:</span>
                <span>{push.isPushSupported ? '✅' : '❌'}</span>
                <span className="text-muted-foreground">Browser TZ:</span>
                <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                <span className="text-muted-foreground">DB TZ:</span>
                <span className={dbTimezone === 'UTC' ? 'text-destructive font-bold' : ''}>
                  {dbTimezone ?? 'Loading...'}
                </span>
                <span className="text-muted-foreground">Local time:</span>
                <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-muted-foreground">Day of week:</span>
                <span>{new Date().getDay()} ({['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]})</span>
              </div>
              
              {habitsWithReminder.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/20 space-y-1.5">
                  <span className="text-muted-foreground font-semibold">Habits with reminders:</span>
                  {habitsWithReminder.map((h, i) => (
                    <div key={i} className="pl-2 flex items-center gap-2">
                      {h.enabled ? <Bell className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-muted-foreground" />}
                      <span>{h.nome}</span>
                      <span className="text-muted-foreground">@ {h.time}</span>
                      <span className="text-muted-foreground">
                        {h.days.length ? `[${h.days.join(',')}]` : '[daily]'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {habitsWithReminder.length === 0 && (
                <p className="text-muted-foreground italic">No habits with scheduled times</p>
              )}

              {/* Re-subscribe + Test Push */}
              <div className="mt-3 pt-3 border-t border-border/20 space-y-2">
                {!push.isSubscribed && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isResubscribing || !userId}
                    onClick={async () => {
                      setIsResubscribing(true);
                      try {
                        // Force unsubscribe old + re-subscribe
                        const reg = await navigator.serviceWorker.ready;
                        const oldSub = await reg.pushManager.getSubscription();
                        if (oldSub) {
                          await oldSub.unsubscribe();
                          // Clean DB
                          await supabase.from('push_subscriptions').delete().eq('user_id', userId!);
                        }
                        const success = await push.subscribeToPush();
                        if (success) {
                          toast({ title: '✅ Subscrição recriada', description: 'Agora testa com o botão abaixo.' });
                        } else {
                          toast({ title: '❌ Falhou a recriar subscrição', variant: 'destructive' });
                        }
                      } catch (err: any) {
                        toast({ title: '❌ Erro', description: err?.message || String(err), variant: 'destructive' });
                      } finally {
                        setIsResubscribing(false);
                      }
                    }}
                    className="gap-1.5 w-full"
                  >
                    <Wifi className="h-3.5 w-3.5" />
                    {isResubscribing ? 'A recriar...' : '⚠️ Recriar subscrição push'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSendingTest || !userId}
                  onClick={async () => {
                    setIsSendingTest(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('send-push-notification', {
                        body: {
                          userId,
                          payload: {
                            title: 'becoMe Teste 🔔',
                            body: 'Se vês isto, as notificações funcionam!',
                            tag: 'test-notification',
                          },
                        },
                      });
                      if (error) throw error;
                      toast({
                        title: '✅ Push enviada',
                        description: `Sent: ${data?.sent ?? '?'}, Failed: ${data?.failed ?? '?'}`,
                      });
                    } catch (err: any) {
                      toast({
                        title: '❌ Erro ao enviar push',
                        description: err?.message || String(err),
                        variant: 'destructive',
                      });
                    } finally {
                      setIsSendingTest(false);
                    }
                  }}
                  className="gap-1.5 w-full"
                >
                  <Bell className="h-3.5 w-3.5" />
                  {isSendingTest ? 'A enviar...' : 'Enviar notificação de teste'}
                </Button>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Testa no URL publicado (becomeme.lovable.app), não no preview.
                </p>
              </div>
            </div>
          )}
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