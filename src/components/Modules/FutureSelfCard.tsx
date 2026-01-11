import { useState, useEffect } from "react";
import { Compass, Plus, X, Save, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nContext";
import { FutureSelfEntry } from "@/data/types";
import { cn } from "@/lib/utils";

interface FutureSelfCardProps {
  entry?: FutureSelfEntry;
  onSave: (narrative: string, themes: string[]) => void;
  compact?: boolean;
}

export const FutureSelfCard = ({ entry, onSave, compact = false }: FutureSelfCardProps) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [narrative, setNarrative] = useState(entry?.narrative || "");
  const [themes, setThemes] = useState<string[]>(entry?.themes || []);
  const [newTheme, setNewTheme] = useState("");

  useEffect(() => {
    setNarrative(entry?.narrative || "");
    setThemes(entry?.themes || []);
  }, [entry]);

  const handleSave = () => {
    if (narrative.trim()) {
      onSave(narrative.trim(), themes);
      setIsEditing(false);
    }
  };

  const addTheme = () => {
    if (newTheme.trim() && !themes.includes(newTheme.trim())) {
      setThemes([...themes, newTheme.trim()]);
      setNewTheme("");
    }
  };

  const removeTheme = (theme: string) => {
    setThemes(themes.filter(t => t !== theme));
  };

  const exampleThemes = t.futureSelf.examples;

  if (compact) {
    return (
      <Card className="premium-card group hover:glow-subtle transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Compass className="h-4 w-4 text-primary" />
            </div>
            {t.futureSelf.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entry?.narrative ? (
            <div className="space-y-2">
              <p className="text-sm line-clamp-2 italic">"{entry.narrative}"</p>
              {entry.themes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.themes.slice(0, 3).map((theme) => (
                    <Badge key={theme} variant="secondary" className="text-xs">
                      {theme}
                    </Badge>
                  ))}
                  {entry.themes.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{entry.themes.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="w-full text-muted-foreground"
            >
              <Compass className="h-4 w-4 mr-2" />
              {t.futureSelf.addEntry}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            {t.futureSelf.question}
          </span>
          {!isEditing && entry?.narrative && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              {t.actions.edit}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing || !entry?.narrative ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.futureSelf.narrative}</label>
              <Textarea
                placeholder={t.futureSelf.placeholder}
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                className="min-h-[100px] bg-background/50"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.futureSelf.themes}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {themes.map((theme) => (
                  <Badge key={theme} variant="secondary" className="gap-1 pr-1">
                    {theme}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeTheme(theme)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t.futureSelf.addTheme}
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTheme())}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={addTheme}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {themes.length === 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground mr-1">Sugestões:</span>
                  {exampleThemes.slice(0, 4).map((example) => (
                    <Button
                      key={example}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setThemes([...themes, example])}
                    >
                      +{example}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {entry?.narrative && (
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  {t.actions.cancel}
                </Button>
              )}
              <Button onClick={handleSave} disabled={!narrative.trim()} className="gap-2">
                <Save className="h-4 w-4" />
                {t.actions.save}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <blockquote className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground">
              "{entry.narrative}"
            </blockquote>
            {entry.themes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {entry.themes.map((theme) => (
                  <Badge key={theme} variant="secondary">
                    {theme}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};