import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Surface — Arcade Overdrive
 * The single source of truth for every card-like container in becoMe.
 *
 * Replaces ad-hoc combinations of border / radius / padding / bg used across:
 *   - habit cards
 *   - shopping rows
 *   - dashboard cards
 *   - KPI cards
 *   - motivation / coach cards
 *
 * Token contract (do NOT override per-page):
 *   radius: rounded-xl (md/standard) | rounded-2xl (hero)
 *   padding: p-3 (compact) | p-4 (default) | p-5 (hero)
 *   border: 1px hairline foreground/[0.08] (rest) → primary/40 (active)
 *   surface: bg-card (default) | bg-card/50 (subtle)
 *   tactile: applied via `.press-tactile` for interactive variants
 *
 * State variants encode the Arcade Overdrive identity in ONE place:
 *   - default     : neutral surface
 *   - active      : primary accent (done / selected)
 *   - exceeded    : destructive (limit ultrapassado)
 *   - warning     : tardio / mild caution
 *   - hero        : larger surface for headline cards (motivation, telemetry)
 */

const surfaceVariants = cva(
  "relative overflow-hidden transition-[background-color,border-color,box-shadow] duration-300 ease-out",
  {
    variants: {
      tone: {
        default:
          "bg-card border border-foreground/[0.08]",
        subtle:
          "bg-card/50 border border-foreground/[0.08]",
        active:
          "bg-primary/[0.06] border border-primary/50 shadow-[0_0_22px_hsl(var(--neon-toxic)/0.12)]",
        accent:
          "bg-primary/[0.05] border border-primary/40",
        warning:
          "bg-warning/[0.06] border border-warning/40",
        exceeded:
          "bg-destructive/[0.10] border border-destructive/60 shadow-[0_0_22px_hsl(var(--destructive)/0.16)]",
        hero:
          "border border-border/40 bg-gradient-to-br from-accent/5 via-card/40 to-primary/5",
      },
      size: {
        compact: "p-3 rounded-xl",
        default: "p-4 rounded-xl",
        hero:    "p-5 rounded-2xl",
      },
      interactive: {
        true:
          "press-tactile cursor-pointer hover:border-accent/40 hover:bg-card/70",
        false: "",
      },
    },
    compoundVariants: [
      // Active/exceeded surfaces should NOT lose their accent on hover
      { tone: "active",   interactive: true, className: "hover:border-primary/60 hover:bg-primary/[0.08]" },
      { tone: "exceeded", interactive: true, className: "hover:border-destructive/70 hover:bg-destructive/[0.12]" },
      { tone: "warning",  interactive: true, className: "hover:border-warning/60 hover:bg-warning/[0.08]" },
      { tone: "accent",   interactive: true, className: "hover:border-primary/55 hover:bg-primary/[0.07]" },
      { tone: "hero",     interactive: true, className: "hover:border-border/60" },
    ],
    defaultVariants: {
      tone: "default",
      size: "default",
      interactive: false,
    },
  },
);

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {
  asChild?: boolean;
  /** when true, removes default padding so callers can compose internal layout */
  unpadded?: boolean;
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, tone, size, interactive, unpadded, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        surfaceVariants({ tone, size, interactive }),
        unpadded && "p-0",
        className,
      )}
      {...props}
    />
  ),
);
Surface.displayName = "Surface";

export { surfaceVariants };
