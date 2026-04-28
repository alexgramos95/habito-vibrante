import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — canonical "no items / no data" view.
 * Use whenever a list, dialog body, or section has nothing to show.
 *
 * Visual: centred icon, muted title, soft description, optional CTA.
 * Spacing rhythm matches `.empty-state` token in index.css.
 */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** CTA / actions row (typically a single Button). */
  action?: React.ReactNode;
  /** Reduce vertical padding when used inside a card or dialog. */
  compact?: boolean;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6",
        compact ? "py-8" : "py-16",
        "animate-fade-in motion-reduce:animate-none",
        className,
      )}
    >
      {Icon && <Icon className="h-12 w-12 text-muted-foreground/30 mb-4" aria-hidden />}
      <p className="text-base font-medium text-muted-foreground mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground/70 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
