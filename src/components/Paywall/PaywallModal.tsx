import { useState } from "react";
import { Crown, Check, Flame, Target, Calendar, Download, Bell, Zap, RefreshCw, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: (plan: "monthly" | "yearly" | "lifetime") => void;
  trigger?: string;
  trialDaysLeft?: number;
}

// PRICING ALIGNED WITH STRIPE (EUR) - UPDATED 2025
const PLANS = [
  {
    id: "monthly" as const,
    price: 19.99,
    period: "/mês",
    periodEN: "/month",
    popular: false,
  },
  {
    id: "yearly" as const,
    price: 189.99,
    period: "/ano",
    periodEN: "/year",
    popular: true,
    discount: "20%",
    monthlyEquivalent: 15.83,
    savings: "Poupas 49,89€/ano",
    savingsEN: "Save €49.89/year",
  },
  {
    id: "lifetime" as const,
    price: 399.99,
    period: "único",
    periodEN: "once",
    popular: false,
    note: "para sempre",
    noteEN: "forever",
  },
];

const PRO_FEATURES = [
  { icon: Target, label: "Hábitos ilimitados", labelEN: "Unlimited habits" },
  { icon: Flame, label: "Trackers ilimitados", labelEN: "Unlimited trackers" },
  { icon: Calendar, label: "Histórico completo", labelEN: "Full calendar history" },
  { icon: Zap, label: "Dashboard de finanças", labelEN: "Finances dashboard" },
  { icon: Download, label: "Exportar (CSV/PDF)", labelEN: "Export (CSV/PDF)" },
  { icon: Bell, label: "Cloud sync + restore", labelEN: "Cloud sync + restore" },
];

