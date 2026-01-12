import { RefreshCw, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nContext";

interface BouncebackPromptProps {
  missedHabits: string[];
  onRecover: () => void;
  onDismiss: () => void;
}

export const BouncebackPrompt = ({ missedHabits, onRecover, onDismiss }: BouncebackPromptProps) => {
  const { t } = useI18n();
  
  return (
    <Card className="border-warning/50 bg-warning/5 animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-warning/20">
              <RefreshCw className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-sm">{t.bounceback.recoverPrompt}</p>
              <p className="text-xs text-muted-foreground">
                {missedHabits.slice(0, 2).join(", ")}
                {missedHabits.length > 2 && ` +${missedHabits.length - 2}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={onRecover}
              className="h-8 gap-1 bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              <Check className="h-4 w-4" />
              {t.bounceback.recoverAction}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
