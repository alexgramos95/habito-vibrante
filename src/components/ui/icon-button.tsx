import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * IconButton — Arcade Overdrive
 * Single-icon control with squircle hit area (44px).
 * Use cases: add photo, remove photo, settings, close.
 *
 * Variants:
 *  - default  → subtle surface, accent on hover
 *  - primary  → toxic-green CTA (e.g. add photo)
 *  - destructive → remove photo / delete
 *  - ghost    → minimal (e.g. close)
 */

type Variant = "default" | "primary" | "destructive" | "ghost";
type Size = "sm" | "md" | "lg";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** required for accessibility */
  "aria-label": string;
}

const variantCls: Record<Variant, string> = {
  default:
    "bg-secondary/60 border border-foreground/10 text-foreground hover:border-primary/40 hover:text-primary",
  primary:
    "bg-primary text-primary-foreground border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))] hover:shadow-[1px_1px_0_0_hsl(var(--neon-ultra))] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
  destructive:
    "bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/15 hover:border-destructive/50",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
};

const sizeCls: Record<Size, string> = {
  sm: "h-8 w-8 [&_svg]:size-4 rounded-lg",
  md: "h-10 w-10 [&_svg]:size-[18px] rounded-xl",
  lg: "h-12 w-12 [&_svg]:size-5 rounded-xl",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      type={props.type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