export const PaywallModal = ({ open, onClose, onUpgrade, trigger, trialDaysLeft = 0 }: PaywallModalProps) => {
  const { t, locale } = useI18n();
  const { isAuthenticated, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | "lifetime">("yearly");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const isPT = locale === "pt-PT";

  const handleUpgrade = async () => {
    // If not authenticated, redirect to auth page
    if (!isAuthenticated) {
      onClose();
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      // Call Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceType: selectedPlan },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, "_blank");
        toast({
          title: isPT ? "Checkout aberto" : "Checkout opened",
          description: isPT ? "Completa a compra no novo separador." : "Complete your purchase in the new tab.",
        });
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: isPT ? "Erro no checkout" : "Checkout failed",
        description: isPT ? "Tenta novamente ou contacta o suporte." : "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleRestore = async () => {
    if (!isAuthenticated) {
      onClose();
      navigate("/auth");
      return;
    }

    setRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("restore-purchases", {
        body: { platform: "stripe" },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: isPT ? "Compras restauradas!" : "Purchases restored!",
          description: isPT 
            ? `A tua subscrição ${data.purchase_plan} foi restaurada.`
            : `Your ${data.purchase_plan} subscription has been restored.`,
        });
        onClose();
        window.location.reload();
      } else {
        toast({
          title: isPT ? "Nenhuma compra encontrada" : "No purchases found",
          description: data?.message || (isPT 
            ? "Nenhuma subscrição ativa encontrada para esta conta."
            : "No active subscription found for this account."),
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Restore error:", err);
      toast({
        title: isPT ? "Erro ao restaurar" : "Restore failed",
        description: isPT ? "Tenta novamente ou contacta o suporte." : "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  const getHeadline = () => {
    switch (trigger) {
      case "habits":
        return isPT ? "Atingiste o limite." : "You've hit your limit.";
      case "calendar":
        return isPT ? "O teu trial terminou." : "Your trial ended.";
      case "finances":
        return isPT ? "Finanças é Pro-only." : "Finances are Pro-only.";
      case "export":
        return isPT ? "Exportar é Pro-only." : "Export is Pro-only.";
      default:
        return isPT ? "Upgrade para Pro" : "Upgrade to Pro";
    }
  };

  const getSubheadline = () => {
    switch (trigger) {
      case "habits":
        return isPT ? "Leva a disciplina a sério? Remove os limites." : "Serious about discipline? Remove the limits.";
      case "calendar":
        return isPT ? "Não quebres o streak. Continua a construir." : "Don't break your streak. Keep building.";
      case "finances":
        return isPT ? "Vê o efeito composto da tua disciplina." : "See the compound effect of your discipline.";
      case "export":
        return isPT ? "Os teus dados. A tua transformação." : "Own your data. Track your transformation.";
      default:
        return isPT ? "Torna-te em quem queres ser." : "Become who you're aiming to be.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/30 bg-gradient-to-b from-primary/5 to-transparent">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-6 w-6 text-warning" />
              <Badge variant="outline" className="text-warning border-warning/50">
                PRO
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-bold">{getHeadline()}</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">{getSubheadline()}</DialogDescription>
          </DialogHeader>

          {trialDaysLeft > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning font-medium">
                ⏳ {trialDaysLeft} {trialDaysLeft === 1 ? (isPT ? "dia restante" : "day left") : (isPT ? "dias restantes" : "days left")} {isPT ? "no teu trial" : "in your trial"}
              </p>
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="p-6 space-y-4">
          <div className="grid gap-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "relative w-full p-4 rounded-xl border-2 text-left transition-all",
                  selectedPlan === plan.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-border",
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 right-4 bg-primary">
                    {isPT ? "Mais Popular" : "Most Popular"}
                  </Badge>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold capitalize">
                      {plan.id === "monthly" ? (isPT ? "Mensal" : "Monthly") : 
                       plan.id === "yearly" ? (isPT ? "Anual" : "Yearly") : 
                       (isPT ? "Fidelidade" : "Lifetime")}
                    </p>
                    {plan.monthlyEquivalent && (
                      <p className="text-xs text-muted-foreground">
                        €{plan.monthlyEquivalent.toFixed(2)}/{isPT ? "mês equivalente" : "mo equivalent"}
                      </p>
                    )}
                    {plan.note && (
                      <p className="text-xs text-success">
                        {isPT ? `Paga ${plan.note}` : `Pay ${plan.noteEN}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">€{plan.price.toFixed(2).replace(".", ",")}</span>
                      <span className="text-sm text-muted-foreground">{isPT ? plan.period : plan.periodEN}</span>
                    </div>
                    {plan.discount && (
                      <Badge variant="secondary" className="text-success">
                        {isPT ? `Poupa ${plan.discount}` : `Save ${plan.discount}`}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Features */}
          <div className="pt-4 border-t border-border/30">
            <p className="text-sm font-medium mb-3">{isPT ? "Tudo incluído no Pro:" : "Everything in Pro:"}</p>
            <div className="grid grid-cols-2 gap-2">
              {PRO_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span className="text-muted-foreground">{isPT ? feature.label : feature.labelEN}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4 space-y-3">
            <Button onClick={handleUpgrade} className="w-full h-12 text-base font-semibold gap-2" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  {isPT ? "A processar..." : "Processing..."}
                </>
              ) : !isAuthenticated ? (
                <>
                  <LogIn className="h-5 w-5" />
                  {isPT ? "Iniciar sessão para Upgrade" : "Sign In to Upgrade"}
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5" />
                  {isPT ? "Upgrade para Pro" : "Upgrade to Pro"}
                </>
              )}
            </Button>

            {/* Restore Purchases */}
            <Button variant="outline" onClick={handleRestore} className="w-full gap-2" disabled={restoring}>
              {restoring ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {isPT ? "A restaurar..." : "Restoring..."}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {isPT ? "Restaurar Compras" : "Restore Purchases"}
                </>
              )}
            </Button>

            <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
              {isPT ? "Talvez depois" : "Maybe later"}
            </Button>
          </div>

          {/* Trust + Disclosures */}
          <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
            <p>{isPT ? "É aqui que a disciplina se multiplica." : "This is where discipline compounds."}</p>
            <p>
              {isPT ? "Subscrições renovam automaticamente. Cancela a qualquer momento." : "Subscriptions auto-renew. Cancel anytime."}{" "}
              <a href="/terms" className="underline">
                {isPT ? "Termos" : "Terms"}
              </a>{" "}
              ·{" "}
              <a href="/privacy" className="underline">
                {isPT ? "Privacidade" : "Privacy"}
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
