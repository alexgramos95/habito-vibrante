import { MonthlySummary } from "@/data/types";
import { getMotivationalMessage } from "@/logic/computations";
import { cn } from "@/lib/utils";

interface MotivationalBannerProps {
  summary: MonthlySummary;
  hasHabits: boolean;
}

export const MotivationalBanner = ({ summary, hasHabits }: MotivationalBannerProps) => {
  const message = getMotivationalMessage(summary, hasHabits);
  
  const isGreat = summary.streakAtual >= 7 || summary.progressoMensal >= 70;
  const isGood = summary.progressoMensal >= 30;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 text-center transition-all duration-500 animate-fade-in shadow-lg",
        isGreat && "border-primary/40 bg-gradient-to-r from-primary/15 to-primary/5 text-primary",
        !isGreat && isGood && "border-success/30 bg-success/10 text-success",
        !isGreat && !isGood && "border-border/50 bg-card text-muted-foreground"
      )}
    >
      <p className="text-lg font-medium">{message}</p>
    </div>
  );
};
