import { MonthlySummary } from "@/data/types";
import { getMotivationalMessage } from "@/logic/computations";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { Sparkles, TrendingUp, Flame } from "lucide-react";

interface MotivationalBannerProps {
  summary: MonthlySummary;
  hasHabits: boolean;
}

export const MotivationalBanner = ({ summary, hasHabits }: MotivationalBannerProps) => {
  const { t } = useI18n();
  const message = getMotivationalMessage(summary, hasHabits);
  
  const isGreat = summary.streakAtual >= 7 || summary.progressoMensal >= 70;
  const isGood = summary.progressoMensal >= 30;

  const Icon = isGreat ? Flame : isGood ? TrendingUp : Sparkles;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 transition-all duration-500 fade-in",
        "glass border",
        isGreat && "border-primary/30 glow-subtle",
        !isGreat && isGood && "border-success/20",
        !isGreat && !isGood && "border-border/30"
      )}
    >
      {/* Background gradient */}
      {isGreat && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
      )}
      
      <div className="relative z-10 flex items-center gap-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
            isGreat && "bg-primary/15 text-primary",
            !isGreat && isGood && "bg-success/15 text-success",
            !isGreat && !isGood && "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        
        <p
          className={cn(
            "text-base md:text-lg font-medium",
            isGreat && "text-primary",
            !isGreat && isGood && "text-success",
            !isGreat && !isGood && "text-muted-foreground"
          )}
        >
          {message}
        </p>
      </div>
    </div>
  );
};
