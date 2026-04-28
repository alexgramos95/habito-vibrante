import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tracker, TrackerType, TrackerFrequency, TrackerInputMode, TRACKER_TEMPLATES } from "@/data/types";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";

interface TrackerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracker?: Tracker | null;
  onSave: (data: Omit<Tracker, "id" | "createdAt">) => void;
  onDelete?: () => void;
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

const TRACKER_ICONS = ["🎯", "📊", "💪", "🏃", "💧", "🧘", "📚", "☕", "🍺", "💊", "⏰", "🍎", "💰", "🛒", "😴"];

export const TrackerEditDialog = ({
  open,
  onOpenChange,
  tracker,
  onSave,
  onDelete
}: TrackerEditDialogProps) => {
  const { t, locale } = useI18n();
  const isPT = locale === "pt-PT";
  const isEditing = !!tracker;

  const [formData, setFormData] = useState({
    name: "",
    type: "reduce" as TrackerType,
    inputMode: "incremental" as TrackerInputMode,
    unitSingular: "",
    unitPlural: "",
    valuePerUnit: "0",
    baseline: "0",
    dailyGoal: "",
    frequency: "daily" as TrackerFrequency,
    specificDays: [] as number[],
    scheduledDays: [] as number[],
    icon: "🎯",
    active: true,
    includeInFinances: false,
    scheduledTime: "", // HH:MM format
  });

  const [tab, setTab] = useState<"custom" | "templates">("custom");

  useEffect(() => {
    if (tracker) {
      setFormData({
        name: tracker.name,
        type: tracker.type,
        inputMode: tracker.inputMode || "incremental",
        unitSingular: tracker.unitSingular,
        unitPlural: tracker.unitPlural,
        valuePerUnit: tracker.valuePerUnit.toString(),
        baseline: tracker.baseline.toString(),
        dailyGoal: tracker.dailyGoal?.toString() || "",
        frequency: tracker.frequency || "daily",
        specificDays: tracker.specificDays || [],
        scheduledDays: tracker.scheduledDays || [],
        icon: tracker.icon || "🎯",
        active: tracker.active,
        includeInFinances: tracker.includeInFinances,
        scheduledTime: tracker.scheduledTime || "",
      });
      setTab("custom");
    } else {
      setFormData({
        name: "",
        type: "reduce",
        inputMode: "incremental",
        unitSingular: "",
        unitPlural: "",
        valuePerUnit: "0",
        baseline: "0",
        dailyGoal: "",
        frequency: "daily",
        specificDays: [],
        scheduledDays: [],
        icon: "🎯",
        active: true,
        includeInFinances: false,
        scheduledTime: "",
      });
    }
  }, [tracker, open]);

  const handleTemplateSelect = (template: typeof TRACKER_TEMPLATES[0]) => {
    // Determine inputMode based on type
    let inputMode: TrackerInputMode = "incremental";
    if (template.type === "boolean") inputMode = "binary";
    else if (template.type === "increase" && template.baseline > 0) inputMode = "fixedAmount";
    
    setFormData({
      name: template.name,
      type: template.type,
      inputMode,
      unitSingular: template.unit,
      unitPlural: template.unitPlural,
      valuePerUnit: template.valuePerUnit.toString(),
      baseline: template.baseline.toString(),
      dailyGoal: "",
      frequency: template.frequency || "daily",
      specificDays: [],
      scheduledDays: [],
      icon: template.icon,
      active: true,
      includeInFinances: template.valuePerUnit > 0,
      scheduledTime: "",
    });
    setTab("custom");
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    
    // For binary type, units are not needed
    const isBinaryType = formData.type === "boolean" || formData.inputMode === "binary";
    
    onSave({
      name: formData.name.trim(),
      type: formData.type,
      inputMode: formData.inputMode,
      unitSingular: isBinaryType ? "" : formData.unitSingular.trim(),
      unitPlural: isBinaryType ? "" : (formData.unitPlural.trim() || formData.unitSingular.trim() + "s"),
      valuePerUnit: parseFloat(formData.valuePerUnit) || 0,
      baseline: parseInt(formData.baseline) || 0,
      dailyGoal: formData.dailyGoal ? parseInt(formData.dailyGoal) : undefined,
      frequency: formData.frequency,
      specificDays: formData.frequency === "specific_days" ? formData.specificDays : undefined,
      scheduledDays: formData.scheduledDays.length > 0 ? formData.scheduledDays : undefined,
      icon: formData.icon,
      active: formData.active,
      includeInFinances: Math.abs(parseFloat(formData.valuePerUnit)) > 0,
      scheduledTime: formData.scheduledTime || undefined,
    });
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      specificDays: prev.specificDays.includes(day)
        ? prev.specificDays.filter(d => d !== day)
        : [...prev.specificDays, day].sort()
    }));
  };

  const typeDescriptions: Record<TrackerType, string> = isPT
    ? {
        reduce: "Menos é melhor (ex.: álcool, despesa)",
        increase: "Mais é melhor (ex.: exercício, água)",
        boolean: "Sim ou não (ex.: tomar suplemento)",
        event: "Registo de evento (ex.: café comprado)",
        neutral: "Apenas monitorizar, sem objetivo",
      }
    : {
        reduce: "Less is better (e.g., alcohol, spending)",
        increase: "More is better (e.g., exercise, water)",
        boolean: "Yes or no (e.g., supplement taken)",
        event: "Event logging (e.g., coffee bought)",
        neutral: "Tracking only, no goal",
      };

  const WEEKDAYS = isPT ? WEEKDAYS_PT : WEEKDAYS_EN;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? (isPT ? "Editar métrica" : "Edit Metric")
              : (isPT ? "Nova métrica" : "New Metric")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? (isPT ? "Modifica as propriedades da métrica." : "Modify metric properties.")
              : (isPT ? "Cria uma métrica para monitorizar comportamentos." : "Create a metric to monitor behaviors.")}
          </DialogDescription>
        </DialogHeader>

        {!isEditing && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "custom" | "templates")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">{isPT ? "Modelos" : "Templates"}</TabsTrigger>
              <TabsTrigger value="custom">{isPT ? "Personalizado" : "Custom"}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="templates" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-2">
                {TRACKER_TEMPLATES.map((template) => (
                  <Button
                    key={template.name}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <span className="text-xl">{template.icon}</span>
                    <span className="text-sm">{template.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {template.type === "reduce" ? (isPT ? "Reduzir" : "Reduce") :
                       template.type === "increase" ? (isPT ? "Aumentar" : "Increase") :
                       template.type === "boolean" ? (isPT ? "Sim/Não" : "Boolean") :
                       (isPT ? "Evento" : "Event")}
                    </span>
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {(tab === "custom" || isEditing) && (
          <div className="space-y-4 py-2">
            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>{isPT ? "Ícone" : "Icon"}</Label>
              <div className="flex flex-wrap gap-1">
                {TRACKER_ICONS.map(icon => (
                  <Button
                    key={icon}
                    type="button"
                    variant={formData.icon === icon ? "default" : "outline"}
                    size="sm"
                    className="w-10 h-10 text-lg"
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t.trackers.name} *</Label>
              <Input
                id="name"
                placeholder={isPT ? "Ex: Meditação" : "Ex: Meditation"}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>{t.trackers.type}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: TrackerType) => {
                  let newInputMode = formData.inputMode;
                  if (value === "boolean") newInputMode = "binary";
                  else if (value === "event") newInputMode = "incremental";
                  setFormData(prev => ({ ...prev, type: value, inputMode: newInputMode }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reduce">⬇️ {isPT ? "Reduzir" : "Reduce"}</SelectItem>
                  <SelectItem value="increase">⬆️ {isPT ? "Aumentar" : "Increase"}</SelectItem>
                  <SelectItem value="boolean">✅ {isPT ? "Sim/Não" : "Boolean"}</SelectItem>
                  <SelectItem value="event">📌 {isPT ? "Evento" : "Event"}</SelectItem>
                  <SelectItem value="neutral">➖ {isPT ? "Neutro" : "Neutral"}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{typeDescriptions[formData.type]}</p>
            </div>

            {/* Input Mode */}
            <div className="space-y-2">
              <Label>{isPT ? "Modo de registo" : "Input Mode"}</Label>
              <Select
                value={formData.inputMode}
                onValueChange={(value: TrackerInputMode) => setFormData(prev => ({ ...prev, inputMode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binary">✅ {isPT ? "Binário (feito/não feito)" : "Binary (done/not done)"}</SelectItem>
                  <SelectItem value="fixedAmount">🎯 {isPT ? "Quantidade fixa (1 clique = meta)" : "Fixed amount (1 click = goal)"}</SelectItem>
                  <SelectItem value="incremental">➕ {isPT ? "Incremental (+1 por clique)" : "Incremental (+1 per click)"}</SelectItem>
                  <SelectItem value="manualAmount">✏️ {isPT ? "Manual (introduzir valor)" : "Manual (enter value)"}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.inputMode === "binary" && (isPT ? "Um clique marca o dia como concluído" : "One click marks day complete")}
                {formData.inputMode === "fixedAmount" && (isPT ? "Um clique regista a meta diária" : "One click logs daily goal")}
                {formData.inputMode === "incremental" && (isPT ? "Cada clique adiciona +1 à timeline" : "Each click adds +1 to timeline")}
                {formData.inputMode === "manualAmount" && (isPT ? "Abre campo para valor personalizado" : "Opens field for custom value")}
              </p>
            </div>

            {/* Units - hide for binary inputMode */}
            {formData.inputMode !== "binary" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitSingular">{t.trackers.unitSingular}</Label>
                  <Input
                    id="unitSingular"
                    placeholder={isPT ? "Ex: minuto" : "Ex: minute"}
                    value={formData.unitSingular}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitSingular: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPlural">{t.trackers.unitPlural}</Label>
                  <Input
                    id="unitPlural"
                    placeholder={isPT ? "Ex: minutos" : "Ex: minutes"}
                    value={formData.unitPlural}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitPlural: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Baseline and Goal */}
            {!["boolean", "event"].includes(formData.type) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseline">{t.trackers.baseline}</Label>
                  <Input
                    id="baseline"
                    type="number"
                    min="0"
                    value={formData.baseline}
                    onChange={(e) => setFormData(prev => ({ ...prev, baseline: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">{isPT ? "0 é válido" : "0 is valid"}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyGoal">{t.trackers.dailyGoal}</Label>
                  <Input
                    id="dailyGoal"
                    type="number"
                    min="0"
                    placeholder={isPT ? "Opcional" : "Optional"}
                    value={formData.dailyGoal}
                    onChange={(e) => setFormData(prev => ({ ...prev, dailyGoal: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">{isPT ? "Vazio = sem meta" : "Empty = no goal"}</p>
                </div>
              </div>
            )}

            {/* Financial Value */}
            <div className="space-y-2">
              <Label htmlFor="valuePerUnit">{t.trackers.valuePerUnit}</Label>
              <Input
                id="valuePerUnit"
                type="number"
                step="0.01"
                value={formData.valuePerUnit}
                onChange={(e) => setFormData(prev => ({ ...prev, valuePerUnit: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {formData.type === "event"
                  ? (isPT ? "Negativo = despesa (ex.: -3.00 para café)" : "Negative = expense (e.g., -3.00 for coffee)")
                  : (isPT ? "0 = sem impacto financeiro" : "0 = no financial impact")}
              </p>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>{isPT ? "Frequência" : "Frequency"}</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: TrackerFrequency) => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{isPT ? "Diário" : "Daily"}</SelectItem>
                  <SelectItem value="weekly">{isPT ? "Semanal" : "Weekly"}</SelectItem>
                  <SelectItem value="specific_days">{isPT ? "Dias específicos" : "Specific days"}</SelectItem>
                  <SelectItem value="flex">{isPT ? "Flexível" : "Flexible"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Days */}
            {formData.frequency === "specific_days" && (
              <div className="space-y-2">
                <Label>{isPT ? "Dias" : "Days"}</Label>
                <div className="flex gap-1">
                  {WEEKDAYS.map(day => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.specificDays.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      className="w-10 h-10"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled Time */}
            <div className="space-y-2">
              <Label htmlFor="scheduledTime">{isPT ? "Horário (opcional)" : "Time (optional)"}</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {isPT ? "Define horário do lembrete" : "Set reminder time"}
              </p>
            </div>

            {/* Active Toggle */}
            {isEditing && (
              <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                <div>
                  <Label className="font-medium">{isPT ? "Ativo" : "Active"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {isPT ? "Desativar para pausar sem eliminar" : "Deactivate to pause without deleting"}
                  </p>
                </div>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isEditing && onDelete && (
            <Button variant="destructive" onClick={onDelete} className="sm:mr-auto">
              {t.habits.delete}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.actions.cancel}
          </Button>
          <Button onClick={handleSave} disabled={!formData.name.trim()}>
            {isEditing ? t.actions.update : t.actions.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
