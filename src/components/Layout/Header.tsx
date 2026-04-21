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
    <header className="border-b border-foreground/10 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-primary bg-primary/10">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase italic tracking-tighter text-foreground">
              {translations.app.title}
            </h1>
            <p className="mono-label text-muted-foreground/70">
              {translations.app.subtitle}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
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
