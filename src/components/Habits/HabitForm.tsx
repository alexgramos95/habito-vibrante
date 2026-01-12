import { useState } from "react";
import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/I18nContext";
import { Habit, DEFAULT_COLORS, DEFAULT_CATEGORIES } from "@/data/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HabitFormProps {
  habit?: Habit;
  onSave: (data: Omit<Habit, "id" | "createdAt">) => void;
  onCancel: () => void;
}

const WEEKDAYS_EN = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const WEEKDAYS_PT = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export const HabitForm = ({ habit, onSave, onCancel }: HabitFormProps) => {
  const { t, locale } = useI18n();
  const WEEKDAYS = locale === 'pt-PT' ? WEEKDAYS_PT : WEEKDAYS_EN;
  
  const [nome, setNome] = useState(habit?.nome || "");
  const [categoria, setCategoria] = useState(habit?.categoria || "");
  const [cor, setCor] = useState(habit?.cor || DEFAULT_COLORS[0]);
  const [active, setActive] = useState(habit?.active ?? true);
  const [scheduledTime, setScheduledTime] = useState(habit?.scheduledTime || "");
  const [scheduledDays, setScheduledDays] = useState<number[]>(habit?.scheduledDays || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onSave({
      nome: nome.trim(),
      categoria: categoria || undefined,
      cor,
      active,
      scheduledTime: scheduledTime || undefined,
      scheduledDays: scheduledDays.length > 0 ? scheduledDays : undefined,
    });
  };

  const toggleDay = (day: number) => {
    setScheduledDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-xl font-semibold">
          {habit ? t.habits.edit : t.habits.add}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">{t.habits.name}</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={locale === 'pt-PT' ? "Ex: Beber 2L de água" : "E.g., Drink 2L of water"}
              className="bg-secondary/50"
              autoFocus
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoria">{t.habits.category}</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder={locale === 'pt-PT' ? "Selecionar categoria" : "Select category"} />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label>{t.habits.color}</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCor(color)}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-200",
                    cor === color
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                      : "hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Scheduling - Time */}
          <div className="space-y-2">
            <Label htmlFor="scheduledTime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {locale === 'pt-PT' ? "Horário (opcional)" : "Time (optional)"}
            </Label>
            <Input
              id="scheduledTime"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-secondary/50"
            />
            <p className="text-xs text-muted-foreground">
              {locale === 'pt-PT' ? "Define um horário para lembrete" : "Set a reminder time"}
            </p>
          </div>

          {/* Scheduling - Days */}
          <div className="space-y-2">
            <Label>{locale === 'pt-PT' ? "Dias da semana (opcional)" : "Days of week (optional)"}</Label>
            <div className="flex gap-1">
              {WEEKDAYS.map(day => (
                <Button
                  key={day.value}
                  type="button"
                  variant={scheduledDays.includes(day.value) ? "default" : "outline"}
                  size="sm"
                  className="w-10 h-10"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {locale === 'pt-PT' ? "Deixar vazio = todos os dias" : "Leave empty = every day"}
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-4">
            <div>
              <Label htmlFor="active" className="font-medium">
                {t.habits.active}
              </Label>
              <p className="text-sm text-muted-foreground">
                {locale === 'pt-PT' ? "Incluir no rastreamento diário" : "Include in daily tracking"}
              </p>
            </div>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {t.habits.cancel}
            </Button>
            <Button type="submit" className="flex-1">
              {t.habits.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};