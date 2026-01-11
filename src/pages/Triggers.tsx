import { useState, useEffect } from "react";
import { Bell, Clock, Zap, Plus, Trash2, Power } from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";

interface Trigger {
  id: string;
  type: 'alarm' | 'event';
  name: string;
  time?: string; // for alarms
  eventTrigger?: string; // for events
  action: string;
  repeat: 'daily' | 'weekdays' | 'weekends' | 'custom';
  active: boolean;
}

const STORAGE_KEY = 'itero-triggers';

const loadTriggers = (): Trigger[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveTriggers = (triggers: Trigger[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(triggers));
};

const Triggers = () => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [triggers, setTriggers] = useState<Trigger[]>(() => loadTriggers());
  const [showNewAlarmDialog, setShowNewAlarmDialog] = useState(false);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  
  const [alarmForm, setAlarmForm] = useState({
    name: "",
    time: "08:00",
    action: "",
    repeat: "daily" as const,
  });
  
  const [eventForm, setEventForm] = useState({
    name: "",
    eventTrigger: "onWakeUp",
    action: "",
  });

  useEffect(() => {
    saveTriggers(triggers);
  }, [triggers]);

  const alarms = triggers.filter(t => t.type === 'alarm');
  const events = triggers.filter(t => t.type === 'event');

  const handleAddAlarm = () => {
    if (!alarmForm.name.trim() || !alarmForm.action.trim()) {
      toast({ title: "Preenche os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    const newTrigger: Trigger = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'alarm',
      name: alarmForm.name.trim(),
      time: alarmForm.time,
      action: alarmForm.action.trim(),
      repeat: alarmForm.repeat,
      active: true,
    };
    
    setTriggers(prev => [...prev, newTrigger]);
    setShowNewAlarmDialog(false);
    setAlarmForm({ name: "", time: "08:00", action: "", repeat: "daily" });
    toast({ title: "Alarme criado" });
  };

  const handleAddEvent = () => {
    if (!eventForm.name.trim() || !eventForm.action.trim()) {
      toast({ title: "Preenche os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    const newTrigger: Trigger = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'event',
      name: eventForm.name.trim(),
      eventTrigger: eventForm.eventTrigger,
      action: eventForm.action.trim(),
      repeat: 'daily',
      active: true,
    };
    
    setTriggers(prev => [...prev, newTrigger]);
    setShowNewEventDialog(false);
    setEventForm({ name: "", eventTrigger: "onWakeUp", action: "" });
    toast({ title: "Evento criado" });
  };

  const handleToggle = (id: string) => {
    setTriggers(prev => prev.map(t => 
      t.id === id ? { ...t, active: !t.active } : t
    ));
  };

  const handleDelete = (id: string) => {
    setTriggers(prev => prev.filter(t => t.id !== id));
    toast({ title: "Trigger eliminado" });
  };

  const getEventTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      onWakeUp: t.triggers.onWakeUp,
      onSleep: t.triggers.onSleep,
      afterMeal: t.triggers.afterMeal,
    };
    return labels[trigger] || trigger;
  };

  const getRepeatLabel = (repeat: string) => {
    const labels: Record<string, string> = {
      daily: t.triggers.daily,
      weekdays: t.triggers.weekdays,
      weekends: t.triggers.weekends,
      custom: t.triggers.custom,
    };
    return labels[repeat] || repeat;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t.triggers.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t.motivational.consistencyWins}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewEventDialog(true)} className="gap-2">
              <Zap className="h-4 w-4" />
              {t.triggers.newEvent}
            </Button>
            <Button onClick={() => setShowNewAlarmDialog(true)} className="gap-2">
              <Clock className="h-4 w-4" />
              {t.triggers.newAlarm}
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {triggers.length === 0 ? (
          <Card className="glass border-border/30">
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">{t.triggers.noTriggers}</p>
              <p className="text-sm text-muted-foreground mb-6">{t.triggers.noTriggersDescription}</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setShowNewEventDialog(true)}>
                  <Zap className="h-4 w-4 mr-2" />
                  {t.triggers.newEvent}
                </Button>
                <Button onClick={() => setShowNewAlarmDialog(true)}>
                  <Clock className="h-4 w-4 mr-2" />
                  {t.triggers.newAlarm}
                </Button>
              </div>
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
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alarms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sem alarmes definidos
                  </p>
                ) : (
                  alarms.map(alarm => (
                    <div
                      key={alarm.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border border-border/30 transition-all",
                        alarm.active ? "bg-secondary/50" : "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-mono font-bold text-primary">
                          {alarm.time}
                        </div>
                        <div>
                          <p className="font-medium">{alarm.name}</p>
                          <p className="text-sm text-muted-foreground">{alarm.action}</p>
                          <p className="text-xs text-muted-foreground">{getRepeatLabel(alarm.repeat)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alarm.active}
                          onCheckedChange={() => handleToggle(alarm.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(alarm.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Events */}
            <Card className="glass border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-warning" />
                  {t.triggers.events}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sem eventos definidos
                  </p>
                ) : (
                  events.map(event => (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border border-border/30 transition-all",
                        event.active ? "bg-secondary/50" : "opacity-50"
                      )}
                    >
                      <div>
                        <p className="font-medium">{event.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getEventTriggerLabel(event.eventTrigger || "")} → {event.action}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={event.active}
                          onCheckedChange={() => handleToggle(event.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(event.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* New Alarm Dialog */}
      <Dialog open={showNewAlarmDialog} onOpenChange={setShowNewAlarmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.triggers.newAlarm}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Dormir"
                value={alarmForm.name}
                onChange={(e) => setAlarmForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.triggers.time}</Label>
              <Input
                type="time"
                value={alarmForm.time}
                onChange={(e) => setAlarmForm(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.triggers.action}</Label>
              <Input
                placeholder="Ex: Preparar para dormir"
                value={alarmForm.action}
                onChange={(e) => setAlarmForm(prev => ({ ...prev, action: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.triggers.repeat}</Label>
              <Select
                value={alarmForm.repeat}
                onValueChange={(value: any) => setAlarmForm(prev => ({ ...prev, repeat: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t.triggers.daily}</SelectItem>
                  <SelectItem value="weekdays">{t.triggers.weekdays}</SelectItem>
                  <SelectItem value="weekends">{t.triggers.weekends}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAlarmDialog(false)}>
              {t.actions.cancel}
            </Button>
            <Button onClick={handleAddAlarm}>{t.actions.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Event Dialog */}
      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.triggers.newEvent}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Beber água"
                value={eventForm.name}
                onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.triggers.eventTrigger}</Label>
              <Select
                value={eventForm.eventTrigger}
                onValueChange={(value) => setEventForm(prev => ({ ...prev, eventTrigger: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onWakeUp">{t.triggers.onWakeUp}</SelectItem>
                  <SelectItem value="onSleep">{t.triggers.onSleep}</SelectItem>
                  <SelectItem value="afterMeal">{t.triggers.afterMeal}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.triggers.thenDo}</Label>
              <Input
                placeholder="Ex: Beber 500ml de água"
                value={eventForm.action}
                onChange={(e) => setEventForm(prev => ({ ...prev, action: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEventDialog(false)}>
              {t.actions.cancel}
            </Button>
            <Button onClick={handleAddEvent}>{t.actions.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Triggers;
