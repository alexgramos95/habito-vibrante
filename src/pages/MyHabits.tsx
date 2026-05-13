import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Power, ListChecks, Plus } from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Surface } from "@/components/ui/surface";
import { useData } from "@/contexts/DataContext";
import { useI18n } from "@/i18n/I18nContext";
import { updateHabit } from "@/data/storage";
import { sortHabitsByTime } from "@/logic/habitSorting";
import { Habit } from "@/data/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "inactive";

// ─── Temporal grouping ─────────────────────────────────────────────────
// Aligns with the app's temporal identity (Day → Week → Month).
type Bucket = "morning" | "afternoon" | "evening" | "night" | "unscheduled";

const bucketOf = (time?: string): Bucket => {
  if (!time) return "unscheduled";
  const h = parseInt(time.split(":")[0] ?? "0", 10);
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  if (h < 22) return "evening";
  return "night";
};

const BUCKET_ORDER: Bucket[] = ["morning", "afternoon", "evening", "night", "unscheduled"];

const bucketLabel = (b: Bucket, isPT: boolean) => {
  const map = {
    morning:     isPT ? "Manhã"           : "Morning",
    afternoon:   isPT ? "Tarde"           : "Afternoon",
    evening:     isPT ? "Fim de tarde"    : "Evening",
    night:       isPT ? "Noite"           : "Night",
    unscheduled: isPT ? "Sem horário"     : "Unscheduled",
  } as const;
  return map[b];
};

