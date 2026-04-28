import { cn } from "@/lib/utils";

/**
 * CardSkeleton — Arcade Overdrive
 * Single skeleton matching the Surface primitive dimensions.
 * Use this everywhere a Surface would render while data loads.
 */
interface CardSkeletonProps {
  size?: "compact" | "default" | "hero";
  count?: number;
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
  className,
}: CardSkeletonProps) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        aria-hidden
        className={cn(
          "shimmer border border-foreground/[0.06] bg-card/50",
          sizeCls[size],
          className,
        )}
      />
    ))}
  </>
);
