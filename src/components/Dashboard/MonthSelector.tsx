import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";

interface MonthSelectorProps {
  year: number;
  month: number;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

/**
 * MonthSelector — Arcade Overdrive
 * Brutal borders, mono labels, neon hover.
 */
export const MonthSelector = ({
  year,
  month,
  onPrevious,
  onNext,
  onToday,
}: MonthSelectorProps) => {
  const { t, locale } = useI18n();
  const monthName = t.calendar.months[month];
  const isCurrentMonth =
    new Date().getMonth() === month && new Date().getFullYear() === year;

  const todayLabel = locale === "pt-PT" ? "HOJE" : "TODAY";

  return (
    <div className="flex items-center justify-between gap-3 border-2 border-foreground/15 bg-card/60 p-2 shadow-[3px_3px_0_0_hsl(var(--neon-ultra)/0.3)]">
      <button
        type="button"
        onClick={onPrevious}
        aria-label={locale === "pt-PT" ? "Mês anterior" : "Previous month"}
        className="flex h-9 w-9 items-center justify-center border border-foreground/20 bg-background/50 text-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
          // CICLO
        </span>
        <h2 className="font-black italic uppercase tracking-tighter text-lg leading-none text-foreground">
          {monthName} <span className="text-primary">{year}</span>
        </h2>
      </div>

      <button
        type="button"
        onClick={onNext}
        aria-label={locale === "pt-PT" ? "Próximo mês" : "Next month"}
        className="flex h-9 w-9 items-center justify-center border border-foreground/20 bg-background/50 text-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onToday}
        disabled={isCurrentMonth}
        className={cn(
          "flex h-9 items-center gap-1.5 border-2 border-primary/50 bg-primary/10 px-3 font-mono text-[10px] font-bold uppercase tracking-widest text-primary transition-all",
          "hover:bg-primary hover:text-primary-foreground hover:shadow-[2px_2px_0_0_hsl(var(--neon-ultra)/0.5)]",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          isCurrentMonth && "cursor-not-allowed opacity-30 hover:bg-primary/10 hover:text-primary hover:shadow-none",
        )}
      >
        <Calendar className="h-3 w-3" />
        {todayLabel}
      </button>
    </div>
  );
};
