import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * SearchInput — canonical search field.
 * Wraps <Input> with a leading magnifier and an optional clear button.
 */
export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (value: string) => void;
  /** Show a clear (×) button when value is non-empty. Defaults to true. */
  clearable?: boolean;
  containerClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, clearable = true, className, containerClassName, placeholder = "Procurar...", ...props }, ref) => {
    return (
      <div className={cn("relative", containerClassName)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("pl-9", clearable && value ? "pr-9" : "", className)}
          {...props}
        />
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Limpar"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
