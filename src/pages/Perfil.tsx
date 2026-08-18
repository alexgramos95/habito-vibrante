import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Globe, Sun, Moon, Trophy, Target, Star, TrendingUp,
  PiggyBank, Trash2, AlertTriangle, User, Crown, Copy,
  LogOut, FileText, Shield, Mail, HelpCircle, UserPlus, Camera, ExternalLink, Download,
  Bell, BellRing, KeyRound
} from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nContext";
import { localeNames, currencyNames, type Locale, type Currency } from "@/i18n";
import { ACHIEVEMENTS } from "@/data/types";
import { getLatestFutureSelf, getReflectionForDate } from "@/data/storage";
import { getLevelProgress } from "@/logic/computations";
import { cn } from "@/lib/utils";
import { ResetAppDialog, type ResetScope } from "@/components/Profile/ResetAppDialog";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useData } from "@/contexts/DataContext";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { TrialBanner } from "@/components/Paywall/TrialBanner";
import { ExportDialog } from "@/components/Export/ExportDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileName } from "@/hooks/useProfileName";
import { OperatorHero } from "@/components/Profile/OperatorHero";
import { getHabitFeedbackEnabled, setHabitFeedbackEnabled } from "@/logic/habitFeedback";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { NUTRITION_STORAGE_KEYS } from "@/data/nutritionStorageKeys";

