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
        "group relative overflow-hidden rounded-2xl p-5",
        "glass transition-all duration-300",
        "hover:glow-subtle",
        variant === "primary" && "border-primary/20 hover:border-primary/40",
        variant === "success" && "border-success/20 hover:border-success/40",
        variant === "warning" && "border-warning/20 hover:border-warning/40",
        variant === "default" && "border-border/30 hover:border-border/50",
        className
      )}
    >
      {/* Background gradient glow */}
      <div
        className={cn(
          "absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 blur-xl",
          variant === "primary" && "bg-primary/20",
          variant === "success" && "bg-success/20",
          variant === "warning" && "bg-warning/20",
          variant === "default" && "bg-primary/10"
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground tracking-wide">
            {title}
          </span>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
              "group-hover:scale-110",
              variant === "primary" && "bg-primary/15 text-primary",
              variant === "success" && "bg-success/15 text-success",
              variant === "warning" && "bg-warning/15 text-warning",
              variant === "default" && "bg-secondary text-muted-foreground"
            )}
          >
            {icon}
          </div>
        </div>

        <div className="space-y-1">
          <p
            className={cn(
              "text-3xl md:text-4xl font-bold tracking-tight transition-all duration-300",
              variant === "primary" && "text-primary group-hover:text-primary",
              variant === "success" && "text-success group-hover:text-success",
              variant === "warning" && "text-warning group-hover:text-warning",
              variant === "default" && "text-foreground"
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
