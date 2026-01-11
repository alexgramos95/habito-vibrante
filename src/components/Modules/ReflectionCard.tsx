import { useState, useEffect } from "react";
import { format } from "date-fns";
import { PenLine, Save, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";
import { DailyReflection } from "@/data/types";
import { cn } from "@/lib/utils";

interface ReflectionCardProps {
  reflection?: DailyReflection;
  onSave: (text: string, mood: 'positive' | 'neutral' | 'challenging') => void;
  compact?: boolean;
}

export const ReflectionCard = ({ reflection, onSave, compact = false }: ReflectionCardProps) => {
  const { t } = useI18n();
  const today = format(new Date(), "yyyy-MM-dd");
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(reflection?.text || "");
  const [mood, setMood] = useState<'positive' | 'neutral' | 'challenging'>(reflection?.mood || 'neutral');

  useEffect(() => {
    setText(reflection?.text || "");
    setMood(reflection?.mood || 'neutral');
  }, [reflection]);

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

  if (compact) {
    return (
      <Card className="premium-card group hover:glow-subtle transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <PenLine className="h-4 w-4 text-accent" />
            </div>
            {t.reflection.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reflection?.text ? (
            <div className="space-y-2">
              <p className="text-sm line-clamp-2">{reflection.text}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {moodOptions.find(m => m.value === reflection.mood)?.emoji} {moodOptions.find(m => m.value === reflection.mood)?.label}
                </Badge>
              </div>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="w-full text-muted-foreground"
            >
              <PenLine className="h-4 w-4 mr-2" />
              {t.reflection.addReflection}
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
            <PenLine className="h-5 w-5 text-accent" />
            {t.reflection.todayReflection}
          </span>
          {!isEditing && reflection?.text && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              {t.actions.edit}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing || !reflection?.text ? (
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
              {reflection?.text && (
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
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">{reflection.text}</p>
            <Badge variant="outline">
              {moodOptions.find(m => m.value === reflection.mood)?.emoji} {moodOptions.find(m => m.value === reflection.mood)?.label}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};