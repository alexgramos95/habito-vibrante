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
import { useFeedbackContext } from "@/hooks/useFeedbackContext";
import { FEEDBACK_COPY } from "@/config/copy";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";

interface FeedbackFormModalProps {
  open: boolean;
  onClose: () => void;
  feedbackType?: string;
}

const WTP_OPTIONS = [
  { value: "0-5", label: "0€ - 5€/mês" },
  { value: "5-10", label: "5€ - 10€/mês" },
  { value: "10-15", label: "10€ - 15€/mês" },
  { value: ">15", label: "Mais de 15€/mês" },
];

export const FeedbackFormModal = ({ open, onClose, feedbackType = "general" }: FeedbackFormModalProps) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const { locale } = useI18n();
  const feedbackContext = useFeedbackContext();
  const lang = locale === "pt-PT" ? "pt" : "en";
  
  const [willingnessToPay, setWillingnessToPay] = useState("");
  const [whatWouldMakePay, setWhatWouldMakePay] = useState("");
  const [whatPreventsPay, setWhatPreventsPay] = useState("");
  const [howBecomeHelped, setHowBecomeHelped] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!willingnessToPay) {
      toast({
        title: lang === "pt" ? "Por favor responde" : "Please answer",
        description: lang === "pt" 
          ? "Indica quanto estarias disposto a pagar." 
          : "Let us know what you'd be willing to pay.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call edge function with rich context
      const { error } = await supabase.functions.invoke("send-feedback-slack", {
        body: {
          user_id: feedbackContext.userId,
          email: feedbackContext.email,
          feedback_type: feedbackType,
          willingness_to_pay: willingnessToPay,
          what_would_make_pay: whatWouldMakePay || null,
          what_prevents_pay: whatPreventsPay || null,
          how_become_helped: howBecomeHelped || null,
          context: feedbackContext,
        },
        headers: session?.access_token 
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: FEEDBACK_COPY.sent[lang],
        description: FEEDBACK_COPY.sentDescription[lang],
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
        title: FEEDBACK_COPY.error[lang],
        description: FEEDBACK_COPY.errorDescription[lang],
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
            <h2 className="text-2xl font-bold">
              {lang === "pt" ? "Obrigado!" : "Thank you!"}
            </h2>
            <p className="text-muted-foreground">
              {FEEDBACK_COPY.sentDescription[lang]}
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
            {lang === "pt" ? "Ajuda-nos a melhorar" : "Help us improve"}
          </DialogTitle>
          <DialogDescription>
            {lang === "pt" 
              ? "Responde a algumas perguntas rápidas sobre a tua experiência."
              : "Answer a few quick questions about your experience."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* WTP Question - Required */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {lang === "pt" 
                ? "Quanto estarias disposto a pagar? *" 
                : "What would you be willing to pay? *"}
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
              {lang === "pt" ? "O que te faria pagar?" : "What would make you pay?"}
            </Label>
            <Textarea
              id="whatMakePay"
              placeholder={lang === "pt" 
                ? "Ex: Mais funcionalidades de gamificação, integração com outras apps..."
                : "E.g., More gamification, integration with other apps..."}
              value={whatWouldMakePay}
              onChange={(e) => setWhatWouldMakePay(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* What prevents paying */}
          <div className="space-y-2">
            <Label htmlFor="whatPrevents" className="text-base font-medium">
              {lang === "pt" ? "O que te impede agora?" : "What's stopping you now?"}
            </Label>
            <Textarea
              id="whatPrevents"
              placeholder={lang === "pt" 
                ? "Ex: Preço muito alto, ainda não vi valor suficiente..."
                : "E.g., Price too high, haven't seen enough value yet..."}
              value={whatPreventsPay}
              onChange={(e) => setWhatPreventsPay(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* How becoMe helped */}
          <div className="space-y-2">
            <Label htmlFor="howHelped" className="text-base font-medium">
              {lang === "pt" ? "A becoMe ajudou em quê?" : "How has becoMe helped?"}
            </Label>
            <Textarea
              id="howHelped"
              placeholder={lang === "pt" 
                ? "Ex: Ajudou-me a ser mais consistente com exercício..."
                : "E.g., Helped me be more consistent with exercise..."}
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
              {lang === "pt" ? "Cancelar" : "Cancel"}
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1 gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {lang === "pt" ? "A enviar..." : "Sending..."}
                </>
              ) : (
                lang === "pt" ? "Enviar feedback" : "Send feedback"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
