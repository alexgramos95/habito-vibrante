import { useMemo } from "react";
import { Lightbulb } from "lucide-react";

interface HabitCoachTipProps {
  habitName: string;
  mode: "simple" | "metric";
  completionRate7d: number; // 0-1
  currentStreak: number;
  isDoneToday: boolean;
  type?: string; // "reduce" | "increase"
}

/**
 * Contextual micro-tip for a single habit.
 * Rule-based, instant, no API call.
 */
function getTip(props: HabitCoachTipProps): string | null {
  const { habitName, mode, completionRate7d, currentStreak, isDoneToday, type } = props;
  const rate = Math.round(completionRate7d * 100);

  // Done today — positive reinforcement
  if (isDoneToday) {
    if (currentStreak >= 21) return "Isto já faz parte de quem és. Continua.";
    if (currentStreak >= 7) return `${currentStreak} dias seguidos — o teu cérebro está a adaptar-se.`;
    if (rate >= 80) return "Consistência forte. Estás a construir identidade.";
    return null; // No tip if done and no special context
  }

  // Not done today
  if (rate < 30) {
    if (mode === "metric" && type === "reduce") {
      return "Tenta reduzir só um pouco hoje. Progresso > perfeição.";
    }
    return "Começa com a versão mais fácil deste hábito. Só 2 minutos.";
  }

  if (rate < 50) {
    return "Associa isto a algo que já fazes todos os dias.";
  }

  if (rate < 70) {
    return "Estás quase na zona de consistência. Hoje conta.";
  }

  if (rate >= 70 && rate < 90) {
    return "Bom ritmo — não quebres a cadeia.";
  }

  return null;
}

export const HabitCoachTip = (props: HabitCoachTipProps) => {
  const tip = useMemo(() => getTip(props), [props.completionRate7d, props.currentStreak, props.isDoneToday, props.mode, props.type]);

  if (!tip) return null;

  return (
    <div className="flex items-start gap-2 mt-1.5 px-0.5">
      <Lightbulb className="h-3 w-3 text-accent/60 shrink-0 mt-0.5" />
      <p className="text-[11px] leading-relaxed text-muted-foreground/80 italic">{tip}</p>
    </div>
  );
};
