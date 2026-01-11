import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Cigarette, Target, TrendingUp, TrendingDown, PiggyBank, 
  Plus, Minus, Wallet, BarChart3, Calendar, Euro,
  CheckCircle2, Clock, Gift, Sparkles
} from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AppState, INVESTMENT_PLATFORMS, GOAL_SOURCES, PurchaseGoal } from "@/data/types";
import {
  loadState, saveState, addCigaretteLog, deleteCigaretteLog,
  getCigaretteLogsForDate, updateTobaccoConfig, addPurchaseGoal,
  addGoalContribution, completePurchaseGoal, convertGoalToHabit,
  deletePurchaseGoal
} from "@/data/storage";
import {
  calculateTobaccoSummary, getTobaccoDailyData, calculateGoalProgress,
  getFinancialKPIs, getMotivationalFinanceMessage
} from "@/logic/computations";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, Legend, BarChart, Bar
} from "recharts";

const Financas = () => {
  const { toast } = useToast();
  const [state, setState] = useState<AppState>(() => loadState());
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  
  // Dialogs
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showNewGoalDialog, setShowNewGoalDialog] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState<string | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState<string | null>(null);
  
  // Forms
  const [configForm, setConfigForm] = useState({
    numCigarrosPorMaco: state.tobaccoConfig.numCigarrosPorMaco.toString(),
    precoPorMaco: state.tobaccoConfig.precoPorMaco.toString(),
    baselineDeclarado: state.tobaccoConfig.baselineDeclarado.toString(),
  });
  
  const [goalForm, setGoalForm] = useState({
    nome: "",
    valorAlvo: "",
    prazoEmDias: "90",
    fontesPoupanca: [] as string[],
  });
  
  const [contributionForm, setContributionForm] = useState({
    amount: "",
    fonte: "manual" as 'manual' | 'tabaco' | 'investimento',
    descricao: "",
    investmentPlatform: "",
  });
  
  const [purchaseForm, setPurchaseForm] = useState({
    loja: "",
    precoFinal: "",
    notas: "",
  });
  
  const [convertHabitForm, setConvertHabitForm] = useState({
    nome: "",
    categoria: "",
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Computed values
  const tobaccoSummary = calculateTobaccoSummary(state);
  const todayLogs = getCigaretteLogsForDate(state, todayStr);
  const financialKPIs = getFinancialKPIs(state, today.getFullYear(), today.getMonth());
  const tobaccoDailyData = getTobaccoDailyData(state, today.getFullYear(), today.getMonth());
  
  const activeGoals = state.purchaseGoals.filter(g => !g.completed);
  const completedGoals = state.purchaseGoals.filter(g => g.completed);
  
  const motivationalMessage = getMotivationalFinanceMessage(
    tobaccoSummary,
    activeGoals[0] ? calculateGoalProgress(activeGoals[0]) : undefined
  );

  // Handlers
  const handleAddCigarette = () => {
    setState(prev => addCigaretteLog(prev));
    toast({ title: "+1 cigarro registado" });
  };

  const handleRemoveCigarette = (id: string) => {
    setState(prev => deleteCigaretteLog(prev, id));
    toast({ title: "Registo removido" });
  };

  const handleSaveConfig = () => {
    setState(prev => updateTobaccoConfig(prev, {
      numCigarrosPorMaco: parseInt(configForm.numCigarrosPorMaco) || 20,
      precoPorMaco: parseFloat(configForm.precoPorMaco) || 6.20,
      baselineDeclarado: parseInt(configForm.baselineDeclarado) || 20,
    }));
    setShowConfigDialog(false);
    toast({ title: "Configurações atualizadas!" });
  };

  const handleCreateGoal = () => {
    if (!goalForm.nome.trim() || !goalForm.valorAlvo) {
      toast({ title: "Preenche todos os campos", variant: "destructive" });
      return;
    }
    
    setState(prev => addPurchaseGoal(prev, {
      nome: goalForm.nome.trim(),
      valorAlvo: parseFloat(goalForm.valorAlvo),
      prazoEmDias: parseInt(goalForm.prazoEmDias) || 90,
      dataInicio: todayStr,
      fontesPoupanca: goalForm.fontesPoupanca as any[],
    }));
    
    setShowNewGoalDialog(false);
    setGoalForm({ nome: "", valorAlvo: "", prazoEmDias: "90", fontesPoupanca: [] });
    toast({ title: "Meta criada!" });
  };

  const handleAddContribution = () => {
    if (!contributionForm.amount || !showContributionDialog) return;
    
    setState(prev => addGoalContribution(prev, showContributionDialog, {
      date: todayStr,
      amount: parseFloat(contributionForm.amount),
      fonte: contributionForm.fonte,
      descricao: contributionForm.descricao || "Contribuição manual",
      investmentPlatform: contributionForm.investmentPlatform || undefined,
    }));
    
    setShowContributionDialog(null);
    setContributionForm({ amount: "", fonte: "manual", descricao: "", investmentPlatform: "" });
    toast({ title: `+${parseFloat(contributionForm.amount).toFixed(2)}€ adicionados!` });
  };

  const handleCompletePurchase = () => {
    if (!purchaseForm.loja || !purchaseForm.precoFinal || !showPurchaseDialog) return;
    
    setState(prev => completePurchaseGoal(prev, showPurchaseDialog, {
      loja: purchaseForm.loja,
      precoFinal: parseFloat(purchaseForm.precoFinal),
      data: todayStr,
      notas: purchaseForm.notas || undefined,
    }));
    
    setShowPurchaseDialog(null);
    setPurchaseForm({ loja: "", precoFinal: "", notas: "" });
    toast({ title: "🎉 Compra registada! Parabéns!" });
    
    // Suggest converting to habit
    setTimeout(() => {
      setShowConvertDialog(showPurchaseDialog);
    }, 500);
  };

  const handleConvertToHabit = () => {
    if (!convertHabitForm.nome.trim() || !showConvertDialog) return;
    
    setState(prev => convertGoalToHabit(prev, showConvertDialog, {
      nome: convertHabitForm.nome.trim(),
      categoria: convertHabitForm.categoria || undefined,
      active: true,
    }));
    
    setShowConvertDialog(null);
    setConvertHabitForm({ nome: "", categoria: "" });
    toast({ title: "Novo hábito criado a partir da meta!" });
  };

  const handleDeleteGoal = (goalId: string) => {
    setState(prev => deletePurchaseGoal(prev, goalId));
    toast({ title: "Meta eliminada" });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gradient">Finanças & Poupança</h1>
            <p className="text-muted-foreground text-sm mt-1">{motivationalMessage}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
              <Cigarette className="h-4 w-4 mr-1" />
              Configurar Tabaco
            </Button>
            <Button size="sm" onClick={() => setShowNewGoalDialog(true)}>
              <Target className="h-4 w-4 mr-1" />
              Nova Meta
            </Button>
          </div>
        </div>

        {/* Financial KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass border-border/30 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Cigarette className="h-4 w-4 text-warning" />
                Poupança Tabaco (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">{tobaccoSummary.poupancaMensal.toFixed(2)} €</p>
              <p className="text-xs text-muted-foreground mt-1">
                Acumulado: {tobaccoSummary.poupancaAcumulada.toFixed(2)} €
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/30 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" />
                Dias Abaixo Baseline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{tobaccoSummary.streakDiasAbaixoBaseline}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Média 30 dias: {tobaccoSummary.mediaUltimos30Dias.toFixed(1)} cig/dia
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/30 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-success" />
                Investimentos (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{financialKPIs.contribuicoesInvestimento.toFixed(2)} €</p>
              <p className="text-xs text-muted-foreground mt-1">
                Em plataformas registadas
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/30 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Gift className="h-4 w-4 text-accent" />
                Compras de Metas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{financialKPIs.comprasMetas.toFixed(2)} €</p>
              <p className="text-xs text-muted-foreground mt-1">
                Objetivos cumpridos
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tobacco" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="tobacco" className="gap-2">
              <Cigarette className="h-4 w-4" />
              <span className="hidden sm:inline">Tabaco</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Metas</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* TOBACCO TAB */}
          <TabsContent value="tobacco" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Today's Tracking */}
              <Card className="glass border-border/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Hoje
                    </span>
                    <Badge variant={tobaccoSummary.consumoHoje < state.tobaccoConfig.baselineDeclarado ? "default" : "destructive"}>
                      {tobaccoSummary.consumoHoje} / {state.tobaccoConfig.baselineDeclarado}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      size="lg"
                      onClick={handleAddCigarette}
                      className="gap-2 text-lg h-16 px-8 bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70"
                    >
                      <Plus className="h-6 w-6" />
                      +1 Cigarro
                    </Button>
                  </div>

                  {tobaccoSummary.poupancaHoje > 0 && (
                    <div className="text-center p-4 rounded-xl bg-success/10 border border-success/30">
                      <p className="text-success font-semibold">
                        💰 Poupaste {tobaccoSummary.poupancaHoje.toFixed(2)}€ hoje!
                      </p>
                    </div>
                  )}

                  {/* Timeline */}
                  {todayLogs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Timeline de hoje</h4>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {todayLogs.map((log, idx) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">
                                {format(parseISO(log.timestamp), "HH:mm")}
                              </span>
                              <span className="text-sm">Cigarro #{idx + 1}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveCigarette(log.id)}
                            >
                              <Minus className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Chart */}
              <Card className="glass border-border/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Evolução Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={tobaccoDailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => format(parseISO(val), "d")}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelFormatter={(val) => format(parseISO(val as string), "d 'de' MMMM", { locale: pt })}
                        formatter={(value: number, name: string) => {
                          if (name === "consumo") return [`${value} cigarros`, "Consumo"];
                          if (name === "baseline") return [`${value}`, "Baseline"];
                          if (name === "poupanca") return [`${value.toFixed(2)}€`, "Poupança"];
                          return [value, name];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="baseline"
                        stroke="hsl(var(--muted-foreground))"
                        fill="transparent"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                      />
                      <Area
                        type="monotone"
                        dataKey="consumo"
                        stroke="hsl(var(--warning))"
                        fill="hsl(var(--warning) / 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* GOALS TAB */}
          <TabsContent value="goals" className="space-y-6">
            {/* Active Goals */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Metas Ativas ({activeGoals.length})
              </h3>

              {activeGoals.length === 0 ? (
                <Card className="glass border-border/30 p-8 text-center">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Ainda não tens metas definidas.</p>
                  <Button className="mt-4" onClick={() => setShowNewGoalDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Criar primeira meta
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeGoals.map((goal) => {
                    const progress = calculateGoalProgress(goal);
                    return (
                      <Card key={goal.id} className="glass border-border/30 shadow-lg overflow-hidden">
                        <div 
                          className="h-1 bg-gradient-to-r from-primary to-success"
                          style={{ width: `${progress.percentual}%` }}
                        />
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between">
                            <span className="text-lg">{goal.nome}</span>
                            <Badge variant={progress.acimaDoPrazo ? "default" : "secondary"}>
                              {progress.acimaDoPrazo ? "No ritmo" : "Atrás"}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progresso</span>
                              <span className="font-semibold">
                                {progress.totalContribuido.toFixed(2)}€ / {goal.valorAlvo.toFixed(2)}€
                              </span>
                            </div>
                            <Progress value={progress.percentual} className="h-3" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{Math.round(progress.percentual)}%</span>
                              <span>{progress.diasRestantes} dias restantes</span>
                            </div>
                          </div>

                          {progress.previsaoDias < 999 && (
                            <p className="text-xs text-muted-foreground italic">
                              📊 A este ritmo: ~{progress.previsaoDias} dias para concluir
                            </p>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => setShowContributionDialog(goal.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Contribuir
                            </Button>
                            {progress.percentual >= 100 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-success text-success hover:bg-success/10"
                                onClick={() => setShowPurchaseDialog(goal.id)}
                              >
                                <Gift className="h-4 w-4 mr-1" />
                                Comprar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Metas Concluídas ({completedGoals.length})
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {completedGoals.map((goal) => (
                    <Card key={goal.id} className="glass border-success/30 bg-success/5 shadow-lg">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{goal.nome}</span>
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {goal.purchaseDetails?.loja} • {goal.purchaseDetails?.precoFinal.toFixed(2)}€
                        </p>
                        {goal.purchaseDetails?.data && (
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(goal.purchaseDetails.data), "d 'de' MMMM yyyy", { locale: pt })}
                          </p>
                        )}
                        {goal.convertedToHabitId && (
                          <Badge variant="outline" className="text-xs">
                            ✓ Convertido em hábito
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Savings History Chart */}
              <Card className="glass border-border/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PiggyBank className="h-5 w-5 text-success" />
                    Poupança Acumulada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-xl bg-success/10 border border-success/30">
                        <p className="text-2xl font-bold text-success">
                          {tobaccoSummary.poupancaAcumulada.toFixed(2)} €
                        </p>
                        <p className="text-xs text-muted-foreground">Tabaco (total)</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/30">
                        <p className="text-2xl font-bold text-primary">
                          {state.savings.reduce((sum, s) => sum + s.amount, 0).toFixed(2)} €
                        </p>
                        <p className="text-xs text-muted-foreground">Outras poupanças</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Investments Summary */}
              <Card className="glass border-border/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-accent" />
                    Investimentos Simbólicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {state.purchaseGoals
                      .flatMap(g => g.contribuicoes)
                      .filter(c => c.fonte === 'investimento')
                      .slice(-5)
                      .reverse()
                      .map((contrib) => (
                        <div key={contrib.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                          <div>
                            <p className="font-medium text-sm">{contrib.investmentPlatform || "Investimento"}</p>
                            <p className="text-xs text-muted-foreground">{contrib.descricao}</p>
                          </div>
                          <span className="text-success font-semibold">{contrib.amount.toFixed(2)} €</span>
                        </div>
                      ))}
                    {state.purchaseGoals.flatMap(g => g.contribuicoes).filter(c => c.fonte === 'investimento').length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        Ainda não tens investimentos registados.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Contributions */}
            <Card className="glass border-border/30 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-primary" />
                  Histórico de Contribuições
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {state.purchaseGoals
                    .flatMap(g => g.contribuicoes.map(c => ({ ...c, goalName: g.nome })))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 20)
                    .map((contrib: any) => (
                      <div key={contrib.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {contrib.fonte}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{contrib.goalName}</p>
                            <p className="text-xs text-muted-foreground">{contrib.descricao}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success">+{contrib.amount.toFixed(2)} €</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(contrib.date), "dd/MM")}
                          </p>
                        </div>
                      </div>
                    ))}
                  {state.purchaseGoals.flatMap(g => g.contribuicoes).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Ainda não tens contribuições registadas.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* CONFIG DIALOG */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Tracking de Tabaco</DialogTitle>
            <DialogDescription>
              Define os teus parâmetros para calcular a poupança.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cigarros por maço</Label>
              <Input
                type="number"
                value={configForm.numCigarrosPorMaco}
                onChange={(e) => setConfigForm(f => ({ ...f, numCigarrosPorMaco: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço por maço (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={configForm.precoPorMaco}
                onChange={(e) => setConfigForm(f => ({ ...f, precoPorMaco: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Baseline diário (cigarros/dia)</Label>
              <Input
                type="number"
                value={configForm.baselineDeclarado}
                onChange={(e) => setConfigForm(f => ({ ...f, baselineDeclarado: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                O teu consumo típico antes de começar a reduzir
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW GOAL DIALOG */}
      <Dialog open={showNewGoalDialog} onOpenChange={setShowNewGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Meta de Compra</DialogTitle>
            <DialogDescription>
              Define um objetivo financeiro para te motivar a poupar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da meta</Label>
              <Input
                placeholder="Ex: Guitarra, Viagem, Novo telemóvel..."
                value={goalForm.nome}
                onChange={(e) => setGoalForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor alvo (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="800.00"
                value={goalForm.valorAlvo}
                onChange={(e) => setGoalForm(f => ({ ...f, valorAlvo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo (dias)</Label>
              <Input
                type="number"
                value={goalForm.prazoEmDias}
                onChange={(e) => setGoalForm(f => ({ ...f, prazoEmDias: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGoalDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateGoal}>Criar Meta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONTRIBUTION DIALOG */}
      <Dialog open={!!showContributionDialog} onOpenChange={() => setShowContributionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Contribuição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="50.00"
                value={contributionForm.amount}
                onChange={(e) => setContributionForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select
                value={contributionForm.fonte}
                onValueChange={(v: any) => setContributionForm(f => ({ ...f, fonte: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="tabaco">Poupança Tabaco</SelectItem>
                  <SelectItem value="investimento">Investimento Simbólico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {contributionForm.fonte === 'investimento' && (
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Select
                  value={contributionForm.investmentPlatform}
                  onValueChange={(v) => setContributionForm(f => ({ ...f, investmentPlatform: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolher plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_PLATFORMS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Poupança da semana"
                value={contributionForm.descricao}
                onChange={(e) => setContributionForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContributionDialog(null)}>Cancelar</Button>
            <Button onClick={handleAddContribution}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PURCHASE DIALOG */}
      <Dialog open={!!showPurchaseDialog} onOpenChange={() => setShowPurchaseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 Registar Compra</DialogTitle>
            <DialogDescription>
              Parabéns! Alcançaste a tua meta. Regista os detalhes da compra.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Loja / Plataforma</Label>
              <Input
                placeholder="Ex: Amazon, Fnac, Worten..."
                value={purchaseForm.loja}
                onChange={(e) => setPurchaseForm(f => ({ ...f, loja: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço final (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={purchaseForm.precoFinal}
                onChange={(e) => setPurchaseForm(f => ({ ...f, precoFinal: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={purchaseForm.notas}
                onChange={(e) => setPurchaseForm(f => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(null)}>Cancelar</Button>
            <Button onClick={handleCompletePurchase}>Confirmar Compra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONVERT TO HABIT DIALOG */}
      <Dialog open={!!showConvertDialog} onOpenChange={() => setShowConvertDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🌱 Converter em Hábito?</DialogTitle>
            <DialogDescription>
              Agora que compraste, que tal criar um hábito relacionado?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do novo hábito</Label>
              <Input
                placeholder="Ex: Tocar guitarra 3x/semana"
                value={convertHabitForm.nome}
                onChange={(e) => setConvertHabitForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Input
                placeholder="Ex: Criatividade, Saúde..."
                value={convertHabitForm.categoria}
                onChange={(e) => setConvertHabitForm(f => ({ ...f, categoria: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(null)}>Talvez depois</Button>
            <Button onClick={handleConvertToHabit}>Criar Hábito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financas;