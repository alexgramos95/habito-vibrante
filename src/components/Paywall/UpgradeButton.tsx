import { Crown } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpgradeButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => void;
  label?: string;
  showIcon?: boolean;
}

export const UpgradeButton = ({ 
  onClick, 
  label = "Upgrade to Pro",
  showIcon = true,
  className,
  variant = "default",
  size = "default",
  ...props
}: UpgradeButtonProps) => {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      {...props}
    >
      {showIcon && <Crown className="h-4 w-4" />}
      {label}
    </Button>
  );
};

// Pro badge for locked features
export const ProBadge = ({ className }: { className?: string }) => (
  <span className={cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
    "bg-warning/10 text-warning border border-warning/20",
    className
  )}>
    <Crown className="h-3 w-3" />
    PRO
  </span>
);
