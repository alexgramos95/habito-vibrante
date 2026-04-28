import { format, getDay, isToday, startOfWeek, addDays } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { Plus, Settings2, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Habit, Tracker, TrackerEntry } from "@/data/types";
import { isHabitDoneOnDate, isHabitLateOnDate } from "@/data/storage";
import { MinimalHabitCard } from "@/components/Habits/MinimalHabitCard";
import { GatedOverlay } from "@/components/Premium/GatedOverlay";
import { useSubscription } from "@/hooks/useSubscription";

interface DayViewProps {
  state: AppState;
  selectedDate: Date;
  onToggleHabit: (habitId: string) => void;
  onAddHabit: () => void;
}

// Directive copy (Life Reset tone, PT direto)
const getDirective = (date: Date, locale: string): { label: string; title: string; subtitle: string } => {
  const hour = new Date().getHours();
  const dayOfWeek = getDay(date);

  if (locale === 'pt-PT') {
    if (hour < 12) {
      const titles = ['Ativar Sistema', 'Override Matinal', 'Iniciar Protocolo', 'Calibrar Foco'];
      return {
        label: 'DIRETIVA_MATINAL',
        title: titles[dayOfWeek % titles.length],
        subtitle: 'Executa a primeira ação. Sem hesitação. Sem negociação.',
      };
    }
    if (hour < 18) {
      const titles = ['Manter Cadência', 'Sustentar Pressão', 'Override Tarde', 'Recalibrar'];
      return {
        label: 'DIRETIVA_ATIVA',
        title: titles[dayOfWeek % titles.length],
        subtitle: 'Sistema em operação. Cumpre as ações pendentes antes do reset.',
      };
    }
    const titles = ['Encerrar Ciclo', 'Power Down', 'Auditar Dia', 'Sincronizar'];
    return {
      label: 'DIRETIVA_NOTURNA',
      title: titles[dayOfWeek % titles.length],
      subtitle: 'Fecha as últimas ações. Reflete antes do próximo ciclo.',
    };
  }

  if (hour < 12) {
    return { label: 'MORNING_DIRECTIVE', title: 'Activate System', subtitle: 'Execute first action. No hesitation. No negotiation.' };
  }
  if (hour < 18) {
    return { label: 'ACTIVE_DIRECTIVE', title: 'Sustain Cadence', subtitle: 'System operational. Complete pending actions before reset.' };
  }
  return { label: 'NIGHT_DIRECTIVE', title: 'Close Cycle', subtitle: 'Finish remaining actions. Reflect before next cycle.' };
};

