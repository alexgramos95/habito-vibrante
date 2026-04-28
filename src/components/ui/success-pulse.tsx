import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SuccessPulse — short, restrained confirmation animation.
 * Renders a neon-toxic check that pulses once. Auto-dismiss optional.
 *
 * Pair with toast for the textual confirmation; this is the *visual* pulse.
 */
export interface SuccessPulseProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeCls = {
  sm: "h-6 w-6",
  md: "h-9 w-9",
  lg: "h-12 w-12",
} as const;

const innerSize = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
} as const;

export const SuccessPulse = ({ size = "md", className }: SuccessPulseProps) => (
  <span
    className={cn(
      "relative inline-flex items-center justify-center rounded-full bg-primary/15 text-primary",
      "animate-completion-pop motion-reduce:animate-none",
      sizeCls[size],
      className,
    )}
    aria-hidden
  >
    <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping motion-reduce:animate-none" />
    <Check className={cn("relative", innerSize[size])} strokeWidth={3} />
  </span>
);
