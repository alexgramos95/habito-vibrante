import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/surface";

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
 * Sits on top of the unified Surface primitive.
 * Variant controls the value/icon accent only — base card geometry is shared.
 */
export const KPICard = ({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  className,
}: KPICardProps) => {
  // Surface tone — keep neutral for non-primary variants so KPI grids breathe.
  const tone =
    variant === "primary" ? "active" :
    variant === "warning" ? "warning" :
    variant === "success" ? "accent" :
    "default";

  const valueColor =
    variant === "primary" ? "text-primary" :
    variant === "success" ? "text-success" :
    variant === "warning" ? "text-warning" :
    "text-foreground";

  return (
    <Surface tone={tone} size="default" className={className}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border border-current/30", valueColor)}>
          {icon}
        </div>
      </div>
      <p className={cn("font-black italic uppercase tracking-tighter text-3xl md:text-4xl leading-none tabular-nums", valueColor)}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {subtitle}
        </p>
      )}
    </Surface>
  );
};
