import { Quote } from "lucide-react";
import type { MotivationCard as Card } from "@/data/motivationCards";

interface MotivationCardProps {
  card: Card;
}

/**
 * Daily motivation card — editorial, observational tone.
 * Sits below the Daily Progress Hero on the main dashboard.
 */
export const MotivationCard = ({ card }: MotivationCardProps) => {
  return (
    <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-accent/5 via-card/40 to-primary/5 p-5">
      <div className="flex items-start gap-3">
        <Quote
          aria-hidden
          className="h-4 w-4 text-primary/60 mt-1 shrink-0"
          strokeWidth={2.5}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-foreground/90 font-medium">
            {card.text}
          </p>
          {card.author && (
            <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">
              — {card.author}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
