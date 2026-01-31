import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: {
    label?: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  children?: React.ReactNode;
  className?: string;
  /** Use compact mode for consistent mobile density */
  compact?: boolean;
}

export const PageHeader = ({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  compact = true,
}: PageHeaderProps) => {
  return (
    <header className={cn(
      "page-header",
      className
    )}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className={cn(
            "flex shrink-0 items-center justify-center rounded-xl bg-primary/10",
            compact ? "h-9 w-9" : "h-10 w-10"
          )}>
            <Icon className={cn("text-primary", compact ? "h-4 w-4" : "h-5 w-5")} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="page-title truncate">{title}</h1>
          {subtitle && (
            <p className="page-subtitle truncate">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "default"}
            size="sm"
            className={cn(
              "rounded-xl",
              action.label ? "gap-1.5 h-9 px-3" : "h-9 w-9"
            )}
          >
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label && <span className="hidden sm:inline">{action.label}</span>}
          </Button>
        )}
      </div>
    </header>
  );
};