const Perfil = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, locale, setLocale, currency, setCurrency, formatCurrency } = useI18n();
  const { isAuthenticated, user, signOut } = useAuth();
  const { state, setState, resetAppData, isSyncing } = useData();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const { subscription, trialStatus, isPro, upgradeToPro } = useSubscription();
  const { isDemoMode, enableDemoMode, disableDemoMode } = useDemoMode();
  const [chronotype, setChronotype] = useState<'early' | 'moderate' | 'late'>(() => {
    try { return (localStorage.getItem('become-chronotype') as 'early' | 'moderate' | 'late') || 'moderate'; }
    catch { return 'moderate'; }
  });
  const [habitFeedback, setHabitFeedback] = useState<boolean>(() => getHabitFeedbackEnabled());

  // Notifications
  const {
    isSupported: isNotifSupported,
    isPushSupported,
    permission: notifPermission,
    mode: notifMode,
    requestPermission: requestNotifPermission,
    subscribeToPush,
    getStatusText: getNotifStatusText,
  } = usePushNotifications(user?.id);
  const [isEnablingNotif, setIsEnablingNotif] = useState(false);

  const handleEnableNotifications = async () => {
    setIsEnablingNotif(true);
    try {
      const perm = await requestNotifPermission();
      if (perm === 'granted' && isPushSupported && user?.id) {
        await subscribeToPush();
      }
    } finally {
      setIsEnablingNotif(false);
    }
  };

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) return;
    setIsChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: locale === 'pt-PT' ? 'Palavra-passe atualizada' : 'Password updated' });
      setNewPassword("");
    } catch (e: any) {
      toast({
        title: locale === 'pt-PT' ? 'Erro ao atualizar' : 'Update failed',
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
      setIsChangingPwd(false);
    }
  };

  // Unified profile-name source — same hook used by greeting / hero.
  const { displayName: profileDisplayName } = useProfileName();
  const getDisplayName = () => {
    if (!user) return locale === 'pt-PT' ? 'Visitante' : 'Guest';
    return profileDisplayName || (locale === 'pt-PT' ? 'Visitante' : 'Guest');
  };
  const displayName = getDisplayName();
  const displayEmail = user?.email || (locale === 'pt-PT' ? 'Não autenticado' : 'Not signed in');

  const handleCopyInviteLink = async () => {
    const baseUrl = window.location.origin;
    const ref = isAuthenticated && user?.id ? user.id : null;
    const inviteLink = ref ? `${baseUrl}/?ref=${ref}` : baseUrl;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({ title: locale === 'pt-PT' ? "Link copiado" : "Invite link copied" });
    } catch {
      toast({ title: inviteLink, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: locale === 'pt-PT' ? "Sessão terminada" : "Signed out" });
    navigate('/auth', { replace: true });
  };

  const handleResetAllData = async (scopes: ResetScope[]) => {
    setIsResetting(true);
    const isPt = locale === 'pt-PT';
    try {
      const all = scopes.length === 6;

      if (all) {
        // Full reset: clears localStorage + state + uploads empty cloud snapshot.
        await resetAppData();
      } else {
        // Scoped reset — atomic sequence:
        // 1. Clear out-of-AppState localStorage (nutrition).
        // 2. Update in-memory state (DataContext auto-persists localStorage + cloud).
        // 3. Wait one microtask so React flushes the new state to all consumers
        //    (KPIs, habits list, calendar) before we close the dialog.
        if (scopes.includes('nutrition')) {
          NUTRITION_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
        }

        await new Promise<void>((resolve) => {
          setState((prev) => {
            const next = { ...prev };
            if (scopes.includes('habits')) {
              next.habits = [];
              next.dailyLogs = [];
            }
            if (scopes.includes('calendar')) {
              next.dailyLogs = [];
              next.trackerEntries = [];
              next.sleepEntries = [];
            }
            if (scopes.includes('shopping')) {
              next.shoppingItems = [];
            }
            if (scopes.includes('reflections')) {
              next.reflections = [];
              next.futureSelf = [];
            }
            if (scopes.includes('achievements')) {
              next.gamification = {
                pontos: 0,
                nivel: 1,
                conquistas: [],
                consistencyScore: 0,
                currentStreak: 0,
                bestStreak: 0,
              };
            }
            return next;
          });
          // Defer until after React commits the state update.
          queueMicrotask(resolve);
        });

        try { window.dispatchEvent(new CustomEvent('become:app-reset')); } catch { /* noop */ }
      }

      // Wait for any pending cloud sync (PRO users) to settle before re-enabling.
      // Poll isSyncing for up to 5s — non-blocking for FREE users (already false).
      const start = Date.now();
      while (isSyncing && Date.now() - start < 5000) {
        await new Promise((r) => setTimeout(r, 100));
      }

      toast({ title: isPt ? "Dados reiniciados" : "Data reset" });
      setShowResetDialog(false);
    } catch {
      toast({ title: isPt ? "Reinício falhou" : "Reset failed", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  const isPtLocale = locale === 'pt-PT';
  const deleteKeyword = isPtLocale ? 'ELIMINAR' : 'DELETE';

  const handleDeleteAllUserData = async () => {
    if (!user) return;
    setIsDeletingAll(true);
    try {
      await Promise.all([
        supabase.from('user_data').delete().eq('user_id', user.id),
        supabase.from('daily_reflections' as never).delete().eq('user_id', user.id).then(() => null, () => null),
        supabase.from('feedback').delete().eq('user_id', user.id),
        supabase.from('pro_interest').delete().eq('user_id', user.id),
        supabase.from('push_subscriptions').delete().eq('user_id', user.id),
        supabase.from('profiles').delete().eq('user_id', user.id),
      ]);

      // Wipe every local trace
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch { /* noop */ }

      try { window.dispatchEvent(new CustomEvent('become:app-reset')); } catch { /* noop */ }

      toast({
        title: isPtLocale ? 'Registo eliminado' : 'Record deleted',
        description: isPtLocale
          ? 'Todos os teus dados foram removidos.'
          : 'All your data has been removed.',
      });

      await signOut();
      navigate('/', { replace: true });
    } catch {
      toast({
        title: isPtLocale ? 'Não foi possível eliminar' : 'Could not delete',
        description: isPtLocale ? 'Tenta novamente.' : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAll(false);
    }
  };



  const levelProgress = getLevelProgress(state.gamification.pontos);
  const unlockedAchievements = ACHIEVEMENTS.filter(a => state.gamification.conquistas.includes(a.id));
  const activeHabits = state.habits.filter(h => h.active).length;

  const chronotypeLabels = {
    early: { icon: Sun, label: t.profile.earlyBird, time: "05:00 – 21:00" },
    moderate: { icon: Sun, label: t.profile.moderate, time: "07:00 – 23:00" },
    late: { icon: Moon, label: t.profile.nightOwl, time: "10:00 – 02:00" },
  };

  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content max-w-xl mx-auto space-y-5">
        {/* Trial banner */}
        {trialStatus.isActive && (
          <div className="flex justify-center">
            <TrialBanner daysRemaining={trialStatus.daysRemaining} onUpgrade={() => setShowPaywall(true)} />
          </div>
        )}

        {/* ═══ Operator Hero ═══ */}
        <OperatorHero locale={locale} level={levelProgress.current} activeHabits={activeHabits} />



        {!isAuthenticated && (
          <Button className="w-full gap-2" onClick={() => navigate('/auth')}>
            <User className="h-4 w-4" /> {locale === 'pt-PT' ? 'Entrar / Criar conta' : 'Sign in / Create account'}
          </Button>
        )}

        {/* ═══ Subscription ═══ */}
        <div className={cn(
          "rounded-2xl border p-4 space-y-3",
          isPro ? "border-warning/30 bg-warning/5" : "border-border/30 bg-card/50"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className={cn("h-4 w-4", isPro ? "text-warning" : "text-muted-foreground")} />
              <span className="font-semibold text-sm">
                {subscription.plan === 'pro' ? 'Pro' : subscription.plan === 'trial' ? 'Trial' : (locale === 'pt-PT' ? 'Gratuito' : 'Free')}
              </span>
            </div>
            <Badge variant={isPro ? "default" : "secondary"} className={cn(isPro && "bg-warning text-warning-foreground")}>
              {isPro ? (locale === 'pt-PT' ? 'ATIVO' : 'ACTIVE') : 'FREE'}
            </Badge>
          </div>
          {trialStatus.isActive && (
            <p className="text-xs text-muted-foreground">
              {trialStatus.daysRemaining}d {trialStatus.hoursRemaining}h {locale === 'pt-PT' ? 'restantes' : 'remaining'}
            </p>
          )}
          <Button size="sm" onClick={() => setShowPaywall(true)} className="w-full">
            {locale === 'pt-PT' ? 'Alterar plano' : 'Change plan'}
          </Button>
        </div>

        {/* ═══ Stats Grid ═══ */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-warning/15 bg-warning/5 p-3 text-center">
            <p className="text-lg font-bold text-warning">{state.gamification.pontos}</p>
            <p className="text-[9px] text-muted-foreground">{t.profile.totalPoints}</p>
          </div>
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-center">
            <p className="text-lg font-bold text-primary">{state.gamification.currentStreak || 0}</p>
            <p className="text-[9px] text-muted-foreground">{t.kpis.currentStreak}</p>
          </div>
          <div className="rounded-xl border border-success/15 bg-success/5 p-3 text-center">
            <p className="text-lg font-bold text-success">{unlockedAchievements.length}</p>
            <p className="text-[9px] text-muted-foreground">{t.profile.achievements}</p>
          </div>
        </div>

        {/* ═══ Level Progress (clickable → /app/level) ═══ */}
        <button
          type="button"
          onClick={() => navigate('/app/level')}
          className="w-full text-left rounded-2xl border border-border/30 bg-card/50 p-4 hover:border-primary/40 hover:bg-card transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={locale === 'pt-PT' ? 'Ver evolução do nível' : 'View level progress'}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              {t.profile.levelProgress}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {levelProgress.pointsToNext} {locale === 'pt-PT' ? 'para nível' : 'to level'} {levelProgress.nextLevel}
            </span>
          </div>
          <Progress value={levelProgress.progress} className="h-1.5" />
          <p className="mt-2 text-[10px] text-muted-foreground/80 font-mono uppercase tracking-wider">
            {locale === 'pt-PT' ? '› Toca para veres o teu crescimento' : '› Tap to see your growth'}
          </p>
        </button>

        {/* ═══ Chronotype ═══ */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
          <Label className="text-sm font-semibold">{t.profile.chronotype}</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['early', 'moderate', 'late'] as const).map(type => {
              const info = chronotypeLabels[type];
              const Icon = info.icon;
              return (
                <button
                  key={type}
                  onClick={() => { setChronotype(type); localStorage.setItem('become-chronotype', type); }}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all",
                    chronotype === type ? "border-primary bg-primary/5" : "border-border/30 hover:border-border/60"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ Settings ═══ */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-4">
          <Label className="text-sm font-semibold">{t.settings.title}</Label>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t.profile.language}</Label>
            <Select value={locale} onValueChange={v => setLocale(v as Locale)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(localeNames).map(([code, name]) => <SelectItem key={code} value={code}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t.profile.currency}</Label>
            <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(currencyNames).map(([code, names]) => <SelectItem key={code} value={code}>{names[locale]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Notifications */}
          <div className="space-y-2 pt-3 border-t border-border/20">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-primary" />
              <Label className="text-xs text-muted-foreground">
                {locale === 'pt-PT' ? 'Notificações' : 'Notifications'}
              </Label>
            </div>
            {notifPermission === 'granted' && (notifMode === 'background' || notifMode === 'in-app') ? (
              <div className="flex items-center gap-2 text-xs text-success">
                <BellRing className="h-3.5 w-3.5" />
                <span>{getNotifStatusText()}</span>
              </div>
            ) : notifPermission === 'denied' ? (
              <p className="text-xs text-destructive">
                {locale === 'pt-PT'
                  ? 'Notificações bloqueadas. Ativa nas definições do navegador.'
                  : 'Notifications blocked. Enable in your browser settings.'}
              </p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnableNotifications}
                disabled={isEnablingNotif || !isNotifSupported}
                className="w-full gap-2 h-9"
              >
                <Bell className="h-3.5 w-3.5" />
                {isEnablingNotif
                  ? (locale === 'pt-PT' ? 'A ativar...' : 'Enabling...')
                  : (locale === 'pt-PT' ? 'Ativar notificações' : 'Enable notifications')}
              </Button>
            )}
          </div>

          {/* Password change */}
          {isAuthenticated && (
            <div className="space-y-2 pt-3 border-t border-border/20">
              <div className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                <Label className="text-xs text-muted-foreground">
                  {locale === 'pt-PT' ? 'Alterar palavra-passe' : 'Change password'}
                </Label>
              </div>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={locale === 'pt-PT' ? 'Nova palavra-passe (mín. 8)' : 'New password (min. 8)'}
                className="h-9"
                autoComplete="new-password"
              />
              <Button
                size="sm"
                onClick={handleChangePassword}
                disabled={isChangingPwd || newPassword.length < 8}
                className="w-full h-9"
              >
                {isChangingPwd
                  ? (locale === 'pt-PT' ? 'A guardar...' : 'Saving...')
                  : (locale === 'pt-PT' ? 'Atualizar palavra-passe' : 'Update password')}
              </Button>
            </div>
          )}
        </div>

        {/* ═══ Invite ═══ */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{locale === 'pt-PT' ? 'Convidar outros' : 'Invite others'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {locale === 'pt-PT' ? 'Partilha o becoMe com quem valoriza disciplina.' : 'Share becoMe with who values discipline.'}
              </p>
            </div>
            <UserPlus className="h-4 w-4 text-primary shrink-0" />
          </div>
          <Button variant="outline" onClick={handleCopyInviteLink} className="w-full gap-2 h-9">
            <Copy className="h-3.5 w-3.5" /> {locale === 'pt-PT' ? 'Copiar link' : 'Copy link'}
          </Button>
        </div>

        {/* ═══ Habit Feedback Toggle ═══ */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <Label htmlFor="habit-feedback-toggle" className="text-sm font-medium cursor-pointer">
                  {locale === 'pt-PT' ? 'Mensagens ao concluir hábitos' : 'Messages when completing habits'}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {locale === 'pt-PT'
                    ? 'Recebe uma nota positiva na primeira marcação de cada hábito por dia.'
                    : 'Get a short positive note on the first completion of each habit per day.'}
                </p>
              </div>
            </div>
            <Switch
              id="habit-feedback-toggle"
              checked={habitFeedback}
              onCheckedChange={(checked) => { setHabitFeedback(checked); setHabitFeedbackEnabled(checked); }}
            />
          </div>
        </div>

        {/* ═══ Screenshot/Demo Mode ═══ */}
        {import.meta.env.VITE_ENABLE_SCREENSHOT_MODE === 'true' && (
          <div className="rounded-2xl border border-border/30 bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Demo mode</span>
              </div>
              <Switch checked={isDemoMode} onCheckedChange={checked => checked ? enableDemoMode() : disableDemoMode()} />
            </div>
          </div>
        )}

        {/* ═══ Legal ═══ */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</span>
          </div>
          <a href="/terms" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{locale === 'pt-PT' ? 'Termos de Serviço' : 'Terms of Service'}</span>
          </a>
          <a href="/privacy" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{locale === 'pt-PT' ? 'Política de Privacidade' : 'Privacy Policy'}</span>
          </a>
          <a href="mailto:support@become.app" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{locale === 'pt-PT' ? 'Suporte' : 'Support'}</span>
          </a>
        </div>

        {/* ═══ Danger Zone ═══ */}
        <div className="rounded-2xl border border-destructive/20 bg-destructive/3 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-xs font-semibold uppercase tracking-wider text-destructive">
              {locale === 'pt-PT' ? 'Zona Perigosa' : 'Danger Zone'}
            </span>
          </div>
          {isAuthenticated && (
            <div className="flex items-center justify-between">
              <span className="text-sm">{locale === 'pt-PT' ? 'Terminar sessão' : 'Sign out'}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 h-8">
                <LogOut className="h-3.5 w-3.5" /> {locale === 'pt-PT' ? 'Sair' : 'Sign out'}
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm">{locale === 'pt-PT' ? 'Reiniciar dados' : 'Reset data'}</span>
            <Button variant="destructive" size="sm" onClick={() => setShowResetDialog(true)} className="gap-1.5 h-8">
              <Trash2 className="h-3.5 w-3.5" /> {locale === 'pt-PT' ? 'Selecionar' : 'Select'}
            </Button>
          </div>
          {isAuthenticated && (
            <div className="flex items-start justify-between gap-3 pt-1 border-t border-destructive/15">
              <div className="pt-3">
                <p className="text-sm">{locale === 'pt-PT' ? 'Eliminar todos os dados' : 'Delete all data'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {locale === 'pt-PT'
                    ? 'Apaga permanentemente todo o registo associado à tua conta.'
                    : 'Permanently erases every record linked to your account.'}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDeleteConfirm(""); setShowDeleteAll(true); }}
                className="gap-1.5 h-8 mt-3 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" /> {locale === 'pt-PT' ? 'Eliminar' : 'Delete'}
              </Button>
            </div>
          )}
        </div>

      </main>

      <ResetAppDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleResetAllData}
        isLoading={isResetting}
        locale={locale}
        counts={{
          habits: state.habits.length + state.dailyLogs.length,
          calendar: state.dailyLogs.length + state.trackerEntries.length + state.sleepEntries.length,
          nutrition: (() => {
            let n = 0;
            ['become_nutrition_profile','become_meal_plan','nutritionProfile','mealPlan','become:nutrition:profile','become:nutrition:plan']
              .forEach(k => { if (localStorage.getItem(k)) n++; });
            return n;
          })(),
          shopping: state.shoppingItems.length,
          reflections: state.reflections.length + state.futureSelf.length,
          achievements: state.gamification.conquistas.length + (state.gamification.pontos > 0 ? 1 : 0),
        }}
      />
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onUpgrade={upgradeToPro} trialDaysLeft={trialStatus.daysRemaining} />
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} isPro={isPro} onShowPaywall={() => setShowPaywall(true)} />
    </div>
  );
};

export default Perfil;