const getHabitsForDay = (habits: Habit[], date: Date): Habit[] => {
  const dayOfWeek = getDay(date);
  const filtered = habits.filter(habit => {
    if (!habit.active) return false;
    if (!habit.scheduledDays || habit.scheduledDays.length === 0) return true;
    return habit.scheduledDays.includes(dayOfWeek);
  });
  return filtered.sort((a, b) => {
    if (!a.scheduledTime && !b.scheduledTime) return 0;
    if (!a.scheduledTime) return 1;
    if (!b.scheduledTime) return -1;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
};

export const DayView = ({
  state,
  selectedDate,
  onToggleHabit,
  onAddHabit,
}: DayViewProps) => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { isPro, getLimits } = useSubscription();
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dateLocale = locale === 'pt-PT' ? pt : enUS;

  const habitsForDay = getHabitsForDay(state.habits, selectedDate);
  const activeHabits = state.habits.filter(h => h.active);
  const activeTrackers = (state.trackers || []).filter(t => t.active);
  const limits = getLimits();
  const canAddHabit = isPro || habitsForDay.filter(h => h.active).length < (limits.maxHabits as number);

  const dateLabel = format(selectedDate, locale === 'pt-PT' ? "EEEE, d 'de' MMMM" : "EEEE, MMMM d", { locale: dateLocale });
  const formattedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  const directive = getDirective(selectedDate, locale);
  const gam = state.gamification;
  const completedToday = habitsForDay.filter(h => isHabitDoneOnDate(state, h.id, dateStr)).length;
  const totalToday = habitsForDay.length;
  const completionPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  // Pick the "priority" habit = first scheduled, not done
  const priorityHabit = habitsForDay.find(h => !isHabitDoneOnDate(state, h.id, dateStr)) || habitsForDay[0];

  // Emotional momentum copy — replaces robotic "X/Y · Z%"
  const momentumCopy = (() => {
    if (totalToday === 0) return locale === 'pt-PT' ? 'Dia em aberto.' : 'Day wide open.';
    if (completedToday === 0) return locale === 'pt-PT' ? 'Primeiro passo conta.' : 'First step counts.';
    if (completedToday === totalToday) return locale === 'pt-PT' ? 'Dia completo. Bem feito.' : 'Full day. Well done.';
    if (completionPct >= 75) return locale === 'pt-PT' ? 'Quase lá. Mantém o ritmo.' : 'Almost there. Keep the rhythm.';
    if (completionPct >= 50) return locale === 'pt-PT' ? 'A construir momentum.' : "You're building momentum.";
    return completedToday === 1
      ? (locale === 'pt-PT' ? 'Bom arranque. 1 vitória.' : 'Strong start. 1 win today.')
      : (locale === 'pt-PT' ? `Bom arranque. ${completedToday} vitórias.` : `Strong start. ${completedToday} wins today.`);
  })();

  return (
    <div className="space-y-10 animate-page-enter">
      {/* Operator Telemetry Header */}
      <header className="space-y-6 border-b border-foreground/10 pb-7">
        <div className="flex items-center gap-3">
          <span className="size-2 bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
          <span className="type-eyebrow text-primary text-[10px]">
            {locale === 'pt-PT' ? 'SISTEMA ATIVO' : 'SYSTEM ACTIVE'} · {formattedDate.toUpperCase()}
          </span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <h1 className="type-display text-5xl md:text-6xl">
            {locale === 'pt-PT' ? 'NÍVEL ' : 'LEVEL '}
            <span className="text-primary glow-toxic tabular-nums inline-block animate-xp-pulse" key={gam.nivel}>
              {gam.nivel}
            </span>
          </h1>
          <div className="text-right">
            <div className="type-eyebrow text-muted-foreground/60 text-[10px]">
              {locale === 'pt-PT' ? 'STREAK' : 'STREAK'}
            </div>
            <div className="type-display text-3xl text-accent glow-ultra tabular-nums">
              {gam.currentStreak ?? 0}<span className="text-sm text-muted-foreground/60 ml-1 not-italic">D</span>
            </div>
          </div>
        </div>

        {/* Momentum bar — emotional, smooth */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-foreground tracking-tight">{momentumCopy}</span>
            <span className="type-eyebrow text-muted-foreground/60 text-[10px] tabular-nums">{completedToday}/{totalToday}</span>
          </div>
          <div className="h-1.5 bg-foreground/[0.06] relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_0_12px_hsl(var(--neon-toxic)/0.7)]"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Directive — Main Mission */}
      {priorityHabit && (
        <section className="relative">
          <div className="absolute -top-3 left-4 bg-background px-2 z-10">
            <span className="mono-label text-primary text-[10px]">{directive.label}</span>
          </div>
          <div className="directive-box p-6 md:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <span className="inline-block bg-primary text-primary-foreground px-2 py-0.5 mono-label text-[10px]">
                  {locale === 'pt-PT' ? 'PRIORIDADE' : 'PRIORITY'}
                </span>
                <h2 className="display-headline text-3xl md:text-4xl text-foreground">
                  {priorityHabit.nome}
                </h2>
                <p className="text-sm text-muted-foreground max-w-[36ch]">
                  {directive.subtitle}
                </p>
              </div>
              <Zap className="h-8 w-8 text-primary shrink-0 drop-shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
            </div>

            <Button
              onClick={() => onToggleHabit(priorityHabit.id)}
              size="xl"
              className="w-full"
              disabled={isHabitDoneOnDate(state, priorityHabit.id, dateStr)}
            >
              {isHabitDoneOnDate(state, priorityHabit.id, dateStr)
                ? (locale === 'pt-PT' ? 'EXECUTADO ✓' : 'EXECUTED ✓')
                : (locale === 'pt-PT' ? 'EXECUTAR PROTOCOLO' : 'EXECUTE PROTOCOL')}
            </Button>
          </div>
        </section>
      )}

      {/* Subsystems — secondary habits */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <span className="mono-label text-muted-foreground/60 text-[10px] whitespace-nowrap">
              {locale === 'pt-PT' ? 'SUBSISTEMAS' : 'SUBSYSTEMS'}
            </span>
            <div className="h-px flex-1 bg-foreground/10" />
          </div>
          <div className="flex items-center gap-1">
            <Link to="/app">
              <Button size="icon" variant="ghost">
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
            {canAddHabit && (
              <Button onClick={onAddHabit} size="icon" variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {habitsForDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-foreground/10 bg-card/30 py-16 text-center">
            <p className="mono-label text-muted-foreground/60 mb-4">
              {locale === 'pt-PT' ? 'SEM PROTOCOLOS PARA HOJE' : 'NO PROTOCOLS FOR TODAY'}
            </p>
            <Button onClick={onAddHabit} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {t.habits.add}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {habitsForDay.map((habit, idx) => (
              <MinimalHabitCard
                key={habit.id}
                habit={habit}
                index={idx}
                isDone={isHabitDoneOnDate(state, habit.id, dateStr)}
                isLate={isHabitLateOnDate(state, habit.id, dateStr)}
                onToggle={() => onToggleHabit(habit.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Week Rhythm */}
      {activeHabits.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="mono-label text-muted-foreground/60 text-[10px]">
              {locale === 'pt-PT' ? 'CADÊNCIA_SEMANAL' : 'WEEK_CADENCE'}
            </span>
            <div className="h-px flex-1 bg-foreground/10" />
          </div>

          {isPro ? (
            <WeekRhythmPreview state={state} selectedDate={selectedDate} locale={locale} />
          ) : (
            <GatedOverlay feature={locale === 'pt-PT' ? 'Cadência semanal' : 'Weekly cadence'}>
              <WeekRhythmPreview state={state} selectedDate={selectedDate} locale={locale} />
            </GatedOverlay>
          )}
        </section>
      )}

      {/* Trackers */}
      {activeTrackers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <span className="mono-label text-accent/80 text-[10px]">
                {locale === 'pt-PT' ? 'MÉTRICAS' : 'METRICS'}
              </span>
              <div className="h-px flex-1 bg-foreground/10" />
            </div>
            <Link to="/app/trackers">
              <Button size="icon" variant="ghost">
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isPro ? (
            <div className="grid gap-2">
              {activeTrackers.slice(0, 4).map((tracker) => (
                <TrackerMiniCard
                  key={tracker.id}
                  tracker={tracker}
                  entries={state.trackerEntries || []}
                  onClick={() => navigate('/app/trackers')}
                />
              ))}
            </div>
          ) : (
            <GatedOverlay feature="Trackers">
              <div className="grid gap-2">
                {activeTrackers.slice(0, 2).map((tracker) => (
                  <TrackerMiniCard
                    key={tracker.id}
                    tracker={tracker}
                    entries={state.trackerEntries || []}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </GatedOverlay>
          )}
        </section>
      )}
    </div>
  );
};

const WeekRhythmPreview = ({
  state,
  selectedDate,
  locale,
}: {
  state: AppState;
  selectedDate: Date;
  locale: string;
}) => {
  const dateLocale = locale === 'pt-PT' ? pt : enUS;
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const activeHabits = state.habits.filter(h => h.active);
  const today = new Date();

  return (
    <div className="p-5 bg-card/50 border border-foreground/10">
      <div className="flex justify-between mb-5">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="flex flex-col items-center">
            <span className="mono-label text-[9px] text-muted-foreground/50">
              {format(day, "EEE", { locale: dateLocale }).slice(0, 1)}
            </span>
            <span className={cn(
              "text-xs font-bold mt-1 w-7 h-7 flex items-center justify-center transition-colors tabular-nums",
              isToday(day) && "bg-primary text-primary-foreground shadow-[0_0_8px_hsl(var(--neon-toxic)/0.6)]",
            )}>
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {activeHabits.slice(0, 4).map((habit) => (
          <div key={habit.id} className="flex items-center gap-4">
            <div
              className="w-1.5 h-1.5 shrink-0"
              style={{ backgroundColor: habit.cor || "hsl(var(--primary))" }}
            />
            <div className="flex-1 flex justify-between">
              {weekDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isDone = isHabitDoneOnDate(state, habit.id, dateStr);
                const isFuture = day > today;
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "w-2.5 h-2.5 transition-all duration-200",
                      isFuture
                        ? "bg-foreground/5"
                        : isDone
                          ? "scale-110"
                          : "bg-foreground/10",
                    )}
                    style={isDone ? {
                      backgroundColor: habit.cor || "hsl(var(--neon-toxic))",
                      boxShadow: `0 0 6px ${habit.cor || "hsl(var(--neon-toxic))"}`,
                    } : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {activeHabits.length > 4 && (
        <p className="mono-label text-[9px] text-muted-foreground/50 text-center mt-4">
          +{activeHabits.length - 4} {locale === 'pt-PT' ? 'MAIS' : 'MORE'}
        </p>
      )}
    </div>
  );
};

const TrackerMiniCard = ({
  tracker,
  entries,
  onClick,
}: {
  tracker: Tracker;
  entries: TrackerEntry[];
  onClick: () => void;
}) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter(e => e.trackerId === tracker.id && e.date === today);
  const todayCount = todayEntries.reduce((sum, e) => sum + e.quantity, 0);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-card border border-foreground/10 hover:border-accent/50 transition-colors text-left w-full"
    >
      <div className="text-2xl">{tracker.icon || '📊'}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold uppercase tracking-tight text-sm truncate">{tracker.name}</p>
        <p className="mono-label text-[10px] text-muted-foreground/70 mt-0.5">
          {todayCount > 0
            ? `${todayCount} ${todayCount === 1 ? tracker.unitSingular : tracker.unitPlural}`.toUpperCase()
            : '— SEM REGISTO'}
        </p>
      </div>
      <span className="mono-label text-accent text-[10px]">+</span>
    </button>
  );
};
