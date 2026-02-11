import { useState, useEffect, useMemo, useCallback } from "react";
import { Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface HabitData {
  name: string;
  mode: "simple" | "metric";
  completionRate7d: number; // 0-1
}

interface CoachData {
  habits: HabitData[];
  currentStreak: number;
  todayProgress: number; // 0-1
}

// --- Rule-based tips (instant, always available) ---
function getLocalTip(data: CoachData): string {
  const { habits, currentStreak, todayProgress } = data;
  if (habits.length === 0) return "Cria o teu primeiro hábito. Começa pequeno — um é suficiente.";

  const struggling = habits.filter(h => h.completionRate7d < 0.4);
  const strong = habits.filter(h => h.completionRate7d >= 0.8);

  if (todayProgress >= 1) {
    return "Dia completo! 🎉 Cada dia assim reforça quem estás a tornar-te.";
  }
  if (currentStreak >= 30) {
    return `${currentStreak} dias seguidos. Isto já não é motivação — é identidade. Estás a provar quem és.`;
  }
  if (currentStreak >= 21) {
    return "21+ dias! A neurociência confirma: o teu cérebro está a reconfigurar-se. Continua.";
  }
  if (currentStreak >= 7) {
    return "Uma semana sólida! O segredo não é motivação — é presença diária. Estás no caminho.";
  }
  if (struggling.length > 0 && strong.length > 0) {
    return `"${strong[0].name}" é o teu ponto forte. Experimenta fazer "${struggling[0].name}" logo a seguir.`;
  }
  if (struggling.length > 0) {
    return `"${struggling[0].name}" precisa de atenção. Torna-o mais fácil: reduz a barreira de entrada.`;
  }
  if (todayProgress > 0 && todayProgress < 0.5) {
    return "Já começaste — isso é o mais difícil. Foca-te no próximo hábito, não em todos.";
  }
  if (todayProgress >= 0.5 && todayProgress < 1) {
    return "Mais de metade feito! O momentum está do teu lado. Não pares agora.";
  }
  if (strong.length === habits.length) {
    return "Consistência exemplar! Estás pronto para adicionar um novo desafio?";
  }
  return "A mudança acontece nos dias difíceis. Mesmo marcar 1 hábito já é vitória.";
}

// --- AI tip cache ---
const CACHE_KEY = "habit-coach-ai-tip";
function getCachedAITip(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { date, tip } = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return date === today ? tip : null;
  } catch { return null; }
}
function setCachedAITip(tip: string) {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, tip }));
}

export const HabitCoachCard = ({ coachData }: { coachData: CoachData }) => {
  const localTip = useMemo(() => getLocalTip(coachData), [coachData]);
  const [aiTip, setAiTip] = useState<string | null>(getCachedAITip());
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const fetchAITip = useCallback(async () => {
    if (coachData.habits.length < 2) return; // Need enough data for AI
    setIsLoadingAI(true);
    try {
      const summary = coachData.habits.map(h =>
        `${h.name} (${h.mode}): ${Math.round(h.completionRate7d * 100)}% últimos 7 dias`
      ).join("\n");

      const { data, error } = await supabase.functions.invoke("habit-coach", {
        body: {
          summary,
          streak: coachData.currentStreak,
          todayProgress: Math.round(coachData.todayProgress * 100),
        },
      });

      if (!error && data?.tip) {
        setAiTip(data.tip);
        setCachedAITip(data.tip);
      }
    } catch (e) {
      console.error("[Coach] AI tip error:", e);
    } finally {
      setIsLoadingAI(false);
    }
  }, [coachData]);

  // Auto-fetch AI tip once per day
  useEffect(() => {
    if (!getCachedAITip() && coachData.habits.length >= 2) {
      fetchAITip();
    }
  }, []); // Only on mount

  const displayTip = aiTip || localTip;

  return (
    <div className="rounded-2xl border border-accent/15 bg-gradient-to-br from-accent/4 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent/70">
              {aiTip ? "Coach IA" : "Insight"}
            </span>
            {aiTip && <Sparkles className="h-3 w-3 text-accent/50" />}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{displayTip}</p>
        </div>
        {coachData.habits.length >= 2 && (
          <button
            onClick={fetchAITip}
            disabled={isLoadingAI}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-accent hover:bg-accent/10 transition-colors shrink-0"
            title="Novo insight"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingAI && "animate-spin")} />
          </button>
        )}
      </div>
    </div>
  );
};
