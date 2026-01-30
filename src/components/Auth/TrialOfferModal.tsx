import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Flame, Target, Calendar, Zap, Download, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";
import { useSubscription } from "@/hooks/useSubscription";

interface TrialOfferModalProps {
  open: boolean;
  onClose: () => void;
  onStartTrial: () => void;
  onViewPricing: () => void;
}

const PRO_FEATURES = [
  { icon: Target, label: "Unlimited habits" },
  { icon: Flame, label: "Unlimited trackers" },
  { icon: Calendar, label: "Full calendar history" },
  { icon: Zap, label: "Finances dashboard" },
  { icon: Download, label: "Export (CSV/PDF)" },
  { icon: Bell, label: "Cloud sync" },
];

export const TrialOfferModal = ({ open, onClose, onStartTrial, onViewPricing }: TrialOfferModalProps) => {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const { startTrial } = useSubscription();

  const handleStartTrial = () => {
    startTrial();
    onStartTrial();
    onClose();
    // After starting trial, show paywall for conversion
    onViewPricing();
  };

  const handleViewPricing = () => {
    onClose();
    onViewPricing();
  };

  const handleMaybeLater = () => {
    // User continues with FREE plan
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/30 bg-gradient-to-b from-primary/5 to-transparent text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {locale === 'pt-PT' ? 'Começa o teu trial de 7 dias' : 'Start your 7-day free trial'}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {locale === 'pt-PT' 
                ? 'Acesso completo. Sem cartão de crédito.'
                : 'Full access. No credit card required.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Features */}
          <div className="grid grid-cols-2 gap-2">
            {PRO_FEATURES.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <feature.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">{feature.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-4">
            <Button onClick={handleStartTrial} className="w-full h-12 text-base font-semibold gap-2">
              <Sparkles className="h-5 w-5" />
              {locale === 'pt-PT' ? 'Começar Trial Grátis' : 'Start Free Trial'}
            </Button>

            <Button variant="outline" onClick={handleViewPricing} className="w-full">
              {locale === 'pt-PT' ? 'Ver planos e preços' : 'View pricing'}
            </Button>

            <Button variant="ghost" onClick={handleMaybeLater} className="w-full text-muted-foreground">
              {locale === 'pt-PT' ? 'Talvez mais tarde' : 'Maybe later'}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            {locale === 'pt-PT' 
              ? '7 dias de acesso PRO completo. Sem compromisso.'
              : '7 days of full PRO access. No commitment.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
