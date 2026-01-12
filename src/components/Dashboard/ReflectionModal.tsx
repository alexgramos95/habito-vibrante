import { useState, useEffect } from "react";
import { format } from "date-fns";
import { PenLine, Save, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/i18n/I18nContext";
import { DailyReflection } from "@/data/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReflectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reflections: DailyReflection[];
  todayReflection?: DailyReflection;
  onSave: (text: string, mood: 'positive' | 'neutral' | 'challenging') => void;
}

export const ReflectionModal = ({ 
  open, onOpenChange, reflections, todayReflection, onSave 
}: ReflectionModalProps) => {
  const { t, formatDate, locale } = useI18n();
  const isMobile = useIsMobile();
  
  const [isEditing, setIsEditing] = useState(!todayReflection?.text);
  const [text, setText] = useState(todayReflection?.text || "");
  const [mood, setMood] = useState<'positive' | 'neutral' | 'challenging'>(
    todayReflection?.mood || 'neutral'
  );

  useEffect(() => {
    setText(todayReflection?.text || "");
    setMood(todayReflection?.mood || 'neutral');
    setIsEditing(!todayReflection?.text);
  }, [todayReflection, open]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), mood);
      setIsEditing(false);
    }
  };

  const moodOptions: { value: 'positive' | 'neutral' | 'challenging'; label: string; emoji: string }[] = [
    { value: 'positive', label: t.reflection.positive, emoji: '😊' },
    { value: 'neutral', label: t.reflection.neutral, emoji: '😐' },
    { value: 'challenging', label: t.reflection.challenging, emoji: '💪' },
  ];

  // Sort reflections by date desc
  const sortedReflections = [...reflections].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const Content = (
    <div className="space-y-6">
      {/* Today's Reflection Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            {t.reflection.todayReflection}
          </h4>
          {!isEditing && todayReflection?.text && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              {t.actions.edit}
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              placeholder={t.reflection.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px] bg-background/50"
            />
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t.reflection.mood}</p>
              <div className="flex gap-2">
                {moodOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={mood === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMood(option.value)}
                    className="gap-1"
                  >
                    <span>{option.emoji}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {todayReflection?.text && (
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  {t.actions.cancel}
                </Button>
              )}
              <Button onClick={handleSave} disabled={!text.trim()} className="gap-2">
                <Save className="h-4 w-4" />
                {t.actions.save}
              </Button>
            </div>
          </div>
        ) : todayReflection?.text ? (
          <Card className="bg-muted/30">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm leading-relaxed">{todayReflection.text}</p>
              <Badge variant="outline">
                {moodOptions.find(m => m.value === todayReflection.mood)?.emoji}{' '}
                {moodOptions.find(m => m.value === todayReflection.mood)?.label}
              </Badge>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Separator />

      {/* Timeline */}
      <div>
        <h4 className="text-sm font-medium mb-3">
          {t.objectives.timeline} ({sortedReflections.length} {t.reflection.totalReflections})
        </h4>
        
        <div className="space-y-3">
          {sortedReflections.slice(0, 15).map((reflection) => (
            <div key={reflection.date} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <div className="w-0.5 h-full bg-border" />
              </div>
              <div className="flex-1 pb-4">
                <p className="text-xs text-muted-foreground mb-1">
                  {formatDate(new Date(reflection.date), locale === 'pt-PT' ? "d 'de' MMMM" : "MMMM d")}
                </p>
                <p className="text-sm">{reflection.text}</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {moodOptions.find(m => m.value === reflection.mood)?.emoji}{' '}
                  {moodOptions.find(m => m.value === reflection.mood)?.label}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {sortedReflections.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            {t.reflection.noReflection}
          </p>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-accent" />
              {t.reflection.title}
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
            <PenLine className="h-5 w-5 text-accent" />
            {t.reflection.title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          {Content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
