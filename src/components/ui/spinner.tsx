import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Spinner — single source of truth for in-flight loaders.
 * Uses Loader2 with reduced motion respect.
 */
export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeCls = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

export const Spinner = ({ size = "sm", className, label }: SpinnerProps) => (
  <span
    role="status"
    aria-live="polite"
    aria-label={label || "A carregar"}
    className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}
  >
    <Loader2 className={cn(sizeCls[size], "animate-spin motion-reduce:animate-none text-current")} aria-hidden />
    {label && <span className="text-xs font-mono uppercase tracking-wider">{label}</span>}
  </span>
);
