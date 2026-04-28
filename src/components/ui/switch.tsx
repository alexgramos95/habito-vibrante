import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Switch — Arcade Overdrive
 * Neon glow when checked, calm when unchecked. Same focus ring as inputs.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
      "border-foreground/20 data-[state=unchecked]:bg-card/40",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_10px_hsl(var(--neon-toxic)/0.45)]",
      "focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--neon-toxic)/0.35)]",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-md ring-0 transition-transform",
        "data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-primary-foreground",
        "data-[state=unchecked]:translate-x-0.5",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