const MyHabits = () => {
  const { state, setState } = useData();
  const { locale } = useI18n();
  const isPT = locale === "pt-PT";

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = state.habits.filter((h) => {
      if (filter === "active" && !h.active) return false;
      if (filter === "inactive" && h.active) return false;
      if (!q) return true;
      return (
        h.nome.toLowerCase().includes(q) ||
        (h.categoria ?? "").toLowerCase().includes(q)
      );
    });
    return sortHabitsByTime(base);
  }, [state.habits, filter, query]);

  // Group by time-of-day bucket (preserves chronological sort within each).
  const grouped = useMemo(() => {
    const map = new Map<Bucket, Habit[]>();
    for (const b of BUCKET_ORDER) map.set(b, []);
    for (const h of filtered) map.get(bucketOf(h.scheduledTime))!.push(h);
    return BUCKET_ORDER
      .map((b) => ({ bucket: b, items: map.get(b)! }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const counts = useMemo(
    () => ({
      all: state.habits.length,
      active: state.habits.filter((h) => h.active).length,
      inactive: state.habits.filter((h) => !h.active).length,
    }),
    [state.habits]
  );

  const toggleActive = (id: string, active: boolean) => {
    setState((prev) => updateHabit(prev, id, { active: !active }));
  };

  // Editorial subtitle — context-aware, neutral, no gamification.
  const subtitle = (() => {
    if (counts.all === 0) {
      return isPT ? "Os teus rituais começam aqui." : "Your rituals begin here.";
    }
    const word = counts.all === 1
      ? (isPT ? "ritual" : "ritual")
      : (isPT ? "rituais" : "rituals");
    return `${counts.all} ${word}`;
  })();

  return (
    <div className="min-h-screen pb-24">
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <PageHeader
          title={isPT ? "Os teus hábitos" : "Your habits"}
          subtitle={subtitle}
          icon={ListChecks}
          backTo
          backLabel={isPT ? "Voltar" : "Back"}
        />

        <div className="space-y-5">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={isPT ? "Procurar por nome ou categoria" : "Search by name or category"}
            className="h-10 rounded-lg bg-secondary/40 border-border/50"
          />

          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList
              className={cn(
                "grid w-full",
                counts.inactive > 0 ? "grid-cols-3" : "grid-cols-2",
              )}
            >
              <TabsTrigger value="all">
                {isPT ? "Todos" : "All"}
                <span className="ml-1.5 text-muted-foreground/70 tabular-nums">{counts.all}</span>
              </TabsTrigger>
              <TabsTrigger value="active">
                {isPT ? "Ativos" : "Active"}
                <span className="ml-1.5 text-muted-foreground/70 tabular-nums">{counts.active}</span>
              </TabsTrigger>
              {counts.inactive > 0 && (
                <TabsTrigger value="inactive">
                  {isPT ? "Inativos" : "Inactive"}
                  <span className="ml-1.5 text-muted-foreground/70 tabular-nums">{counts.inactive}</span>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          {filtered.length === 0 ? (
            <Surface tone="subtle" size="hero" className="text-center">
              <p className="text-sm text-muted-foreground">
                {query
                  ? (isPT ? "Nada corresponde a essa procura." : "Nothing matches that search.")
                  : (isPT ? "Ainda sem rituais por aqui." : "No rituals here yet.")}
              </p>
              {!query && (
                <Link
                  to="/app"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isPT ? "Criar o primeiro" : "Create your first"}
                </Link>
              )}
            </Surface>
          ) : (
            <div className="space-y-7">
              {grouped.map(({ bucket, items }) => (
                <section key={bucket} className="space-y-2">
                  <header className="flex items-baseline justify-between px-1">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
                      {bucketLabel(bucket, isPT)}
                    </h2>
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground/50">
                      {items.length}
                    </span>
                  </header>

                  <ul className="space-y-1.5">
                    {items.map((habit) => (
                      <li key={habit.id}>
                        <HabitRow
                          habit={habit}
                          isPT={isPT}
                          onToggleActive={() => toggleActive(habit.id, habit.active)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {/* Quiet footer CTA — never compete with content */}
              <div className="pt-2 text-center">
                <Link
                  to="/app"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {isPT ? "Adicionar novo hábito" : "Add new habit"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// ─── Single row ────────────────────────────────────────────────────────
interface HabitRowProps {
  habit: Habit;
  isPT: boolean;
  onToggleActive: () => void;
}

const HabitRow = ({ habit, isPT, onToggleActive }: HabitRowProps) => {
  const isMetric = habit.mode === "metric";
  const modeLabel = isMetric
    ? (isPT ? "medida" : "measure")
    : (isPT ? "ritual" : "ritual");

  return (
    <Surface
      tone={habit.active ? "default" : "subtle"}
      size="compact"
      className={cn(
        "flex items-center gap-3 group",
        !habit.active && "opacity-60",
      )}
    >
      <Link
        to={`/app/habit/${habit.id}`}
        className="flex-1 min-w-0 flex items-center gap-3"
      >
        {/* Color rail — quiet identity marker, not an icon block */}
        <span
          aria-hidden
          className="h-9 w-[3px] shrink-0 rounded-full"
          style={{
            backgroundColor: habit.cor || "hsl(var(--primary))",
            opacity: habit.active ? 0.85 : 0.4,
          }}
        />

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-foreground truncate leading-snug">
            {habit.nome}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/80">
            {habit.scheduledTime && (
              <span className="font-mono tabular-nums">{habit.scheduledTime}</span>
            )}
            {habit.scheduledTime && (habit.categoria || modeLabel) && (
              <span aria-hidden className="text-muted-foreground/30">·</span>
            )}
            {habit.categoria && (
              <span className="truncate">{habit.categoria.toLowerCase()}</span>
            )}
            {habit.categoria && (
              <span aria-hidden className="text-muted-foreground/30">·</span>
            )}
            <span className="text-muted-foreground/60">{modeLabel}</span>
          </div>
        </div>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 shrink-0 transition-colors",
          habit.active
            ? "text-muted-foreground/60 hover:text-warning"
            : "text-muted-foreground/40 hover:text-primary",
        )}
        onClick={onToggleActive}
        aria-label={
          habit.active
            ? (isPT ? "Pausar" : "Pause")
            : (isPT ? "Reativar" : "Reactivate")
        }
        title={
          habit.active
            ? (isPT ? "Pausar" : "Pause")
            : (isPT ? "Reativar" : "Reactivate")
        }
      >
        <Power className="h-3.5 w-3.5" />
      </Button>

      <ChevronRight
        aria-hidden
        className="h-4 w-4 text-muted-foreground/30 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground/60"
      />
    </Surface>
  );
};

export default MyHabits;
