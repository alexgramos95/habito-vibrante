import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";

interface LoginTriggerModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const LoginTriggerModal = ({ open, onClose, onComplete }: LoginTriggerModalProps) => {
  const navigate = useNavigate();
  const { locale } = useI18n();

  const handleSignIn = () => {
    onClose();
    navigate('/auth?next=trial');
  };

  const handleMaybeLater = () => {
    onClose();
    // User continues as guest with FREE limits
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/30 bg-gradient-to-b from-primary/5 to-transparent">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <LogIn className="h-5 w-5 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold">
              {locale === 'pt-PT' ? 'Estás a progredir!' : "You're making progress!"}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {locale === 'pt-PT' 
                ? 'Cria uma conta para desbloquear mais hábitos e guardar o teu progresso.'
                : 'Create an account to unlock more habits and save your progress.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>{locale === 'pt-PT' ? 'Sincroniza entre dispositivos' : 'Sync across devices'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>{locale === 'pt-PT' ? 'Nunca percas o teu progresso' : 'Never lose your progress'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>{locale === 'pt-PT' ? 'Trial de 2 dias grátis do Pro' : '2-day free Pro trial'}</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button onClick={handleSignIn} className="w-full h-12 text-base font-semibold gap-2">
              {locale === 'pt-PT' ? 'Criar conta / Entrar' : 'Create Account / Sign In'}
              <ArrowRight className="h-5 w-5" />
            </Button>

            <Button variant="ghost" onClick={handleMaybeLater} className="w-full text-muted-foreground">
              {locale === 'pt-PT' ? 'Talvez mais tarde' : 'Maybe later'}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            {locale === 'pt-PT' 
              ? 'Podes continuar como visitante com limite de 3 hábitos.'
              : 'You can continue as a guest with a limit of 3 habits.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
