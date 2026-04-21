import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
  className?: string;
}

/**
 * KPICard — Arcade Overdrive
 * Tactile shadow, mono labels, neon values.
 */
export const KPICard = ({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  className,
}: KPICardProps) => {
  const accent =
    variant === "primary"
      ? "border-primary/50 shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.4)]"
      : variant === "success"
        ? "border-success/50 shadow-[4px_4px_0_0_hsl(var(--success)/0.3)]"
        : variant === "warning"
          ? "border-warning/50 shadow-[4px_4px_0_0_hsl(var(--warning)/0.3)]"
          : "border-foreground/15 shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.2)]";

  const valueColor =
    variant === "primary"
      ? "text-primary"
      : variant === "success"
        ? "text-success"
        : variant === "warning"
          ? "text-warning"
          : "text-foreground";

  return (
    <div className={cn("relative bg-card border-2 p-4 transition-all", accent, className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <div className={cn("flex h-8 w-8 items-center justify-center border", valueColor, "border-current/30")}>
          {icon}
        </div>
      </div>
      <p className={cn("font-black italic uppercase tracking-tighter text-3xl md:text-4xl leading-none", valueColor)}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {subtitle}
        </p>
      )}
    </div>
  );
};
