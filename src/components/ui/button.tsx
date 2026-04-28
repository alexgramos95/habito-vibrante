import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button — Arcade Overdrive
 * Sharp corners, italic uppercase, tactile shadow on primary.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-tight italic ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:not-italic",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-2 border-primary shadow-[4px_4px_0_0_hsl(var(--neon-ultra))] hover:shadow-[2px_2px_0_0_hsl(var(--neon-ultra))] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        destructive:
          "bg-destructive text-destructive-foreground border-2 border-destructive shadow-[4px_4px_0_0_hsl(var(--neon-ultra))] hover:shadow-[2px_2px_0_0_hsl(var(--neon-ultra))] hover:translate-x-[2px] hover:translate-y-[2px]",
        outline:
          "border-2 border-foreground/20 bg-transparent text-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
        "outline-soft":
          "border border-foreground/15 bg-secondary/40 text-foreground/80 hover:border-primary/40 hover:text-primary hover:bg-primary/5",
        secondary:
          "bg-secondary text-secondary-foreground border border-foreground/10 hover:border-foreground/30",
        ghost:
          "text-foreground/70 hover:text-primary hover:bg-foreground/5",
        link: "text-primary underline-offset-4 hover:underline normal-case not-italic",
        ultra:
          "bg-accent text-accent-foreground border-2 border-accent shadow-[4px_4px_0_0_hsl(var(--neon-toxic))] hover:shadow-[2px_2px_0_0_hsl(var(--neon-toxic))] hover:translate-x-[2px] hover:translate-y-[2px]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-10 w-10 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
