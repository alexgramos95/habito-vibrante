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

export const MonthSelector = ({
  year,
  month,
  onPrevious,
  onNext,
  onToday,
}: MonthSelectorProps) => {
  const { t } = useI18n();
  const monthName = t.calendar.months[month];
  const isCurrentMonth =
    new Date().getMonth() === month && new Date().getFullYear() === year;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          className="h-9 w-9 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          className="h-9 w-9 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <h2 className="text-xl font-semibold tracking-tight">
        {monthName} {year}
      </h2>

      <Button
        variant="outline"
        size="sm"
        onClick={onToday}
        disabled={isCurrentMonth}
        className={cn(
          "gap-2 rounded-lg border-border/50",
          isCurrentMonth && "opacity-50"
        )}
      >
        <Calendar className="h-4 w-4" />
        {t.actions.today}
      </Button>
    </div>
  );
};
