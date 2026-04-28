import { Quote } from "lucide-react";
import type { MotivationCard as Card } from "@/data/motivationCards";
import { Surface } from "@/components/ui/surface";

interface MotivationCardProps {
  card: Card;
}

/**
 * Daily motivation card — editorial, observational tone.
 * Uses unified Surface (hero variant) for consistent rhythm with other hero cards.
 */
export const MotivationCard = ({ card }: MotivationCardProps) => {
  return (
    <Surface tone="hero" size="hero">
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
    </Surface>
  );
};
