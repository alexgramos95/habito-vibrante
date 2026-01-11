import { Brain, Lock, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";

interface AIReflectionPlaceholderProps {
  compact?: boolean;
}

export const AIReflectionPlaceholder = ({ compact = false }: AIReflectionPlaceholderProps) => {
  const { t } = useI18n();

  if (compact) {
    return (
      <Card className="premium-card opacity-60 cursor-not-allowed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="p-1.5 rounded-lg bg-muted">
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
            {t.ai.title}
            <Badge variant="outline" className="ml-auto text-xs">
              <Lock className="h-3 w-3 mr-1" />
              {t.ai.comingSoon}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{t.ai.description}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/30 bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            {t.ai.title}
          </span>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" />
            {t.ai.premium}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 space-y-4">
          <div className="relative inline-block">
            <Sparkles className="h-16 w-16 text-muted-foreground/30 animate-pulse" />
            <Lock className="h-6 w-6 text-muted-foreground absolute -bottom-1 -right-1 bg-background rounded-full p-1" />
          </div>
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground">{t.ai.comingSoon}</p>
            <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">
              {t.ai.description}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <Badge variant="secondary" className="text-xs">Análise de padrões</Badge>
            <Badge variant="secondary" className="text-xs">Insights personalizados</Badge>
            <Badge variant="secondary" className="text-xs">Sugestões de melhoria</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};