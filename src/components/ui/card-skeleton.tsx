import { cn } from "@/lib/utils";

/**
 * CardSkeleton — Arcade Overdrive
 * Single skeleton matching the Surface primitive dimensions.
 * Use this everywhere a Surface would render while data loads.
 *
 * `gap` controls spacing when count > 1 so list skeletons match the
 * production list rhythm (space-y-2 default).
 */
interface CardSkeletonProps {
  size?: "compact" | "default" | "hero";
  count?: number;
  /** Tailwind gap class applied to the wrapping flex when count > 1. */
  gap?: string;
  className?: string;
}

const sizeCls = {
  compact: "h-14 rounded-xl",
  default: "h-[72px] rounded-xl",
  hero:    "h-28 rounded-2xl",
};

export const CardSkeleton = ({
  size = "default",
  count = 1,
  gap = "gap-2",
  className,
}: CardSkeletonProps) => {
  const items = Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      aria-hidden
      className={cn(
        "shimmer border border-foreground/[0.06] bg-card/50 motion-reduce:animate-none",
        sizeCls[size],
        className,
      )}
    />
  ));

  if (count === 1) return <>{items}</>;
  return <div className={cn("flex flex-col", gap)} role="status" aria-label="A carregar">{items}</div>;
};

