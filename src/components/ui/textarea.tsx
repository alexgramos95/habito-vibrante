import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Textarea — Arcade Overdrive
 * Same border / focus language as <Input>.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full border-2 border-foreground/15 bg-card/40 px-3 py-2 text-base font-mono text-foreground ring-offset-background transition-colors",
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
});
Textarea.displayName = "Textarea";

export { Textarea };
