import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export const BecomeLogo = ({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) => (
  <div className={cn("flex items-center gap-2.5", className)} aria-label="becoMe">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
      <Flame className="h-4 w-4" />
    </div>
    {!compact && (
      <span className="text-base font-black uppercase italic tracking-tighter text-foreground">
        becoMe
      </span>
    )}
  </div>
);