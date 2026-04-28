import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Checkbox — Arcade Overdrive
 * Sharp corners, neon checked state, same focus shadow as inputs.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-[18px] w-[18px] shrink-0 border-2 border-foreground/30 bg-card/40 transition-colors",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-[0_0_8px_hsl(var(--neon-toxic)/0.45)]",
      "focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--neon-toxic)/0.35)]",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
