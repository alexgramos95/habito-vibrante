import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * FormField — canonical wrapper for any form control.
 *
 * Standardises:
 *  - label spacing (mb-1.5)
 *  - hint typography (xs muted)
 *  - error message typography + colour
 *  - aria wiring (label htmlFor, aria-describedby on the control via render prop)
 *
 * Usage:
 *   <FormField label="Email" htmlFor="email" hint="We never share." error={errors.email}>
 *     <Input id="email" aria-invalid={!!errors.email} />
 *   </FormField>
 *
 * The label/hint/error rhythm is the same across all forms in the app.
 */
export interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  /** Optional element rendered to the right of the label (e.g. character count). */
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const FormField = ({
  label,
  htmlFor,
  hint,
  error,
  required,
  meta,
  className,
  children,
}: FormFieldProps) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || meta) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <Label htmlFor={htmlFor} className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {label}
              {required && <span className="ml-1 text-destructive">*</span>}
            </Label>
          )}
          {meta && <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">{meta}</span>}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive flex items-start gap-1" role="alert">
          <span aria-hidden>⚠</span>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground/70">{hint}</p>
      ) : null}
    </div>
  );
};
