import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Globe, Sun, Moon, Trophy, Target, Star, TrendingUp,
  PiggyBank, Trash2, AlertTriangle, User, Crown, Copy,
  LogOut, FileText, Shield, Mail, HelpCircle, UserPlus, Settings,
  Camera, ExternalLink, Download
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
import { ResetAppDialog } from "@/components/Profile/ResetAppDialog";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useData } from "@/contexts/DataContext";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { TrialBanner } from "@/components/Paywall/TrialBanner";
import { ExportDialog } from "@/components/Export/ExportDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileEditor } from "@/components/Profile/ProfileEditor";

const Perfil = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, locale, setLocale, currency, setCurrency, formatCurrency } = useI18n();
  const { isAuthenticated, user, signOut } = useAuth();
  const { state, resetAppData } = useData();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const { subscription, trialStatus, isPro, upgradeToPro } = useSubscription();
  const { isDemoMode, enableDemoMode, disableDemoMode } = useDemoMode();
  const [chronotype, setChronotype] = useState<'early' | 'moderate' | 'late'>(() => {
    try { return (localStorage.getItem('become-chronotype') as 'early' | 'moderate' | 'late') || 'moderate'; }
    catch { return 'moderate'; }
  });

  const getDisplayName = () => {
    if (!user) return locale === 'pt-PT' ? 'Visitante' : 'Guest';
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.email) return user.email.split('@')[0];
    return locale === 'pt-PT' ? 'Visitante' : 'Guest';
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
    navigate('/');
  };

  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      await resetAppData();
      toast({ title: "Progress reset." });
      window.location.reload();
    } catch {
      toast({ title: "Reset failed", variant: "destructive" });
    } finally { setIsResetting(false); setShowResetDialog(false); }
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

        {/* ═══ Profile Hero ═══ */}
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {displayName[0]?.toUpperCase() || 'G'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Star className="h-3.5 w-3.5" /> Nível {levelProgress.current}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {activeHabits} hábitos ativos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Page Header ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t.profile.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t.app.tagline}</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl h-9" onClick={() => navigate('/app/settings')}>
            <Settings className="h-3.5 w-3.5" /> {locale === 'pt-PT' ? 'Definições' : 'Settings'}
          </Button>
        </div>

        {/* ═══ Account Card ═══ */}
        {isAuthenticated ? (
          <div className="rounded-2xl border border-border/30 bg-card/50 p-4">
            <ProfileEditor locale={locale} />
          </div>
        ) : (
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

        {/* ═══ Level Progress ═══ */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">{t.profile.levelProgress}</span>
            <span className="text-[10px] text-muted-foreground">{levelProgress.pointsToNext} para nível {levelProgress.nextLevel}</span>
          </div>
          <Progress value={levelProgress.progress} className="h-1.5" />
        </div>

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
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
          <Label className="text-sm font-semibold">{t.settings.title}</Label>
          <div className="space-y-3">
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
          </div>
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
            <span className="text-sm">{locale === 'pt-PT' ? 'Apagar tudo' : 'Delete all data'}</span>
            <Button variant="destructive" size="sm" onClick={() => setShowResetDialog(true)} className="gap-1.5 h-8">
              <Trash2 className="h-3.5 w-3.5" /> {t.actions.reset}
            </Button>
          </div>
        </div>
      </main>

      <ResetAppDialog open={showResetDialog} onOpenChange={setShowResetDialog} onConfirm={handleResetAllData} isLoading={isResetting} />
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onUpgrade={upgradeToPro} trialDaysLeft={trialStatus.daysRemaining} />
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} isPro={isPro} onShowPaywall={() => setShowPaywall(true)} />
    </div>
  );
};

export default Perfil;