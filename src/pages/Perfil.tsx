import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { 
  Globe, Sun, Moon, Trophy, Target, Star, TrendingUp,
  PenLine, Sparkles, PiggyBank, Trash2, AlertTriangle, User,
  Crown, Download, Camera, ExternalLink, LogIn, UserPlus, Copy,
  LogOut, RotateCcw, FileText, Shield, Mail, HelpCircle
} from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/I18nContext";
import { localeNames, currencyNames, type Locale, type Currency } from "@/i18n";
import { AppState, ACHIEVEMENTS } from "@/data/types";
import { loadState, saveState, getLatestFutureSelf, getReflectionForDate, clearAllData } from "@/data/storage";
import { getLevelProgress, calculateTrackerFinancials } from "@/logic/computations";
import { cn } from "@/lib/utils";
import { ResetDataDialog } from "@/components/Profile/ResetDataDialog";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useDemoMode } from "@/hooks/useDemoMode";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { TrialBanner } from "@/components/Paywall/TrialBanner";
import { ExportDialog } from "@/components/Export/ExportDialog";
import { useAuth } from "@/contexts/AuthContext";

const Perfil = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, locale, setLocale, currency, setCurrency, formatCurrency } = useI18n();
  const { isAuthenticated, user, signOut } = useAuth();
  const [state, setState] = useState<AppState>(() => loadState());
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const { subscription, trialStatus, isPro, upgradeToPro } = useSubscription();
  const { isDemoMode, enableDemoMode, disableDemoMode } = useDemoMode();
  const [chronotype, setChronotype] = useState<'early' | 'moderate' | 'late'>(() => {
    try {
      return (localStorage.getItem('become-chronotype') as any) || 'moderate';
    } catch {
      return 'moderate';
    }
  });

  // Get display name with fallback logic
  const getDisplayName = () => {
    if (!user) return locale === 'pt-PT' ? 'Visitante' : 'Guest';
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.email) return user.email.split('@')[0];
    return locale === 'pt-PT' ? 'Visitante' : 'Guest';
  };

  const displayName = getDisplayName();
  const displayEmail = user?.email || (locale === 'pt-PT' ? 'Não autenticado' : 'Not signed in');

  // Handle invite link copy
  const handleCopyInviteLink = async () => {
    const baseUrl = window.location.origin;
    const ref = isAuthenticated && user?.id ? user.id : null;
    const inviteLink = ref ? `${baseUrl}/?ref=${ref}` : baseUrl;

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: locale === 'pt-PT' ? "Link copiado" : "Invite link copied",
        description: locale === 'pt-PT' 
          ? "Cola onde quiseres para convidar alguém para o becoMe." 
          : "Paste it anywhere to invite someone to becoMe.",
      });
    } catch {
      toast({
        title: locale === 'pt-PT' ? "Não foi possível copiar" : "Could not copy link",
        description: inviteLink,
        variant: "destructive",
      });
    }
  };

  // Handle manage billing stub
  const handleManageBilling = () => {
    toast({
      title: locale === 'pt-PT' ? "Gerir faturação" : "Manage billing",
      description: locale === 'pt-PT' 
        ? "Por agora, contacta o suporte para cancelar ou alterar os teus dados de pagamento."
        : "For now, contact support to cancel or change your billing details.",
    });
  };

  // Handle restore purchases stub
  const handleRestorePurchases = () => {
    toast({
      title: locale === 'pt-PT' ? "Restaurar compras" : "Restore purchases",
      description: locale === 'pt-PT' 
        ? "Se subscreveste anteriormente, a tua subscrição será restaurada automaticamente quando iniciares sessão."
        : "If you previously subscribed, your subscription will be restored automatically when you sign in.",
    });
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    toast({
      title: locale === 'pt-PT' ? "Sessão terminada" : "Signed out",
      description: locale === 'pt-PT' 
        ? "Até breve!"
        : "See you soon!",
    });
    navigate('/');
  };

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const levelProgress = getLevelProgress(state.gamification.pontos);
  const trackerFinancials = calculateTrackerFinancials(
    state.trackers || [], 
    state.trackerEntries || [],
    today.getFullYear(),
    today.getMonth()
  );
  
  // Get latest reflection and future self
  const todayReflection = getReflectionForDate(state, todayStr);
  const latestFutureSelf = getLatestFutureSelf(state);
  
  // Investment goals summary
  const activeInvestments = (state.investmentGoals || []).filter(g => !g.completed);
  const completedInvestments = (state.investmentGoals || []).filter(g => g.completed);
  const totalInvested = activeInvestments.reduce((sum, g) => sum + g.currentAmount, 0);

  const unlockedAchievements = ACHIEVEMENTS.filter(a => 
    state.gamification.conquistas.includes(a.id)
  );

  const lockedAchievements = ACHIEVEMENTS.filter(a => 
    !state.gamification.conquistas.includes(a.id)
  );

  const completedGoals = state.purchaseGoals.filter(g => g.completed);

  const handleChronotypeChange = (value: 'early' | 'moderate' | 'late') => {
    setChronotype(value);
    localStorage.setItem('become-chronotype', value);
  };

  const handleResetAllData = () => {
    // Use centralized clearAllData function - clears everything except locale/theme
    clearAllData();
    
    toast({
      title: locale === 'pt-PT' ? "Dados reiniciados" : "Data reset",
      description: locale === 'pt-PT' 
        ? "Todos os dados foram eliminados." 
        : "All data has been deleted.",
    });
    
    // Reload page to start fresh
    window.location.reload();
  };

  const chronotypeLabels = {
    early: { icon: Sun, label: t.profile.earlyBird, time: "05:00 - 21:00" },
    moderate: { icon: Sun, label: t.profile.moderate, time: "07:00 - 23:00" },
    late: { icon: Moon, label: t.profile.nightOwl, time: "10:00 - 02:00" },
  };

  const currentChronotype = chronotypeLabels[chronotype];
  const ChronoIcon = currentChronotype.icon;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <PageHeader
          title={t.profile.title}
          subtitle={(t as any).pageSubtitles?.profile || t.app.tagline}
          icon={User}
        >
          <div className="flex items-center gap-3">
            {trialStatus.isActive && (
              <TrialBanner 
                daysRemaining={trialStatus.daysRemaining}
                onUpgrade={() => setShowPaywall(true)}
              />
            )}
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{t.kpis.level} {levelProgress.current}</p>
              <p className="text-xs text-muted-foreground">{levelProgress.pointsToNext} {t.profile.toNextLevel}</p>
            </div>
          </div>
        </PageHeader>

        {/* Account Header */}
        <Card className="glass border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-lg text-primary">
                  {displayName[0]?.toUpperCase() || 'G'}
                </div>
                <div>
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{displayEmail}</p>
                </div>
              </div>
              {isAuthenticated ? (
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                  {locale === 'pt-PT' ? 'Gerir conta' : 'Manage account'}
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate('/auth')} className="gap-2">
                  <LogIn className="h-4 w-4" />
                  {locale === 'pt-PT' ? 'Entrar / Criar conta' : 'Sign in / Create account'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card className={cn(
          "glass border-border/30",
          isPro && subscription.plan === 'pro' && "border-warning/30 bg-warning/5"
        )}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isPro ? "bg-warning/20" : "bg-secondary"
                )}>
                  <Crown className={cn(
                    "h-5 w-5",
                    isPro ? "text-warning" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {subscription.plan === 'pro' 
                        ? `Pro (${subscription.purchasePlan === 'monthly' ? (locale === 'pt-PT' ? 'Mensal' : 'Monthly') : subscription.purchasePlan === 'yearly' ? (locale === 'pt-PT' ? 'Anual' : 'Yearly') : 'Lifetime'}) · ${locale === 'pt-PT' ? 'Ativo' : 'Active'}` 
                        : subscription.plan === 'trial' 
                          ? 'Trial' 
                          : (locale === 'pt-PT' ? 'Plano gratuito' : 'Free plan')}
                    </span>
                  </div>
                  {trialStatus.isActive && (
                    <p className="text-sm text-muted-foreground">
                      {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? (locale === 'pt-PT' ? 'dia restante' : 'day remaining') : (locale === 'pt-PT' ? 'dias restantes' : 'days remaining')}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={isPro ? "default" : "secondary"} className={cn(
                isPro && "bg-warning text-warning-foreground"
              )}>
                {isPro ? (locale === 'pt-PT' ? 'ATIVO' : 'ACTIVE') : 'FREE'}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {locale === 'pt-PT' 
                ? 'Ver ou alterar o teu plano. A faturação é gerida de forma segura pelo Stripe.'
                : 'View or change your plan. Billing is handled securely by Stripe.'}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowPaywall(true)}>
                {locale === 'pt-PT' ? 'Alterar plano' : 'Change plan'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleManageBilling}>
                {locale === 'pt-PT' ? 'Gerir faturação' : 'Manage billing'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleRestorePurchases} className="gap-1">
                <RotateCcw className="h-3 w-3" />
                {locale === 'pt-PT' ? 'Restaurar' : 'Restore'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Level Progress */}
        <Card className="glass border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t.profile.levelProgress}</span>
              <span className="text-sm text-muted-foreground">{state.gamification.pontos} {t.profile.totalPoints.toLowerCase()}</span>
            </div>
            <Progress value={levelProgress.progress} className="h-2" />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{t.kpis.level} {levelProgress.current}</span>
              <span>{t.kpis.level} {levelProgress.current + 1}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="glass border-border/30">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold">{state.gamification.pontos}</p>
              <p className="text-xs text-muted-foreground">{t.profile.totalPoints}</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{state.gamification.currentStreak || 0}</p>
              <p className="text-xs text-muted-foreground">{t.kpis.currentStreak}</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/30">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold">{state.habits.length + (state.trackers?.length || 0)}</p>
              <p className="text-xs text-muted-foreground">{t.profile.totalHabits}</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/30">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(trackerFinancials.accumulatedSavings)}</p>
              <p className="text-xs text-muted-foreground">{t.profile.totalSavings}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Settings */}
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t.settings.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.profile.language}</label>
                <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(localeNames).map(([code, name]) => (
                      <SelectItem key={code} value={code}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.profile.currency}</label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(currencyNames).map(([code, names]) => (
                      <SelectItem key={code} value={code}>{names[locale]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chronotype */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.profile.chronotype}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['early', 'moderate', 'late'] as const).map((type) => {
                    const typeInfo = chronotypeLabels[type];
                    const TypeIcon = typeInfo.icon;
                    return (
                      <Button
                        key={type}
                        variant={chronotype === type ? "default" : "outline"}
                        className={cn(
                          "flex-col h-auto py-3 gap-1",
                          chronotype === type && "ring-2 ring-primary"
                        )}
                        onClick={() => handleChronotypeChange(type)}
                      >
                        <TypeIcon className="h-4 w-4" />
                        <span className="text-xs">{typeInfo.label}</span>
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {currentChronotype.time}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                {t.profile.achievements} ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unlockedAchievements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t.progress.noAchievements}
                </p>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {unlockedAchievements.map(achievement => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20"
                    >
                      <span className="text-xl">{achievement.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-primary truncate">
                          {t.achievements[achievement.id]?.name || achievement.nome}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.achievements[achievement.id]?.description || achievement.descricao}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {lockedAchievements.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-2">{t.profile.nextAchievements}</p>
                  <div className="flex flex-wrap gap-1">
                    {lockedAchievements.slice(0, 4).map(a => (
                      <Badge key={a.id} variant="outline" className="text-xs opacity-50">
                        {a.icon}
                      </Badge>
                    ))}
                    {lockedAchievements.length > 4 && (
                      <Badge variant="outline" className="text-xs opacity-50">
                        +{lockedAchievements.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Module Summaries */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Reflection Summary */}
          <Card className="glass border-border/30 group hover:glow-subtle transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded-lg bg-accent/10">
                  <PenLine className="h-4 w-4 text-accent" />
                </div>
                {t.reflection.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayReflection ? (
                <div className="space-y-2">
                  <p className="text-sm line-clamp-2 text-muted-foreground">{todayReflection.text}</p>
                  <Badge variant="outline" className="text-xs">
                    {todayReflection.mood === 'positive' ? '😊' : todayReflection.mood === 'challenging' ? '💪' : '😐'}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.reflection.noReflectionToday}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {state.reflections?.length || 0} {t.reflection.totalReflections}
              </p>
            </CardContent>
          </Card>

          {/* Future Self Summary */}
          <Card className="glass border-border/30 group hover:glow-subtle transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                {t.futureSelf.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestFutureSelf ? (
                <div className="space-y-2">
                  <p className="text-sm line-clamp-2 text-muted-foreground">{latestFutureSelf.narrative}</p>
                  <div className="flex flex-wrap gap-1">
                    {latestFutureSelf.themes.slice(0, 3).map((theme, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{theme}</Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.futureSelf.noEntry}</p>
              )}
            </CardContent>
          </Card>

          {/* Investment Goals Summary */}
          <Card className="glass border-border/30 group hover:glow-subtle transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <PiggyBank className="h-4 w-4 text-success" />
                </div>
                {t.investments.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.investments.activeGoals}</span>
                  <span className="font-medium">{activeInvestments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.investments.totalInvested}</span>
                  <span className="font-medium text-success">{formatCurrency(totalInvested)}</span>
                </div>
                {completedInvestments.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t.investments.completedGoals}</span>
                    <span className="font-medium">{completedInvestments.length}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-success" />
                {t.profile.completedGoals} ({completedGoals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {completedGoals.map(goal => (
                  <div
                    key={goal.id}
                    className="p-4 rounded-xl bg-success/5 border border-success/20"
                  >
                    <p className="font-medium">{goal.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(goal.valorAlvo)}
                    </p>
                    {goal.purchaseDetails && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {goal.purchaseDetails.loja} · {goal.purchaseDetails.data}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Data */}
        <Card className="glass border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Export Data</p>
                  <p className="text-sm text-muted-foreground">Download your progress (CSV/PDF)</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowExport(true)}
                className="gap-2"
              >
                {!isPro && <Crown className="h-4 w-4 text-warning" />}
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Screenshot/Demo Mode Card - Only shown when VITE_ENABLE_SCREENSHOT_MODE is enabled */}
        {import.meta.env.VITE_ENABLE_SCREENSHOT_MODE === 'true' && (
          <>
            <Card className="glass border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Camera className="h-5 w-5 text-primary" />
                  {locale === 'pt-PT' ? "Modo Screenshot" : "Screenshot Mode"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {locale === 'pt-PT' ? "Dados de demonstração" : "Demo data"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {locale === 'pt-PT' 
                        ? "Carrega dados fictícios para screenshots e marketing" 
                        : "Load sample data for screenshots and marketing"}
                    </p>
                  </div>
                  <Switch
                    checked={isDemoMode}
                    onCheckedChange={(checked) => {
                      if (checked) enableDemoMode();
                      else disableDemoMode();
                    }}
                  />
                </div>
                {isDemoMode && (
                  <Badge variant="outline" className="text-warning border-warning/50">
                    {locale === 'pt-PT' ? "Modo demo ativo" : "Demo mode active"}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Links - Also dev-only */}
            <Card className="glass border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <ExternalLink className="h-5 w-5" />
                  {locale === 'pt-PT' ? "Links" : "Links"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <a href="/landing" target="_blank">
                    <ExternalLink className="h-4 w-4" />
                    {locale === 'pt-PT' ? "Ver Landing Page" : "View Landing Page"}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Invite Others */}
        <Card className="glass border-border/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{locale === 'pt-PT' ? 'Convidar outros' : 'Invite others'}</p>
                <p className="text-sm text-muted-foreground">
                  {locale === 'pt-PT' 
                    ? 'Partilha o becoMe com pessoas que valorizam disciplina tanto quanto tu.'
                    : 'Share becoMe with people who care about discipline as much as you do.'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Button onClick={handleCopyInviteLink} className="w-full gap-2">
              <Copy className="h-4 w-4" />
              {locale === 'pt-PT' ? 'Copiar link de convite' : 'Copy invite link'}
            </Button>
          </CardContent>
        </Card>

        {/* Legal & Support */}
        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <HelpCircle className="h-5 w-5" />
              {locale === 'pt-PT' ? 'Legal e Suporte' : 'Legal & Support'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <a href="/terms">
                <FileText className="h-4 w-4" />
                {locale === 'pt-PT' ? 'Termos de Serviço' : 'Terms of Service'}
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <a href="/privacy">
                <Shield className="h-4 w-4" />
                {locale === 'pt-PT' ? 'Política de Privacidade' : 'Privacy Policy'}
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <a href="mailto:support@become.app">
                <Mail className="h-4 w-4" />
                {locale === 'pt-PT' ? 'Contactar Suporte' : 'Contact Support'}
              </a>
            </Button>
            <div className="pt-3 mt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground space-y-1">
                <span className="block">
                  {locale === 'pt-PT' 
                    ? '• As subscrições mensais e anuais renovam automaticamente até serem canceladas.'
                    : '• Monthly and yearly subscriptions auto-renew until cancelled.'}
                </span>
                <span className="block">
                  {locale === 'pt-PT'
                    ? '• Podes cancelar a qualquer momento. O acesso continua até ao fim do período pago.'
                    : '• Cancel anytime. Access continues until the end of your billing period.'}
                </span>
                <span className="block">
                  {locale === 'pt-PT'
                    ? '• O plano Mensal inclui um período experimental de 2 dias.'
                    : '• The Monthly plan includes a 2-day free trial.'}
                </span>
                <span className="block">
                  {locale === 'pt-PT'
                    ? '• Funcionalidades PRO requerem subscrição ativa.'
                    : '• PRO features require an active subscription.'}
                </span>
                <span className="block">
                  {locale === 'pt-PT'
                    ? '• Os reembolsos são processados de acordo com as políticas da Stripe/App Store/Play Store.'
                    : '• Refunds are processed according to Stripe/App Store/Play Store policies.'}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="glass border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {locale === 'pt-PT' ? "Zona Perigosa" : "Danger Zone"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logout */}
            {isAuthenticated && (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{locale === 'pt-PT' ? 'Terminar sessão' : 'Sign out'}</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'pt-PT' 
                      ? "Os teus dados locais serão mantidos neste dispositivo." 
                      : "Your local data will be kept on this device."}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="shrink-0 gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {locale === 'pt-PT' ? 'Sair' : 'Sign out'}
                </Button>
              </div>
            )}
            
            {/* Reset Data */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{t.settings.resetData}</p>
                <p className="text-sm text-muted-foreground">
                  {locale === 'pt-PT' 
                    ? "Elimina todos os hábitos, trackers, finanças, compras, conquistas e reflexões." 
                    : "Deletes all habits, trackers, finances, shopping, achievements, and reflections."}
                </p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowResetDialog(true)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.actions.reset}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Reset Dialog */}
      <ResetDataDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleResetAllData}
      />

      {/* Paywall */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={upgradeToPro}
        trialDaysLeft={trialStatus.daysRemaining}
      />

      {/* Export */}
      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        isPro={isPro}
        onShowPaywall={() => setShowPaywall(true)}
      />
    </div>
  );
};

export default Perfil;
