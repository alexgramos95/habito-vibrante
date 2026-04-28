import { LucideIcon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * PageHeader — canonical header for every authenticated page.
 *
 * Goals:
 *  - One title hierarchy (h1 + optional subtitle)
 *  - One back-button pattern (ghost icon, h-9 w-9, ArrowLeft)
 *  - One vertical rhythm (mb-5 between header and content)
 *  - Optional sticky behavior with backdrop blur
 *  - `actions` slot for right-side controls (buttons, SegmentedTabs, ...)
 *  - `meta` slot for content immediately under the header (chips, banners)
 *
 * Usage:
 *   <PageHeader title="Calendar" subtitle="View your progress" icon={Calendar}
 *               actions={<SegmentedTabs ... />} />
 *
 *   <PageHeader title="Account" icon={User} backTo={-1} sticky />
 */
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Show a back button. `true` → navigate(-1). String → navigate(path). Number → navigate(n). */
  backTo?: boolean | string | number;
  backLabel?: string;
  /** Right-aligned slot (buttons, SegmentedTabs, etc.) */
  actions?: React.ReactNode;
  /** Optional row rendered under the header (chips, banner). */
  meta?: React.ReactNode;
  /** Make the header sticky to the top of the scroll container. */
  sticky?: boolean;
  className?: string;
}

export const PageHeader = ({
  title,
  subtitle,
  icon: Icon,
  backTo,
  backLabel,
  actions,
  meta,
  sticky = false,
  className,
}: PageHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo === true || backTo === undefined) {
      navigate(-1);
    } else if (typeof backTo === "number") {
      navigate(backTo);
    } else if (typeof backTo === "string") {
      navigate(backTo);
    }
  };

  return (
    <header
      className={cn(
        "mb-5",
        sticky &&
          "sticky top-0 z-20 -mx-4 md:-mx-0 px-4 md:px-0 py-3 md:py-0 bg-background/85 backdrop-blur-md border-b border-foreground/10 md:border-0 md:bg-transparent md:backdrop-blur-0",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {backTo !== undefined && backTo !== false && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 -ml-1"
              onClick={handleBack}
              aria-label={backLabel || "Voltar"}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {Icon && !backTo && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold tracking-tight text-foreground truncate flex items-center gap-2">
              {Icon && backTo && <Icon className="h-5 w-5 text-primary shrink-0" />}
              <span className="truncate">{title}</span>
            </h1>
            {subtitle && (
              <p className="text-xs md:text-[13px] text-muted-foreground/80 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
        )}
      </div>

      {meta && <div className="mt-3">{meta}</div>}
    </header>
  );
};
