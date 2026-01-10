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

export const KPICard = ({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  className,
}: KPICardProps) => {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 p-5",
        "bg-card transition-all duration-300 hover:border-primary/30",
        "animate-fade-in",
        variant === "primary" && "border-primary/20 hover:border-primary/50",
        variant === "success" && "border-success/20 hover:border-success/50",
        variant === "warning" && "border-warning/20 hover:border-warning/50",
        className
      )}
    >
      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          variant === "primary" && "bg-primary/5",
          variant === "success" && "bg-success/5",
          variant === "warning" && "bg-warning/5",
          variant === "default" && "bg-primary/5"
        )}
      />

      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              variant === "primary" && "bg-primary/10 text-primary",
              variant === "success" && "bg-success/10 text-success",
              variant === "warning" && "bg-warning/10 text-warning",
              variant === "default" && "bg-secondary text-muted-foreground"
            )}
          >
            {icon}
          </div>
        </div>

        <div className="space-y-1">
          <p
            className={cn(
              "text-3xl font-semibold tracking-tight",
              variant === "primary" && "text-primary",
              variant === "success" && "text-success",
              variant === "warning" && "text-warning"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};
