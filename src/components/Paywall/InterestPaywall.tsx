import { useState } from "react";
import { Crown, Check, ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FeedbackFormModal } from "@/components/Feedback/FeedbackFormModal";

interface InterestPaywallProps {
  open: boolean;
  onClose: () => void;
}

// Real pricing for soft-launch
const PLANS = [
  {
    id: "monthly" as const,
    name: "Pro Mensal",
    price: 9,
    period: "/mês",
    popular: false,
  },
  {
    id: "yearly" as const,
    name: "Pro Anual",
    price: 79,
    period: "/ano",
    popular: true,
    discount: "27% off",
    monthlyEquivalent: 6.58,
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
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleInterest = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Precisas de estar autenticado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("pro_interest").insert({
        user_id: user.id,
        plan_interested: selectedPlan,
        source: "decision_screen",
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Interesse registado! 🎉",
        description: "Vamos avisar-te quando o Pro estiver disponível.",
      });

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error("Error recording interest:", err);
      toast({
        title: "Erro",
        description: "Não foi possível registar o interesse. Tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="py-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mx-auto">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold">Obrigado!</h2>
            <p className="text-muted-foreground">
              Registámos o teu interesse no plano {selectedPlan === "yearly" ? "Anual" : "Mensal"}.
              Vamos contactar-te em breve!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">€{plan.price}</span>
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
                onClick={handleInterest} 
                className="w-full h-12 text-base font-semibold gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    A processar...
                  </>
                ) : (
                  <>
                    <Crown className="h-5 w-5" />
                    Quero Pro
                  </>
                )}
              </Button>

              {/* Secondary actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  className="flex-1 gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button 
                  variant="outline" 
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
              Pagamento seguro. Cancela a qualquer momento.
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
