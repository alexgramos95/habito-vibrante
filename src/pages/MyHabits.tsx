import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Pencil, Power, Search, ListChecks } from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/contexts/DataContext";
import { useI18n } from "@/i18n/I18nContext";
import { updateHabit } from "@/data/storage";
import { sortHabitsByTime } from "@/logic/habitSorting";
import { getLevelProgress } from "@/logic/computations";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "inactive";

const MyHabits = () => {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen pb-24">
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <PageHeader
          title={isPT ? "Meus hábitos" : "My habits"}
          subtitle={`LV.${getLevelProgress(state.gamification?.pontos || 0).current} · ${counts.all} ${counts.all === 1
            ? isPT ? "hábito" : "habit"
            : isPT ? "hábitos" : "habits"}`}
          icon={ListChecks}
          backTo
          backLabel={isPT ? "Voltar" : "Back"}
        />
        <div className="space-y-5">

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isPT ? "Procurar por nome ou categoria" : "Search by name or category"}
            className="pl-9 h-10 rounded-lg bg-secondary/50 border-border"
          />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              {isPT ? "Todos" : "All"} · {counts.all}
            </TabsTrigger>
            <TabsTrigger value="active">
              {isPT ? "Ativos" : "Active"} · {counts.active}
            </TabsTrigger>
            <TabsTrigger value="inactive">
              {isPT ? "Inativos" : "Inactive"} · {counts.inactive}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {filtered.length === 0 ? (
          <Card className="border-dashed border-border/40 bg-card/30">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {isPT ? "Nenhum hábito encontrado." : "No habits found."}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((habit) => (
              <li key={habit.id}>
                <Card className={cn("transition-colors", !habit.active && "opacity-60")}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Link
                      to={`/app/habit/${habit.id}`}
                      className="flex-1 min-w-0 flex items-center gap-3"
                    >
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{
                          backgroundColor: habit.cor
                            ? `${habit.cor}22`
                            : "hsl(var(--secondary))",
                        }}
                      >
                        {habit.icon ?? "•"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {habit.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {habit.categoria && (
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">
                              {habit.categoria}
                            </Badge>
                          )}
                          {habit.scheduledTime && (
                            <span className="text-[11px] text-muted-foreground">
                              {habit.scheduledTime}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {habit.mode === "metric"
                              ? isPT ? "Métrico" : "Metric"
                              : isPT ? "Simples" : "Simple"}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => toggleActive(habit.id, habit.active)}
                      aria-label={habit.active
                        ? isPT ? "Desativar" : "Deactivate"
                        : isPT ? "Ativar" : "Activate"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Link
                      to={`/app/habit/${habit.id}`}
                      aria-label={isPT ? "Editar" : "Edit"}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
        </div>
      </main>
    </div>
  );
};

export default MyHabits;