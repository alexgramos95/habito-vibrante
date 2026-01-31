import { useState } from "react";
import { Crown, Check, RefreshCw, LogIn, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { 
  PLANS, 
  PRO_FEATURES, 
  APP_NAME, 
  APP_TAGLINE, 
  formatPriceCompact,
  type PlanType 
} from "@/config/billing";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade?: (plan: PlanType) => void;
  trigger?: string;
  trialDaysLeft?: number;
}

export const PaywallModal = ({ 
  open, 
  onClose, 
  onUpgrade, 
  trigger, 
  trialDaysLeft = 0 
}: PaywallModalProps) => {
  const { locale } = useI18n();
  const { isAuthenticated, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const isPT = locale === "pt-PT";
  const lang = isPT ? "pt" : "en";
  const features = PRO_FEATURES[lang];

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      onClose();
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceType: selectedPlan },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast({
          title: isPT ? "Checkout aberto" : "Checkout opened",
          description: isPT 
            ? "Completa a compra no novo separador." 
            : "Complete your purchase in the new tab.",
        });
        onUpgrade?.(selectedPlan);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: isPT ? "Erro no checkout" : "Checkout failed",
        description: isPT 
          ? "Tenta novamente ou contacta o suporte." 
          : "Please try again or contact support.",
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
        description: isPT 
          ? "Tenta novamente ou contacta o suporte." 
          : "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 bg-background border-border/50 overflow-hidden">
        {/* Premium header */}
        <div className="relative p-6 pb-5 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
          
          <div className="relative text-center space-y-3">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20 mb-2">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            
            <h2 className="text-xl font-bold tracking-tight">
              {isPT ? `Desbloqueia a ${APP_NAME} completa` : `Unlock the full ${APP_NAME}`}
            </h2>
            
            <p className="text-sm text-muted-foreground">
              {APP_TAGLINE[lang]}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Features list */}
          <div className="space-y-2">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "relative flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center",
                  selectedPlan === plan.id 
                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" 
                    : "border-border/40 hover:border-border/80 bg-card/50",
                )}
              >
                {plan.badge && (
                  <Badge 
                    className={cn(
                      "absolute -top-2 text-[10px] px-1.5 py-0",
                      plan.popular 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-warning/90 text-warning-foreground"
                    )}
                  >
                    {plan.badge[lang]}
                  </Badge>
                )}

                <span className="text-xs text-muted-foreground mt-1 mb-1">
                  {plan.label[lang]}
                </span>
                
                <div className="flex items-baseline">
                  <span className="text-lg font-bold">
                    {formatPriceCompact(plan.price)}
                  </span>
                  {plan.periodLabel[lang] && (
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      {plan.periodLabel[lang]}
                    </span>
                  )}
                </div>

                {plan.monthlyEquivalent && (
                  <span className="text-[10px] text-muted-foreground">
                    €{plan.monthlyEquivalent.toFixed(2)}/{isPT ? "mês" : "mo"}
                  </span>
                )}
                
                {plan.period === "once" && (
                  <span className="text-[10px] text-success mt-0.5">
                    {isPT ? "Acesso vitalício" : "Lifetime access"}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <Button 
            onClick={handleUpgrade} 
            className="w-full h-12 text-base font-semibold gap-2 bg-primary hover:bg-primary/90" 
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                {isPT ? "A processar..." : "Processing..."}
              </>
            ) : !isAuthenticated ? (
              <>
                <LogIn className="h-5 w-5" />
                {isPT ? "Iniciar sessão" : "Sign in"}
              </>
            ) : (
              <>
                <Crown className="h-5 w-5" />
                {isPT ? `Explorar ${APP_NAME} PRO` : `Explore ${APP_NAME} PRO`}
              </>
            )}
          </Button>

          {/* Secondary actions */}
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={handleRestore} 
              className="flex-1 text-xs text-muted-foreground h-9" 
              disabled={restoring}
            >
              {restoring ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              {isPT ? "Restaurar" : "Restore"}
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="flex-1 text-xs text-muted-foreground h-9"
            >
              {isPT ? "Talvez depois" : "Maybe later"}
            </Button>
          </div>

          {/* Legal footer */}
          <p className="text-[10px] text-center text-muted-foreground/70 leading-relaxed">
            {isPT 
              ? "Subscrições renovam automaticamente. Cancela a qualquer momento." 
              : "Subscriptions auto-renew. Cancel anytime."
            }
            {" "}
            <a href="/terms" className="underline hover:text-muted-foreground">
              {isPT ? "Termos" : "Terms"}
            </a>
            {" · "}
            <a href="/privacy" className="underline hover:text-muted-foreground">
              {isPT ? "Privacidade" : "Privacy"}
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
