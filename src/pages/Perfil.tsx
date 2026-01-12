import { useState } from "react";
import { format } from "date-fns";
import { 
  Globe, Sun, Moon, Trophy, Target, Star, TrendingUp,
  PenLine, Sparkles, PiggyBank, Trash2, AlertTriangle, User
} from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";
import { localeNames, currencyNames, type Locale, type Currency } from "@/i18n";
import { AppState, ACHIEVEMENTS } from "@/data/types";
import { loadState, saveState, getLatestFutureSelf, getReflectionForDate, clearAllData } from "@/data/storage";
import { getLevelProgress, calculateTrackerFinancials } from "@/logic/computations";
import { cn } from "@/lib/utils";
import { ResetDataDialog } from "@/components/Profile/ResetDataDialog";
import { useToast } from "@/hooks/use-toast";

const Perfil = () => {
  const { toast } = useToast();
  const { t, locale, setLocale, currency, setCurrency, formatCurrency } = useI18n();
  const [state, setState] = useState<AppState>(() => loadState());
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [chronotype, setChronotype] = useState<'early' | 'moderate' | 'late'>(() => {
    try {
      return (localStorage.getItem('become-chronotype') as any) || 'moderate';
    } catch {
      return 'moderate';
    }
  });

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
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{t.kpis.level} {levelProgress.current}</p>
            <p className="text-xs text-muted-foreground">{levelProgress.pointsToNext} {t.profile.toNextLevel}</p>
          </div>
        </PageHeader>

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

        {/* Danger Zone - Reset */}
        <Card className="glass border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {locale === 'pt-PT' ? "Zona Perigosa" : "Danger Zone"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
    </div>
  );
};

export default Perfil;
