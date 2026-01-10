import { MonthlySummary } from "@/data/types";
import { getMotivationalMessage } from "@/logic/computations";
import { cn } from "@/lib/utils";

interface MotivationalBannerProps {
  summary: MonthlySummary;
}

export const MotivationalBanner = ({ summary }: MotivationalBannerProps) => {
  const message = getMotivationalMessage(summary);
  
  const isGreat = summary.streakAtual >= 7 || summary.progressoMensal >= 80;
  const isGood = summary.progressoMensal >= 50;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-center transition-all duration-500 animate-fade-in",
        isGreat && "border-primary/30 bg-primary/10 text-primary",
        !isGreat && isGood && "border-success/30 bg-success/10 text-success",
        !isGreat && !isGood && "border-border/50 bg-secondary/50 text-muted-foreground"
      )}
    >
      <p className="text-lg font-medium">{message}</p>
    </div>
  );
};
