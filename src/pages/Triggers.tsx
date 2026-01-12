import { useState, useEffect } from "react";
import { Bell, Clock, Zap, Plus, Trash2, Power, Link2, Edit2, Check, X } from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { AppState, Trigger, Habit, Tracker } from "@/data/types";
import { loadState, saveState, addTrigger, updateTrigger, deleteTrigger, generateId } from "@/data/storage";

const WEEKDAYS = [
  { value: 0, labelPT: "Dom", labelEN: "Sun" },
  { value: 1, labelPT: "Seg", labelEN: "Mon" },
  { value: 2, labelPT: "Ter", labelEN: "Tue" },
  { value: 3, labelPT: "Qua", labelEN: "Wed" },
  { value: 4, labelPT: "Qui", labelEN: "Thu" },
  { value: 5, labelPT: "Sex", labelEN: "Fri" },
  { value: 6, labelPT: "Sáb", labelEN: "Sat" },
];

const Triggers = () => {
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const [state, setState] = useState<AppState>(() => loadState());
  const [showNewTriggerDialog, setShowNewTriggerDialog] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  
  const [form, setForm] = useState({
    type: "alarm" as "alarm" | "event",
    name: "",
    time: "08:00",
    repeat: "daily" as "daily" | "weekdays" | "weekends" | "custom",
    customDays: [] as number[],
    eventTrigger: "wake" as "wake" | "sleep" | "meal" | "custom",
    customTrigger: "",
    action: "",
    linkedHabitId: "",
    linkedTrackerId: "",
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const triggers = state.triggers || [];
  const alarms = triggers.filter(t => t.type === 'alarm');
  const events = triggers.filter(t => t.type === 'event');
  const habits = state.habits.filter(h => h.active);
  const trackers = (state.trackers || []).filter(t => t.active);

  const resetForm = () => {
    setForm({
      type: "alarm",
      name: "",
      time: "08:00",
      repeat: "daily",
      customDays: [],
      eventTrigger: "wake",
      customTrigger: "",
      action: "",
      linkedHabitId: "",
      linkedTrackerId: "",
    });
    setEditingTrigger(null);
  };

  const openEditDialog = (trigger: Trigger) => {
    setEditingTrigger(trigger);
    setForm({
      type: trigger.type,
      name: trigger.name,
      time: trigger.time || "08:00",
      repeat: trigger.repeat || "daily",
      customDays: trigger.customDays || [],
      eventTrigger: trigger.eventTrigger || "wake",
      customTrigger: trigger.customTrigger || "",
      action: trigger.action,
      linkedHabitId: trigger.linkedHabitId || "",
      linkedTrackerId: trigger.linkedTrackerId || "",
    });
    setShowNewTriggerDialog(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.action.trim()) {
      toast({ 
        title: locale === 'pt-PT' ? "Preenche os campos obrigatórios" : "Fill in required fields", 
        variant: "destructive" 
      });
      return;
    }

    const triggerData: Omit<Trigger, "id" | "createdAt"> = {
      type: form.type,
      name: form.name.trim(),
      time: form.type === 'alarm' ? form.time : undefined,
      repeat: form.repeat,
      customDays: form.repeat === 'custom' ? form.customDays : undefined,
      eventTrigger: form.type === 'event' ? form.eventTrigger : undefined,
      customTrigger: form.eventTrigger === 'custom' ? form.customTrigger : undefined,
      action: form.action.trim(),
      linkedHabitId: form.linkedHabitId || undefined,
      linkedTrackerId: form.linkedTrackerId || undefined,
      active: true,
    };

    if (editingTrigger) {
      setState(prev => updateTrigger(prev, editingTrigger.id, triggerData));
      toast({ title: locale === 'pt-PT' ? "Trigger atualizado" : "Trigger updated" });
    } else {
      setState(prev => addTrigger(prev, triggerData));
      toast({ title: locale === 'pt-PT' ? "Trigger criado" : "Trigger created" });
    }

    setShowNewTriggerDialog(false);
    resetForm();
  };

  const handleToggle = (id: string) => {
    const trigger = triggers.find(t => t.id === id);
    if (trigger) {
      setState(prev => updateTrigger(prev, id, { active: !trigger.active }));
    }
  };

  const handleDelete = (id: string) => {
    setState(prev => deleteTrigger(prev, id));
    toast({ title: locale === 'pt-PT' ? "Trigger eliminado" : "Trigger deleted" });
  };

  const toggleDay = (day: number) => {
    setForm(prev => ({
      ...prev,
      customDays: prev.customDays.includes(day)
        ? prev.customDays.filter(d => d !== day)
        : [...prev.customDays, day].sort()
    }));
  };

  const getEventTriggerLabel = (trigger: string) => {
    const labels: Record<string, { pt: string, en: string }> = {
      wake: { pt: "Ao acordar", en: "On wake up" },
      sleep: { pt: "Antes de dormir", en: "Before sleep" },
      meal: { pt: "Após refeição", en: "After meal" },
      custom: { pt: "Personalizado", en: "Custom" },
    };
    return labels[trigger]?.[locale === 'pt-PT' ? 'pt' : 'en'] || trigger;
  };

  const getRepeatLabel = (repeat: string, customDays?: number[]) => {
    const labels: Record<string, { pt: string, en: string }> = {
      daily: { pt: "Diário", en: "Daily" },
      weekdays: { pt: "Dias úteis", en: "Weekdays" },
      weekends: { pt: "Fins de semana", en: "Weekends" },
      custom: { pt: "Personalizado", en: "Custom" },
    };
    
    if (repeat === 'custom' && customDays && customDays.length > 0) {
      const dayLabels = customDays.map(d => 
        WEEKDAYS.find(w => w.value === d)?.[locale === 'pt-PT' ? 'labelPT' : 'labelEN']
      ).join(', ');
      return dayLabels;
    }
    
    return labels[repeat]?.[locale === 'pt-PT' ? 'pt' : 'en'] || repeat;
  };

  const getLinkedItemLabel = (habitId?: string, trackerId?: string) => {
    if (habitId) {
      const habit = habits.find(h => h.id === habitId);
      return habit ? `🎯 ${habit.nome}` : null;
    }
    if (trackerId) {
      const tracker = trackers.find(t => t.id === trackerId);
      return tracker ? `${tracker.icon || '📊'} ${tracker.name}` : null;
    }
    return null;
  };

  const renderTriggerCard = (trigger: Trigger) => {
    const linkedLabel = getLinkedItemLabel(trigger.linkedHabitId, trigger.linkedTrackerId);
    
    return (
      <div
        key={trigger.id}
        className={cn(
          "flex items-center justify-between p-4 rounded-xl border border-border/30 transition-all",
          trigger.active ? "bg-secondary/50" : "opacity-50 bg-muted/30"
        )}
      >
        <div className="flex items-center gap-4 flex-1">
          {trigger.type === 'alarm' && (
            <div className="text-2xl font-mono font-bold text-primary">
              {trigger.time}
            </div>
          )}
          {trigger.type === 'event' && (
            <div className="p-2 rounded-lg bg-warning/10">
              <Zap className="h-5 w-5 text-warning" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{trigger.name}</p>
            <p className="text-sm text-muted-foreground truncate">{trigger.action}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {getRepeatLabel(trigger.repeat || 'daily', trigger.customDays)}
              </Badge>
              {trigger.type === 'event' && (
                <Badge variant="secondary" className="text-xs">
                  {getEventTriggerLabel(trigger.eventTrigger || 'wake')}
                </Badge>
              )}
              {linkedLabel && (
                <Badge variant="secondary" className="text-xs">
                  <Link2 className="h-3 w-3 mr-1" />
                  {linkedLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(trigger)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Switch
            checked={trigger.active}
            onCheckedChange={() => handleToggle(trigger.id)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(trigger.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gradient">
              {t.triggers.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === 'pt-PT' 
                ? 'Alarmes e lembretes para manter a consistência' 
                : 'Alarms and reminders to maintain consistency'}
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowNewTriggerDialog(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            {locale === 'pt-PT' ? 'Novo Trigger' : 'New Trigger'}
          </Button>
        </div>

        {/* Empty State */}
        {triggers.length === 0 ? (
          <Card className="glass border-border/30">
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">{t.triggers.noTriggers}</p>
              <p className="text-sm text-muted-foreground mb-6">{t.triggers.noTriggersDescription}</p>
              <Button onClick={() => { resetForm(); setShowNewTriggerDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {locale === 'pt-PT' ? 'Criar Primeiro Trigger' : 'Create First Trigger'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Alarms */}
            <Card className="glass border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {t.triggers.alarms}
                  <Badge variant="secondary" className="ml-auto">{alarms.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alarms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {locale === 'pt-PT' ? 'Sem alarmes definidos' : 'No alarms set'}
                  </p>
                ) : (
                  alarms.map(renderTriggerCard)
                )}
              </CardContent>
            </Card>

            {/* Events */}
            <Card className="glass border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-warning" />
                  {t.triggers.events}
                  <Badge variant="secondary" className="ml-auto">{events.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {locale === 'pt-PT' ? 'Sem eventos definidos' : 'No events set'}
                  </p>
                ) : (
                  events.map(renderTriggerCard)
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* New/Edit Trigger Dialog */}
      <Dialog open={showNewTriggerDialog} onOpenChange={(open) => { setShowNewTriggerDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTrigger 
                ? (locale === 'pt-PT' ? 'Editar Trigger' : 'Edit Trigger')
                : (locale === 'pt-PT' ? 'Novo Trigger' : 'New Trigger')}
            </DialogTitle>
            <DialogDescription>
              {locale === 'pt-PT' 
                ? 'Define alarmes ou eventos para te lembrar dos teus hábitos'
                : 'Set alarms or events to remind you of your habits'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label>{locale === 'pt-PT' ? 'Tipo' : 'Type'}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.type === 'alarm' ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={() => setForm(prev => ({ ...prev, type: 'alarm' }))}
                >
                  <Clock className="h-4 w-4" />
                  {t.triggers.alarms.replace('s', '')}
                </Button>
                <Button
                  type="button"
                  variant={form.type === 'event' ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={() => setForm(prev => ({ ...prev, type: 'event' }))}
                >
                  <Zap className="h-4 w-4" />
                  {t.triggers.events.replace('s', '')}
                </Button>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>{locale === 'pt-PT' ? 'Nome' : 'Name'} *</Label>
              <Input
                placeholder={locale === 'pt-PT' ? 'Ex: Hora de dormir' : 'Ex: Bedtime'}
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Time (for alarms) */}
            {form.type === 'alarm' && (
              <div className="space-y-2">
                <Label>{t.triggers.time}</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            )}

            {/* Event Trigger (for events) */}
            {form.type === 'event' && (
              <div className="space-y-2">
                <Label>{t.triggers.eventTrigger}</Label>
                <Select
                  value={form.eventTrigger}
                  onValueChange={(value: any) => setForm(prev => ({ ...prev, eventTrigger: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wake">{getEventTriggerLabel('wake')}</SelectItem>
                    <SelectItem value="sleep">{getEventTriggerLabel('sleep')}</SelectItem>
                    <SelectItem value="meal">{getEventTriggerLabel('meal')}</SelectItem>
                    <SelectItem value="custom">{getEventTriggerLabel('custom')}</SelectItem>
                  </SelectContent>
                </Select>
                {form.eventTrigger === 'custom' && (
                  <Input
                    placeholder={locale === 'pt-PT' ? 'Descreve o gatilho' : 'Describe the trigger'}
                    value={form.customTrigger}
                    onChange={(e) => setForm(prev => ({ ...prev, customTrigger: e.target.value }))}
                  />
                )}
              </div>
            )}

            {/* Action */}
            <div className="space-y-2">
              <Label>{t.triggers.action} *</Label>
              <Input
                placeholder={locale === 'pt-PT' ? 'Ex: Preparar para dormir' : 'Ex: Prepare for bed'}
                value={form.action}
                onChange={(e) => setForm(prev => ({ ...prev, action: e.target.value }))}
              />
            </div>

            {/* Repeat */}
            <div className="space-y-2">
              <Label>{t.triggers.repeat}</Label>
              <Select
                value={form.repeat}
                onValueChange={(value: any) => setForm(prev => ({ ...prev, repeat: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{getRepeatLabel('daily')}</SelectItem>
                  <SelectItem value="weekdays">{getRepeatLabel('weekdays')}</SelectItem>
                  <SelectItem value="weekends">{getRepeatLabel('weekends')}</SelectItem>
                  <SelectItem value="custom">{getRepeatLabel('custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Days */}
            {form.repeat === 'custom' && (
              <div className="space-y-2">
                <Label>{locale === 'pt-PT' ? 'Dias da semana' : 'Days of week'}</Label>
                <div className="flex gap-1 flex-wrap">
                  {WEEKDAYS.map(day => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={form.customDays.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      className="w-10 h-10"
                      onClick={() => toggleDay(day.value)}
                    >
                      {locale === 'pt-PT' ? day.labelPT : day.labelEN}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Link to Habit */}
            {habits.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  {locale === 'pt-PT' ? 'Associar a hábito' : 'Link to habit'}
                </Label>
                <Select
                  value={form.linkedHabitId}
                  onValueChange={(value) => setForm(prev => ({ 
                    ...prev, 
                    linkedHabitId: value === 'none' ? '' : value,
                    linkedTrackerId: value !== 'none' ? '' : prev.linkedTrackerId
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={locale === 'pt-PT' ? 'Selecionar...' : 'Select...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{locale === 'pt-PT' ? 'Nenhum' : 'None'}</SelectItem>
                    {habits.map(habit => (
                      <SelectItem key={habit.id} value={habit.id}>
                        🎯 {habit.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Link to Tracker */}
            {trackers.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  {locale === 'pt-PT' ? 'Associar a tracker' : 'Link to tracker'}
                </Label>
                <Select
                  value={form.linkedTrackerId}
                  onValueChange={(value) => setForm(prev => ({ 
                    ...prev, 
                    linkedTrackerId: value === 'none' ? '' : value,
                    linkedHabitId: value !== 'none' ? '' : prev.linkedHabitId
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={locale === 'pt-PT' ? 'Selecionar...' : 'Select...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{locale === 'pt-PT' ? 'Nenhum' : 'None'}</SelectItem>
                    {trackers.map(tracker => (
                      <SelectItem key={tracker.id} value={tracker.id}>
                        {tracker.icon || '📊'} {tracker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewTriggerDialog(false); resetForm(); }}>
              {t.actions.cancel}
            </Button>
            <Button onClick={handleSave}>
              {editingTrigger ? t.actions.update : t.actions.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Triggers;