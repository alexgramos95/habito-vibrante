import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — Arcade Overdrive
 * Sharp corners, mono font, neon focus.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full border-2 border-foreground/15 bg-card/40 px-3 py-2 text-base font-mono text-foreground ring-offset-background transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/50 placeholder:font-sans placeholder:not-italic",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:bg-card/80 focus-visible:shadow-[0_0_0_2px_hsl(var(--neon-toxic)/0.25)]",
          "disabled:cursor-not-allowed disabled:opacity-40 md:text-sm",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-[0_0_0_2px_hsl(var(--destructive)/0.3)]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
