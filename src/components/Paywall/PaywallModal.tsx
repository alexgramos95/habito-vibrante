import { useState } from "react";
import { Crown, Check, RefreshCw, LogIn, Shield, Sparkles } from "lucide-react";
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
  TRUST_SIGNALS,
  APP_NAME,
  PAYWALL_HEADLINE,
  PAYWALL_CTA,
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
  const trustSignals = TRUST_SIGNALS[lang];

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

  // Find the yearly plan for the "most chosen" highlight
  const yearlyPlan = PLANS.find(p => p.id === "yearly");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 bg-card border-border/50 shadow-xl overflow-hidden">
        {/* Premium header with identity focus */}
        <div className="relative p-6 pb-5 bg-gradient-to-b from-primary/6 via-primary/3 to-transparent">
          <div className="relative text-center space-y-3">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-md mb-2">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {PAYWALL_HEADLINE[lang]}
            </h2>
            
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
              {isPT 
                ? "A becoMe completa é o teu espaço para construir consistência e identidade, ao teu ritmo."
                : "The full becoMe is your space to build consistency and identity, at your own pace."
              }
            </p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Identity-focused features */}
          <div className="space-y-2.5">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span className="text-foreground/80">{feature}</span>
              </div>
            ))}
          </div>

          {/* Pricing cards - Annual as protagonist */}
          <div className="space-y-2">
            {PLANS.map((plan) => {
              const isYearly = plan.id === "yearly";
              const isSelected = selectedPlan === plan.id;
              
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    "relative w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                    isYearly && "order-first",
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border/60 hover:border-primary/30 bg-card/50",
                    isYearly && !isSelected && "border-primary/20 bg-primary/[0.02]"
                  )}
                >
                  {/* Badge for yearly plan */}
                  {isYearly && (
                    <Badge 
                      className="absolute -top-2.5 left-4 text-[10px] px-2 py-0.5 bg-primary text-primary-foreground shadow-sm"
                    >
                      {isPT ? "Mais escolhido" : "Most chosen"}
                    </Badge>
                  )}
                  
                  {/* Lifetime badge */}
                  {plan.period === "once" && (
                    <Badge 
                      className="absolute -top-2.5 left-4 text-[10px] px-2 py-0.5 bg-warning/90 text-warning-foreground"
                    >
                      {plan.badge?.[lang]}
                    </Badge>
                  )}

                  <div className="flex items-center gap-3">
                    {/* Selection indicator */}
                    <div className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected 
                        ? "border-primary bg-primary" 
                        : "border-border/60"
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    
                    <div className="text-left">
                      <span className="font-medium text-foreground">
                        {plan.label[lang]}
                      </span>
                      {plan.monthlyEquivalent && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (€{plan.monthlyEquivalent.toFixed(2)}/{isPT ? "mês" : "mo"})
                        </span>
                      )}
                      {plan.period === "once" && (
                        <span className="text-xs text-success ml-2">
                          {isPT ? "Para sempre" : "Forever"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-bold text-foreground">
                      {formatPriceCompact(plan.price)}
                    </span>
                    {plan.periodLabel[lang] && (
                      <span className="text-xs text-muted-foreground">
                        {plan.periodLabel[lang]}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Trust signals - subtle and confidence-building */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground/70">
            {trustSignals.map((signal, i) => (
              <span key={i} className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {signal}
              </span>
            ))}
          </div>

          {/* Primary CTA - Identity focused */}
          <Button 
            onClick={handleUpgrade} 
            className="w-full h-12 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 shadow-sm" 
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
                {isPT ? "Iniciar sessão para continuar" : "Sign in to continue"}
              </>
            ) : (
              <>
                <Crown className="h-5 w-5" />
                {PAYWALL_CTA[lang]}
              </>
            )}
          </Button>

          {/* Secondary actions - reduced friction */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <button 
              onClick={handleRestore} 
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1" 
              disabled={restoring}
            >
              {restoring && <RefreshCw className="h-3 w-3 animate-spin" />}
              {isPT ? "Restaurar compra" : "Restore purchase"}
            </button>
            <span className="text-muted-foreground/30">·</span>
            <button 
              onClick={onClose} 
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
            >
              {isPT ? "Agora não" : "Not now"}
            </button>
          </div>

          {/* Legal footer - present but discrete */}
          <p className="text-[10px] text-center text-muted-foreground/50 leading-relaxed">
            {isPT 
              ? "Subscrições renovam automaticamente." 
              : "Subscriptions auto-renew."
            }
            {" "}
            <a href="/terms" className="underline hover:text-muted-foreground/70">
              {isPT ? "Termos" : "Terms"}
            </a>
            {" · "}
            <a href="/privacy" className="underline hover:text-muted-foreground/70">
              {isPT ? "Privacidade" : "Privacy"}
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
