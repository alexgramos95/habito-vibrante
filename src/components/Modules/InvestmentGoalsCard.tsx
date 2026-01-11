import { useState } from "react";
import { format } from "date-fns";
import { Target, Plus, TrendingUp, Check, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nContext";
import { InvestmentGoal, Tracker } from "@/data/types";
import { cn } from "@/lib/utils";

interface InvestmentGoalsCardProps {
  goals: InvestmentGoal[];
  trackers: Tracker[];
  onAddGoal: (name: string, targetAmount: number, linkedTrackerIds: string[], deadline?: string) => void;
  onContribute: (goalId: string, amount: number, description?: string) => void;
  onDeleteGoal: (goalId: string) => void;
  compact?: boolean;
}

export const InvestmentGoalsCard = ({ 
  goals, 
  trackers, 
  onAddGoal, 
  onContribute, 
  onDeleteGoal,
  compact = false 
}: InvestmentGoalsCardProps) => {
  const { t, formatCurrency } = useI18n();
  const [showNewGoalDialog, setShowNewGoalDialog] = useState(false);
  const [showContributeDialog, setShowContributeDialog] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", deadline: "" });
  const [contributeAmount, setContributeAmount] = useState("");

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  const handleCreateGoal = () => {
    if (goalForm.name.trim() && goalForm.targetAmount) {
      onAddGoal(
        goalForm.name.trim(),
        parseFloat(goalForm.targetAmount),
        [],
        goalForm.deadline || undefined
      );
      setGoalForm({ name: "", targetAmount: "", deadline: "" });
      setShowNewGoalDialog(false);
    }
  };

  const handleContribute = () => {
    if (showContributeDialog && contributeAmount) {
      onContribute(showContributeDialog, parseFloat(contributeAmount));
      setContributeAmount("");
      setShowContributeDialog(null);
    }
  };

  if (compact) {
    return (
      <Card className="premium-card group hover:glow-subtle transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="p-1.5 rounded-lg bg-success/10">
              <Target className="h-4 w-4 text-success" />
            </div>
            {t.investments.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeGoals.length > 0 ? (
            <div className="space-y-2">
              <p className="text-lg font-bold">{activeGoals.length}</p>
              <p className="text-xs text-muted-foreground">{t.investments.goals.toLowerCase()}</p>
              {activeGoals[0] && (
                <div className="space-y-1">
                  <p className="text-sm truncate">{activeGoals[0].name}</p>
                  <Progress 
                    value={(activeGoals[0].currentAmount / activeGoals[0].targetAmount) * 100} 
                    className="h-1.5" 
                  />
                </div>
              )}
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowNewGoalDialog(true)}
              className="w-full text-muted-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.investments.createFirst}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5 text-success" />
              {t.investments.goals}
            </span>
            <Button size="sm" onClick={() => setShowNewGoalDialog(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              {t.investments.newGoal}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeGoals.length === 0 && completedGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>{t.investments.noGoals}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                return (
                  <div key={goal.id} className="p-4 rounded-xl bg-secondary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{goal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setShowContributeDialog(goal.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t.investments.contribute}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDeleteGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{progress.toFixed(0)}% {t.investments.progress.toLowerCase()}</span>
                      {goal.deadline && (
                        <span>{goal.deadline}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {completedGoals.length > 0 && (
                <div className="pt-4 border-t border-border/30">
                  <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    {t.investments.completed} ({completedGoals.length})
                  </p>
                  <div className="space-y-2">
                    {completedGoals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="flex items-center justify-between p-2 rounded-lg bg-success/10">
                        <span className="text-sm">{goal.name}</span>
                        <Badge variant="secondary">{formatCurrency(goal.targetAmount)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Goal Dialog */}
      <Dialog open={showNewGoalDialog} onOpenChange={setShowNewGoalDialog}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>{t.investments.newGoal}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.investments.goalName}</Label>
              <Input
                value={goalForm.name}
                onChange={(e) => setGoalForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Férias, Fundo de emergência..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t.investments.targetAmount}</Label>
              <Input
                type="number"
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.investments.deadline} (opcional)</Label>
              <Input
                type="date"
                value={goalForm.deadline}
                onChange={(e) => setGoalForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGoalDialog(false)}>
              {t.actions.cancel}
            </Button>
            <Button onClick={handleCreateGoal} disabled={!goalForm.name.trim() || !goalForm.targetAmount}>
              {t.actions.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={!!showContributeDialog} onOpenChange={() => setShowContributeDialog(null)}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>{t.investments.manualContribution}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.finances.contributionValue}</Label>
              <Input
                type="number"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContributeDialog(null)}>
              {t.actions.cancel}
            </Button>
            <Button onClick={handleContribute} disabled={!contributeAmount}>
              {t.investments.contribute}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};