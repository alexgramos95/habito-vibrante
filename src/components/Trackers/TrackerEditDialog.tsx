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

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const TRACKER_ICONS = ["🎯", "📊", "💪", "🏃", "💧", "🧘", "📚", "☕", "🍺", "🚬", "💊", "⏰", "🍎", "💰", "🛒"];

export const TrackerEditDialog = ({
  open,
  onOpenChange,
  tracker,
  onSave,
  onDelete
}: TrackerEditDialogProps) => {
  const { t } = useI18n();
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

  const typeDescriptions: Record<TrackerType, string> = {
    reduce: "Menos é melhor (ex: cigarros, álcool)",
    increase: "Mais é melhor (ex: exercício, água)",
    boolean: "Sim ou não (ex: suplemento tomado)",
    event: "Registo de eventos (ex: café comprado)",
    neutral: "Apenas registo, sem objetivo",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Tracker" : "Novo Tracker"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Altera as propriedades do tracker." : "Cria um tracker para monitorizar comportamentos."}
          </DialogDescription>
        </DialogHeader>

        {!isEditing && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "custom" | "templates")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="custom">Personalizado</TabsTrigger>
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
                      {template.type === "reduce" ? "Reduzir" : 
                       template.type === "increase" ? "Aumentar" :
                       template.type === "boolean" ? "Boolean" : "Evento"}
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
              <Label>Ícone</Label>
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
                placeholder="Ex: Cigarros"
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
                  // Auto-set inputMode based on type
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
                  <SelectItem value="reduce">⬇️ Reduzir</SelectItem>
                  <SelectItem value="increase">⬆️ Aumentar</SelectItem>
                  <SelectItem value="boolean">✅ Boolean</SelectItem>
                  <SelectItem value="event">📌 Evento</SelectItem>
                  <SelectItem value="neutral">➖ Neutro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{typeDescriptions[formData.type]}</p>
            </div>

            {/* Input Mode */}
            <div className="space-y-2">
              <Label>Modo de Input</Label>
              <Select
                value={formData.inputMode}
                onValueChange={(value: TrackerInputMode) => setFormData(prev => ({ ...prev, inputMode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binary">✅ Binário (feito/não feito)</SelectItem>
                  <SelectItem value="fixedAmount">🎯 Quantidade fixa (1 clique = meta)</SelectItem>
                  <SelectItem value="incremental">➕ Incremental (+1 por clique)</SelectItem>
                  <SelectItem value="manualAmount">✏️ Manual (inserir valor)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.inputMode === "binary" && "Um clique marca o dia como completo"}
                {formData.inputMode === "fixedAmount" && "Um clique regista a meta diária completa"}
                {formData.inputMode === "incremental" && "Cada clique adiciona +1 unidade à timeline"}
                {formData.inputMode === "manualAmount" && "Abre campo para inserir quantidade personalizada"}
              </p>
            </div>

            {/* Units - hide for boolean */}
            {formData.type !== "boolean" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitSingular">{t.trackers.unitSingular}</Label>
                  <Input
                    id="unitSingular"
                    placeholder="Ex: cigarro"
                    value={formData.unitSingular}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitSingular: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPlural">{t.trackers.unitPlural}</Label>
                  <Input
                    id="unitPlural"
                    placeholder="Ex: cigarros"
                    value={formData.unitPlural}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitPlural: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Baseline and Goal - hide for boolean and event */}
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
                  <p className="text-xs text-muted-foreground">0 é válido</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyGoal">{t.trackers.dailyGoal}</Label>
                  <Input
                    id="dailyGoal"
                    type="number"
                    min="0"
                    placeholder="Opcional"
                    value={formData.dailyGoal}
                    onChange={(e) => setFormData(prev => ({ ...prev, dailyGoal: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Deixar vazio = sem meta</p>
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
                  ? "Valor negativo = despesa (ex: -1.20 para café comprado)"
                  : "0 = sem impacto financeiro"}
              </p>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: TrackerFrequency) => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="specific_days">Dias específicos</SelectItem>
                  <SelectItem value="flex">Flexível</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Days */}
            {formData.frequency === "specific_days" && (
              <div className="space-y-2">
                <Label>Dias da semana</Label>
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
              <Label htmlFor="scheduledTime">Horário (opcional)</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Define um horário para lembrete/trigger
              </p>
            </div>

            {/* Active Toggle */}
            {isEditing && (
              <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                <div>
                  <Label className="font-medium">Tracker ativo</Label>
                  <p className="text-xs text-muted-foreground">Desativa para pausar sem eliminar</p>
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
              Eliminar
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
