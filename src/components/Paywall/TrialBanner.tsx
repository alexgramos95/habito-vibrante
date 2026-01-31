import { Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";
import { TRIAL_COPY } from "@/config/copy";

interface TrialBannerProps {
  daysRemaining: number;
  hoursRemaining?: number;
  onUpgrade: () => void;
  variant?: 'inline' | 'card';
  className?: string;
}

export const TrialBanner = ({ 
  daysRemaining, 
  hoursRemaining = 0,
  onUpgrade,
  variant = 'inline',
  className,
}: TrialBannerProps) => {
  const { locale } = useI18n();
  const isPT = locale === "pt-PT";
  const lang = isPT ? "pt" : "en";

  if (daysRemaining <= 0 && hoursRemaining <= 0) return null;

  const isUrgent = daysRemaining <= 2;
  const isLastDay = daysRemaining === 1 && hoursRemaining <= 24;

  // Use centralized copy for trial banner
  const bannerText = TRIAL_COPY.banner[lang](daysRemaining);

  if (variant === 'card') {
    return (
      <div className={cn(
        "p-4 rounded-xl border transition-all",
        isUrgent 
          ? "bg-warning/10 border-warning/30" 
          : "bg-primary/5 border-primary/20",
        className
      )}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isUrgent ? "bg-warning/20" : "bg-primary/10"
            )}>
              <Crown className={cn(
                "h-5 w-5",
                isUrgent ? "text-warning" : "text-primary"
              )} />
            </div>
            <div>
              <p className="font-medium">{bannerText}</p>
              {isLastDay && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {TRIAL_COPY.lastDay[lang]}
                </p>
              )}
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={onUpgrade}
            className={cn(
              "gap-1",
              isUrgent && "bg-warning text-warning-foreground hover:bg-warning/90"
            )}
          >
            {isPT ? "Ver planos" : "See plans"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onUpgrade}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105",
        isUrgent 
          ? "bg-warning/20 text-warning border border-warning/30" 
          : "bg-primary/10 text-primary border border-primary/20",
        className
      )}
    >
      <Crown className="h-4 w-4" />
      <span>{bannerText}</span>
    </button>
  );
};
