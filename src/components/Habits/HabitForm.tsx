import { useState, useMemo, useRef } from "react";
import { Clock, Bell, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/I18nContext";
import { useData } from "@/contexts/DataContext";
import { Habit, DEFAULT_COLORS, DEFAULT_CATEGORIES } from "@/data/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const { state } = useData();
  const WEEKDAYS = locale === 'pt-PT' ? WEEKDAYS_PT : WEEKDAYS_EN;

  const [nome, setNome] = useState(habit?.nome || "");
  const [categoria, setCategoria] = useState(habit?.categoria || "");
  const [cor, setCor] = useState(habit?.cor || DEFAULT_COLORS[0]);
  const [active, setActive] = useState(habit?.active ?? true);
  const [scheduledTime, setScheduledTime] = useState(habit?.scheduledTime || "");
  const [scheduledDays, setScheduledDays] = useState<number[]>(habit?.scheduledDays || []);
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminderEnabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaError, setCategoriaError] = useState<string | null>(null);
  const categoriaWrapperRef = useRef<HTMLDivElement | null>(null);
  const categoriaTriggerRef = useRef<HTMLButtonElement | null>(null);
  const isPT = locale === 'pt-PT';

  // Count of active habits excluding the one being edited (if editing)
  const otherActiveCount = useMemo(() => {
    return state.habits.filter(h => h.active && h.id !== habit?.id).length;
  }, [state.habits, habit?.id]);

  // Lock deactivation if this is the last active habit
  const isLastActive = habit?.active === true && otherActiveCount === 0;

  const handleActiveChange = (next: boolean) => {
    if (!next && isLastActive) {
      setError(
        locale === 'pt-PT'
          ? "Tem de existir pelo menos 1 hábito ativo. Ativa outro antes de desativar este."
          : "At least one active habit is required. Activate another before deactivating this one."
      );
      return;
    }
    setError(null);
    setActive(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    // Categoria obrigatória ao nível do formulário
    if (!categoria) {
      setCategoriaError(
        isPT
          ? "Escolhe uma categoria para guardar."
          : "Choose a category to save."
      );
      categoriaWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => categoriaTriggerRef.current?.focus(), 250);
      return;
    }

    // Final guard: block save if it would leave 0 active habits
    if (!active && otherActiveCount === 0) {
      setError(
        isPT
          ? "Não podes guardar — pelo menos 1 hábito tem de estar ativo."
          : "Cannot save — at least one habit must remain active."
      );
      return;
    }

    onSave({
      nome: nome.trim(),
      categoria: categoria || undefined,
      cor,
      active,
      scheduledTime: scheduledTime || undefined,
      scheduledDays: scheduledDays.length > 0 ? scheduledDays : undefined,
      reminderEnabled: scheduledTime ? reminderEnabled : undefined,
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
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {habit ? t.habits.edit : t.habits.add}
          </DialogTitle>
        </DialogHeader>

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
          <div className="space-y-2" ref={categoriaWrapperRef}>
            <Label htmlFor="categoria">
              {t.habits.category}
              <span className="ml-1 text-muted-foreground" aria-hidden="true">*</span>
              <span className="sr-only">
                {isPT ? "(obrigatório)" : "(required)"}
              </span>
            </Label>
            <Select
              value={categoria}
              onValueChange={(value) => {
                setCategoria(value);
                if (categoriaError) setCategoriaError(null);
              }}
            >
              <SelectTrigger
                ref={categoriaTriggerRef}
                id="categoria"
                aria-invalid={!!categoriaError}
                aria-describedby="categoria-feedback"
                className={cn(
                  "transition-colors",
                  categoriaError
                    ? "border-destructive/60 bg-secondary/50 focus:ring-destructive"
                    : categoria
                      ? "bg-secondary/50"
                      : "border-dashed border-muted-foreground/40 bg-secondary/30"
                )}
              >
                <SelectValue
                  placeholder={
                    isPT ? "Seleciona uma categoria" : "Select a category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoriaError ? (
              <p
                id="categoria-feedback"
                role="alert"
                className="flex items-center gap-1.5 text-xs text-destructive"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {categoriaError}
              </p>
            ) : categoria ? (
              <p
                id="categoria-feedback"
                role="status"
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                {isPT ? "Categoria registada." : "Category set."}
              </p>
            ) : (
              <p id="categoria-feedback" className="text-xs text-muted-foreground">
                {isPT
                  ? "Por escolher — toca acima para abrir as opções."
                  : "Not chosen yet — tap above to open the options."}
              </p>
            )}
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

          {/* Reminder notification toggle - only show when time is set */}
          {scheduledTime && (
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <div>
                  <Label htmlFor="reminderEnabled" className="font-medium">
                    {locale === 'pt-PT' ? "Notificação" : "Notification"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'pt-PT' 
                      ? "Recebe um lembrete no horário definido" 
                      : "Get reminded at the scheduled time"}
                  </p>
                </div>
              </div>
              <Switch
                id="reminderEnabled"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
              />
            </div>
          )}

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
          <div className={cn(
            "flex items-center justify-between rounded-lg border p-4",
            isLastActive
              ? "border-warning/40 bg-warning/5"
              : "border-border/50 bg-secondary/30"
          )}>
            <div className="flex-1 pr-3">
              <Label htmlFor="active" className="font-medium">
                {t.habits.active}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isLastActive
                  ? (locale === 'pt-PT'
                      ? "Último hábito ativo — não pode ser desativado"
                      : "Last active habit — cannot be deactivated")
                  : (locale === 'pt-PT' ? "Incluir no rastreamento diário" : "Include in daily tracking")}
              </p>
            </div>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={handleActiveChange}
              disabled={isLastActive}
            />
          </div>

          {/* Validation error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
      </DialogContent>
    </Dialog>
  );
};