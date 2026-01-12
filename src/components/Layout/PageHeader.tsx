import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  action?: {
    label?: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
}: PageHeaderProps) => {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {children}
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "default"}
            size={action.label ? "default" : "icon"}
            className={action.label ? "gap-2" : "h-9 w-9"}
          >
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    </header>
  );
};
