import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SegmentedTabs — Arcade Overdrive
 * Unified pill/segmented selector for the entire app.
 * Use cases: weekday picker, Hoje/Semana/Mês, Comprado/Falta comprar.
 *
 * Single source of truth — no page should reinvent its own pill style.
 */

export interface SegmentedTabOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}

interface SegmentedTabsProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedTabOption<T>[];
  size?: "sm" | "md";
  /** stretch tabs equally to fill container */
  fullWidth?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function SegmentedTabs<T extends string = string>({
  value,
  onChange,
  options,
  size = "md",
  fullWidth = false,
  className,
  ariaLabel,
}: SegmentedTabsProps<T>) {
  const sizeCls =
    size === "sm"
      ? "h-8 text-[11px] px-3"
      : "h-10 text-xs px-4";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-secondary/60 border border-foreground/10 rounded-xl",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            aria-label={opt.ariaLabel}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold uppercase tracking-tight italic transition-all duration-150 touch-target",
              sizeCls,
              fullWidth && "flex-1",
              active
                ? "bg-primary text-primary-foreground shadow-[3px_3px_0_0_hsl(var(--neon-ultra))]"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
              opt.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
