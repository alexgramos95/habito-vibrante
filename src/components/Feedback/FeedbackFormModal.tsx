import { useState } from "react";
import { MessageSquare, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FeedbackFormModalProps {
  open: boolean;
  onClose: () => void;
}

const WTP_OPTIONS = [
  { value: "0-5", label: "0€ - 5€/mês" },
  { value: "5-10", label: "5€ - 10€/mês" },
  { value: "10-15", label: "10€ - 15€/mês" },
  { value: ">15", label: "Mais de 15€/mês" },
];

export const FeedbackFormModal = ({ open, onClose }: FeedbackFormModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [willingnessToPay, setWillingnessToPay] = useState("");
  const [whatWouldMakePay, setWhatWouldMakePay] = useState("");
  const [whatPreventsPay, setWhatPreventsPay] = useState("");
  const [howBecomeHelped, setHowBecomeHelped] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!willingnessToPay) {
      toast({
        title: "Por favor responde",
        description: "Indica quanto estarias disposto a pagar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call edge function to save to DB + send to Slack
      const { error } = await supabase.functions.invoke("send-feedback-slack", {
        body: {
          user_id: user?.id || null,
          email: user?.email || null,
          feedback_type: "trial_expiry",
          willingness_to_pay: willingnessToPay,
          what_would_make_pay: whatWouldMakePay || null,
          what_prevents_pay: whatPreventsPay || null,
          how_become_helped: howBecomeHelped || null,
        },
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Obrigado pelo feedback! 🙏",
        description: "A tua opinião é muito valiosa para nós.",
      });

      // Auto-close after success
      setTimeout(() => {
        onClose();
        // Reset form
        setSubmitted(false);
        setWillingnessToPay("");
        setWhatWouldMakePay("");
        setWhatPreventsPay("");
        setHowBecomeHelped("");
      }, 2000);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o feedback. Tenta novamente.",
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
              O teu feedback ajuda-nos a melhorar o Become.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Ajuda-nos a melhorar
          </DialogTitle>
          <DialogDescription>
            Responde a algumas perguntas rápidas sobre a tua experiência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* WTP Question - Required */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Quanto estarias disposto a pagar? *
            </Label>
            <RadioGroup 
              value={willingnessToPay} 
              onValueChange={setWillingnessToPay}
              className="grid grid-cols-2 gap-2"
            >
              {WTP_OPTIONS.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={option.value}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                    willingnessToPay === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <span className="text-sm">{option.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* What would make you pay */}
          <div className="space-y-2">
            <Label htmlFor="whatMakePay" className="text-base font-medium">
              O que te faria pagar?
            </Label>
            <Textarea
              id="whatMakePay"
              placeholder="Ex: Mais funcionalidades de gamificação, integração com outras apps..."
              value={whatWouldMakePay}
              onChange={(e) => setWhatWouldMakePay(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* What prevents paying */}
          <div className="space-y-2">
            <Label htmlFor="whatPrevents" className="text-base font-medium">
              O que te impede agora?
            </Label>
            <Textarea
              id="whatPrevents"
              placeholder="Ex: Preço muito alto, ainda não vi valor suficiente..."
              value={whatPreventsPay}
              onChange={(e) => setWhatPreventsPay(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* How Become helped */}
          <div className="space-y-2">
            <Label htmlFor="howHelped" className="text-base font-medium">
              O Become ajudou em quê?
            </Label>
            <Textarea
              id="howHelped"
              placeholder="Ex: Ajudou-me a ser mais consistente com exercício..."
              value={howBecomeHelped}
              onChange={(e) => setHowBecomeHelped(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1 gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A enviar...
                </>
              ) : (
                "Enviar feedback"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
