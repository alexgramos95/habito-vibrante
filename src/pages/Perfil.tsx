import { useState, useEffect } from "react";
import { User, Globe, Coins, Sun, Moon, Trophy, Target, Star, TrendingUp } from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nContext";
import { localeNames, currencyNames, type Locale, type Currency } from "@/i18n";
import { AppState, ACHIEVEMENTS } from "@/data/types";
import { loadState } from "@/data/storage";
import { getLevelProgress, calculateSavingsSummary } from "@/logic/computations";
import { cn } from "@/lib/utils";

const Perfil = () => {
  const { t, locale, setLocale, currency, setCurrency, formatCurrency } = useI18n();
  const [state] = useState<AppState>(() => loadState());
  const [chronotype, setChronotype] = useState<'diurnal' | 'nocturnal'>(() => {
    try {
      return (localStorage.getItem('itero-chronotype') as any) || 'diurnal';
    } catch {
      return 'diurnal';
    }
  });

  const today = new Date();
  const levelProgress = getLevelProgress(state.gamification.pontos);
  const savingsSummary = calculateSavingsSummary(state, today.getFullYear(), today.getMonth());

  const unlockedAchievements = ACHIEVEMENTS.filter(a => 
    state.gamification.conquistas.includes(a.id)
  );

  const completedGoals = state.purchaseGoals.filter(g => g.completed);

  const handleChronotypeChange = (value: 'diurnal' | 'nocturnal') => {
    setChronotype(value);
    localStorage.setItem('itero-chronotype', value);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
            {t.app.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t.profile.title}</h1>
            <p className="text-sm text-muted-foreground">{t.app.tagline}</p>
          </div>
        </div>

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
              <p className="text-2xl font-bold">{levelProgress.current}</p>
              <p className="text-xs text-muted-foreground">{t.profile.currentLevel}</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/30">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold">{state.habits.length}</p>
              <p className="text-xs text-muted-foreground">{t.profile.totalHabits}</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/30">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(savingsSummary.totalPoupadoAllTime)}</p>
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
                <div className="flex gap-2">
                  <Button
                    variant={chronotype === 'diurnal' ? "default" : "outline"}
                    className="flex-1 gap-2"
                    onClick={() => handleChronotypeChange('diurnal')}
                  >
                    <Sun className="h-4 w-4" />
                    {t.profile.diurnal}
                  </Button>
                  <Button
                    variant={chronotype === 'nocturnal' ? "default" : "outline"}
                    className="flex-1 gap-2"
                    onClick={() => handleChronotypeChange('nocturnal')}
                  >
                    <Moon className="h-4 w-4" />
                    {t.profile.nocturnal}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                {t.profile.achievements} ({unlockedAchievements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unlockedAchievements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t.progress.noAchievements}
                </p>
              ) : (
                <div className="grid gap-2">
                  {unlockedAchievements.map(achievement => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20"
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div>
                        <p className="font-medium text-primary">
                          {t.achievements[achievement.id]?.name || achievement.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.achievements[achievement.id]?.description || achievement.descricao}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
      </main>
    </div>
  );
};

export default Perfil;
