import { Flame, RotateCcw } from "lucide-react";
import { translations } from "@/i18n/translations.pt";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onResetMonth: () => void;
  onResetAll: () => void;
}

export const Header = ({ onResetMonth, onResetAll }: HeaderProps) => {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {translations.app.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {translations.app.subtitle}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onResetMonth}>
              {translations.actions.resetMonth}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onResetAll}
              className="text-destructive focus:text-destructive"
            >
              {translations.actions.resetAll}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
