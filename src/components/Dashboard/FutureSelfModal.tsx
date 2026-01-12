import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Compass, Plus, X, Save, Sparkles, Target } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/i18n/I18nContext";
import { FutureSelfEntry } from "@/data/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface FutureSelfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: FutureSelfEntry[];
  latestEntry?: FutureSelfEntry;
  onSave: (narrative: string, themes: string[]) => void;
}

export const FutureSelfModal = ({ 
  open, onOpenChange, entries, latestEntry, onSave 
}: FutureSelfModalProps) => {
  const { t, formatDate, locale } = useI18n();
  const isMobile = useIsMobile();
  
  const [isEditing, setIsEditing] = useState(!latestEntry?.narrative);
  const [narrative, setNarrative] = useState(latestEntry?.narrative || "");
  const [themes, setThemes] = useState<string[]>(latestEntry?.themes || []);
  const [newTheme, setNewTheme] = useState("");

  useEffect(() => {
    setNarrative(latestEntry?.narrative || "");
    setThemes(latestEntry?.themes || []);
    setIsEditing(!latestEntry?.narrative);
  }, [latestEntry, open]);

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

  // Sort entries by date desc
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Collect all unique themes across entries
  const allThemes = Array.from(
    new Set(entries.flatMap(e => e.themes))
  );

  const Content = (
    <div className="space-y-6">
      {/* Current Identity Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            {t.futureSelf.question}
          </h4>
          {!isEditing && latestEntry?.narrative && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              {t.actions.edit}
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t.futureSelf.narrative}
              </label>
              <Textarea
                placeholder={t.futureSelf.placeholder}
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                className="min-h-[100px] bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t.futureSelf.themes}
              </label>
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
                  <span className="text-xs text-muted-foreground mr-1">
                    {locale === 'pt-PT' ? 'Sugestões:' : 'Suggestions:'}
                  </span>
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
              {latestEntry?.narrative && (
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
        ) : latestEntry?.narrative ? (
          <Card className="bg-muted/30">
            <CardContent className="pt-4 space-y-3">
              <blockquote className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground">
                "{latestEntry.narrative}"
              </blockquote>
              {latestEntry.themes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {latestEntry.themes.map((theme) => (
                    <Badge key={theme} variant="secondary">
                      {theme}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* All Themes */}
      {allThemes.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-3">
              {locale === 'pt-PT' ? 'Temas da tua identidade' : 'Your identity themes'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {allThemes.map((theme) => (
                <Badge key={theme} variant="outline" className="text-sm">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Evolution Timeline */}
      {sortedEntries.length > 1 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-3">
              {locale === 'pt-PT' ? 'Evolução' : 'Evolution'}
            </h4>
            
            <div className="space-y-3">
              {sortedEntries.slice(0, 10).map((entry) => (
                <div key={entry.date} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="w-0.5 h-full bg-border" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatDate(new Date(entry.date), locale === 'pt-PT' ? "d 'de' MMMM 'de' yyyy" : "MMMM d, yyyy")}
                    </p>
                    <p className="text-sm italic">"{entry.narrative}"</p>
                    {entry.themes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.themes.slice(0, 3).map((theme) => (
                          <Badge key={theme} variant="outline" className="text-xs">
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
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              {t.futureSelf.title}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4 pr-4">
            {Content}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            {t.futureSelf.title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          {Content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
