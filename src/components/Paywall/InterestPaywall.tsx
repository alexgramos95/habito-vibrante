import { useState } from "react";
import { Crown, Check, ArrowLeft, MessageSquare, Loader2, RefreshCw, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FeedbackFormModal } from "@/components/Feedback/FeedbackFormModal";
import { useNavigate } from "react-router-dom";

interface InterestPaywallProps {
  open: boolean;
  onClose: () => void;
}

// ACTUAL STRIPE PRICING (EUR) - UPDATED 2025
const PLANS = [
  {
    id: "monthly" as const,
    name: "Pro Mensal",
    price: 19.99,
    period: "/mês",
    popular: false,
  },
  {
    id: "yearly" as const,
    name: "Pro Anual",
    price: 189.99,
    period: "/ano",
    popular: true,
    discount: "Poupa 20%",
    monthlyEquivalent: 15.83,
    savings: "Poupas 49,89€/ano",
  },
  {
    id: "lifetime" as const,
    name: "Pro Fidelidade",
    price: 399.99,
    period: " único",
    popular: false,
    note: "Pagamento único, acesso para sempre",
  },
];

const PRO_FEATURES = [
  "Hábitos ilimitados",
  "Trackers ilimitados",
  "Histórico completo",
  "Dashboard de finanças",
  "Exportar dados",
  "Sync na cloud",
];

export const InterestPaywall = ({ open, onClose }: InterestPaywallProps) => {
  const { user, session, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | "lifetime">("yearly");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleCheckout = async () => {
    if (!isAuthenticated || !session) {
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
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, "_blank");
        toast({
          title: "Checkout aberto",
          description: "Completa a compra no novo separador.",
        });
        onClose();
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: "Erro no checkout",
        description: "Tenta novamente ou contacta o suporte.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!isAuthenticated || !session) {
      onClose();
      navigate("/auth");
      return;
    }

    setRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("restore-purchases", {
        body: { platform: "stripe" },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Compras restauradas! 🎉",
          description: `A tua subscrição ${data.purchase_plan} foi restaurada.`,
        });
        onClose();
        window.location.reload();
      } else {
        toast({
          title: "Nenhuma compra encontrada",
          description: data?.message || "Nenhuma subscrição ativa encontrada para esta conta.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Restore error:", err);
      toast({
        title: "Erro ao restaurar",
        description: "Tenta novamente ou contacta o suporte.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <Dialog open={open && !showFeedback} onOpenChange={onClose}>
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
              <DialogTitle className="text-2xl font-bold">
                Desbloqueia o teu potencial
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                Remove os limites. Acompanha o teu progresso sem restrições.
              </DialogDescription>
            </DialogHeader>
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
                    selectedPlan === plan.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border/50 hover:border-border"
                  )}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 right-4 bg-primary">
                      Mais Popular
                    </Badge>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      {plan.monthlyEquivalent && (
                        <p className="text-xs text-muted-foreground">
                          €{plan.monthlyEquivalent.toFixed(2)}/mês equivalente
                        </p>
                      )}
                      {plan.note && (
                        <p className="text-xs text-success">{plan.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">€{plan.price.toFixed(2).replace(".", ",")}</span>
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      </div>
                      {plan.discount && (
                        <Badge variant="secondary" className="text-success">
                          {plan.discount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Features */}
            <div className="pt-4 border-t border-border/30">
              <p className="text-sm font-medium mb-3">Inclui tudo no Pro:</p>
              <div className="grid grid-cols-2 gap-2">
                {PRO_FEATURES.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4 space-y-3">
              <Button 
                onClick={handleCheckout} 
                className="w-full h-12 text-base font-semibold gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    A processar...
                  </>
                ) : !isAuthenticated ? (
                  <>
                    <LogIn className="h-5 w-5" />
                    Iniciar sessão para continuar
                  </>
                ) : (
                  <>
                    <Crown className="h-5 w-5" />
                    Continuar com Pro
                  </>
                )}
              </Button>

              {/* Restore Purchases */}
              <Button 
                variant="outline" 
                onClick={handleRestore} 
                className="w-full gap-2" 
                disabled={restoring}
              >
                {restoring ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    A restaurar...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Restaurar Compras
                  </>
                )}
              </Button>

              {/* Secondary actions */}
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={onClose} 
                  className="flex-1 gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowFeedback(true)}
                  className="flex-1 gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Dar feedback
                </Button>
              </div>
            </div>

            {/* Trust disclaimer */}
            <p className="text-center text-xs text-muted-foreground pt-2">
              Pagamento seguro via Stripe. Cancela a qualquer momento.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <FeedbackFormModal
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </>
  );
};
