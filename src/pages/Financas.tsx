import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import {
  Wallet, TrendingUp, PiggyBank, BarChart3, Award,
  ChevronLeft, ChevronRight, Target, ArrowUpRight, Plus, Tag, Trash2, Pencil, Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, SavingsEntry } from "@/data/types";
import { loadState, saveState, addSavingsEntry, deleteSavingsEntry, generateId } from "@/data/storage";
import { calculateTrackerFinancials, getFinancialMotivationalMessage } from "@/logic/computations";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";
import { cn } from "@/lib/utils";
import { ExternalDepositDialog } from "@/components/Finance/ExternalDepositDialog";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { ProBadge } from "@/components/Paywall/UpgradeButton";

const Financas = () => {
  const { toast } = useToast();
  const { t, locale, formatCurrency } = useI18n();
  const [state, setState] = useState<AppState>(() => loadState());
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<SavingsEntry | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPro, trialStatus, upgradeToPro } = useSubscription();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  
  const dateLocale = locale === 'pt-PT' ? pt : enUSLocale;

  // Show paywall if not Pro
  useEffect(() => {
    if (!isPro) {
      setShowPaywall(true);
    }
  }, [isPro]);

  // Calculate financial overview from trackers
  const financialOverview = calculateTrackerFinancials(
    state.trackers || [],
    state.trackerEntries || [],
    currentYear,
    currentMonth
  );

  const motivationalMessage = getFinancialMotivationalMessage(financialOverview, locale);

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Get external deposits for current month
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const externalDeposits = (state.savings || []).filter(
    s => s.isExternalDeposit && s.date.startsWith(monthStr)
  );
  const externalDepositsTotal = externalDeposits.reduce((sum, d) => sum + d.amount, 0);
  const allExternalDeposits = (state.savings || []).filter(s => s.isExternalDeposit);
  const allExternalDepositsTotal = allExternalDeposits.reduce((sum, d) => sum + d.amount, 0);

  // Handle external deposit - stores in savings array
  const handleAddDeposit = (deposit: {
    amount: number;
    description: string;
    tags: string[];
  }) => {
    const newDeposit: Omit<SavingsEntry, "id"> = {
      date: format(new Date(), "yyyy-MM-dd"),
      amount: deposit.amount,
      moeda: locale === 'pt-PT' ? '€' : '$',
      descricao: deposit.description,
      tags: deposit.tags,
      isExternalDeposit: true,
    };
    setState(prev => addSavingsEntry(prev, newDeposit));
    toast({
      title: locale === "pt-PT" ? "Depósito registado" : "Deposit recorded",
      description: formatCurrency(deposit.amount),
    });
    setEditingDeposit(null);
  };

  const handleDeleteDeposit = (id: string) => {
    setState(prev => deleteSavingsEntry(prev, id));
    toast({
      title: locale === "pt-PT" ? "Depósito eliminado" : "Deposit deleted",
    });
  };

  // Month navigation
  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (currentYear === now.getFullYear() && currentMonth >= now.getMonth()) return;
    
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  // Aggregate daily savings for chart
  const dailyChartData = Object.entries(
    financialOverview.monthlyData.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = 0;
      acc[item.date] += item.savings;
      return acc;
    }, {} as Record<string, number>)
  ).map(([date, savings]) => ({ date, savings }));

  // Calculate cumulative savings
  let cumulative = 0;
  const cumulativeData = dailyChartData.map(item => {
    cumulative += item.savings;
    return { ...item, cumulative };
  });

  const monthLabel = format(new Date(currentYear, currentMonth), "MMMM yyyy", { locale: dateLocale });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 md:py-8 space-y-6">
        {/* Header */}
        <PageHeader
          title={t.finances.title}
          subtitle={(t as any).pageSubtitles?.finances || motivationalMessage}
          icon={PiggyBank}
        >
          <div className="flex items-center gap-2 glass rounded-xl px-2 py-1">
            <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center capitalize">
              {monthLabel}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNextMonth}
              disabled={currentYear === today.getFullYear() && currentMonth >= today.getMonth()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </PageHeader>

        {/* Empty State - Show deposit option even without trackers */}
        {financialOverview.trackerBreakdown.length === 0 ? (
          <Card className="glass border-border/30">
            <CardContent className="py-16 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">{t.finances.noFinancialTrackers}</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                {t.finances.noFinancialTrackersDescription}
              </p>
              <div className="flex gap-3 justify-center">
                <Link to="/objetivos">
                  <Button className="gap-2">
                    <Target className="h-4 w-4" />
                    {t.finances.goToTrackers}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowDepositDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  {locale === "pt-PT" ? "Depósito Externo" : "External Deposit"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Add Deposit Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowDepositDialog(true)}
              >
                <Plus className="h-4 w-4" />
                {locale === "pt-PT" ? "Depósito Externo" : "External Deposit"}
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="premium-card group hover:glow-subtle">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-success/10">
                      <PiggyBank className="h-4 w-4 text-success" />
                    </div>
                    {t.finances.monthlySavings}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-success">
                    {formatCurrency(financialOverview.monthlySavings)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {monthLabel}
                  </p>
                </CardContent>
              </Card>

              <Card className="premium-card group hover:glow-subtle">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    {t.finances.accumulatedSavings}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(financialOverview.accumulatedSavings)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.finances.allTime}
                  </p>
                </CardContent>
              </Card>

              <Card className="premium-card group hover:glow-subtle">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-warning/10">
                      <Award className="h-4 w-4 text-warning" />
                    </div>
                    {t.finances.topSource}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold truncate">
                    {financialOverview.topContributor?.trackerIcon} {financialOverview.topContributor?.trackerName || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {financialOverview.topContributor 
                      ? `${financialOverview.topContributor.percentageOfTotal.toFixed(0)}% ${t.finances.ofTotal}`
                      : "-"}
                  </p>
                </CardContent>
              </Card>

              <Card className="premium-card group hover:glow-subtle">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-accent/10">
                      <BarChart3 className="h-4 w-4 text-accent" />
                    </div>
                    {t.finances.activeTrackers}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {financialOverview.trackerBreakdown.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.finances.withFinancialImpact}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Cumulative Savings Chart */}
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-success" />
                    {t.finances.cumulativeSavings}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={cumulativeData}>
                      <defs>
                        <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => format(parseISO(val), "d", { locale: dateLocale })}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickFormatter={(val) => `${val}€`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelFormatter={(val) => format(parseISO(val as string), "d MMMM", { locale: dateLocale })}
                        formatter={(value: number) => [formatCurrency(value), t.finances.accumulated]}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="hsl(var(--success))"
                        fill="url(#savingsGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Daily Savings Chart */}
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {t.finances.dailySavings}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => format(parseISO(val), "d", { locale: dateLocale })}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickFormatter={(val) => `${val}€`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelFormatter={(val) => format(parseISO(val as string), "d MMMM", { locale: dateLocale })}
                        formatter={(value: number) => [formatCurrency(value), t.finances.savings]}
                      />
                      <Bar dataKey="savings" radius={[4, 4, 0, 0]}>
                        {dailyChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.savings > 0 ? "hsl(var(--success))" : "hsl(var(--muted))"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Tracker Breakdown */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {t.finances.trackerBreakdown}
                  </span>
                  <Link to="/objetivos">
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-primary">
                      {t.finances.manageTrackers}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financialOverview.trackerBreakdown.map((tracker) => (
                    <div key={tracker.trackerId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{tracker.trackerIcon || "📊"}</span>
                          <div>
                            <p className="font-medium">{tracker.trackerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {tracker.daysActive} {t.finances.daysTracked}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-success">
                            {formatCurrency(tracker.monthlySavings)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.finances.total}: {formatCurrency(tracker.accumulatedSavings)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={tracker.percentageOfTotal} 
                          className="h-2 flex-1"
                        />
                        <Badge variant="outline" className="text-xs">
                          {tracker.percentageOfTotal.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="glass border-border/30 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.finances.howItWorks}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.finances.howItWorksDescription}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External Deposits Section */}
            {externalDeposits.length > 0 && (
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-success" />
                      {locale === "pt-PT" ? "Depósitos Externos" : "External Deposits"}
                    </span>
                    <Badge variant="outline" className="text-success border-success/30">
                      {formatCurrency(externalDepositsTotal)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {externalDeposits.map((deposit) => (
                      <div 
                        key={deposit.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-success/10">
                            <Wallet className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {deposit.descricao || (locale === "pt-PT" ? "Depósito" : "Deposit")}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(deposit.date), "d MMM", { locale: dateLocale })}
                              </span>
                              {deposit.tags?.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-success">
                            +{formatCurrency(deposit.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => handleDeleteDeposit(deposit.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      {/* External Deposit Dialog */}
      <ExternalDepositDialog
        open={showDepositDialog}
        onOpenChange={setShowDepositDialog}
        onSave={handleAddDeposit}
      />

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={upgradeToPro}
        trigger="finances"
        trialDaysLeft={trialStatus.daysRemaining}
      />
    </div>
  );
};

export default Financas;