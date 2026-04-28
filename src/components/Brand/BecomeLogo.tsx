import { cn } from "@/lib/utils";

/**
 * Shared brand logo — "B" tile that matches the button vocabulary
 * (border-2 + tactile neon shadow + uppercase italic wordmark).
 * Single source of truth used in Landing, Onboarding and the in-app shell.
 */
export const BecomeLogo = ({
  className,
  compact = false,
  size = "md",
}: {
  className?: string;
  compact?: boolean;
  size?: "sm" | "md";
}) => {
  const tile = size === "sm" ? "h-7 w-7 text-sm" : "h-8 w-8 text-base";
  const word = size === "sm" ? "text-sm" : "text-base";
  return (
    <div className={cn("flex items-center gap-2.5", className)} aria-label="becoMe">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-primary text-primary-foreground font-black italic border-2 border-primary shadow-[2px_2px_0_0_hsl(var(--neon-ultra))]",
          tile,
        )}
      >
        B
      </div>
      {!compact && (
        <span className={cn("font-black uppercase italic tracking-tighter text-foreground", word)}>
          becoMe
        </span>
      )}
    </div>
  );
};
