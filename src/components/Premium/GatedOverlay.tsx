import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { useSubscription } from "@/hooks/useSubscription";

interface GatedOverlayProps {
  children: React.ReactNode;
  feature?: string;
}

/**
 * Gated overlay for FREE users.
 * Shows blur + CTA inteligente based on plan status.
 */
export const GatedOverlay = ({ children, feature }: GatedOverlayProps) => {
  const { locale } = useI18n();
  const { trialStatus, subscription } = useSubscription();

  // Determine CTA text based on plan
  const getCTAText = () => {
    if (subscription.plan === 'trial' && !trialStatus.isExpired) {
      // Active trial - no CTA needed
      return null;
    }
    if (subscription.plan === 'pro') {
      // PRO - no CTA needed
      return null;
    }
    if (subscription.plan === 'trial' && trialStatus.isExpired) {
      return locale === 'pt-PT' ? 'Desbloquear becoMe PRO' : 'Unlock becoMe PRO';
    }
    // FREE
    return locale === 'pt-PT' ? 'Explorar becoMe PRO' : 'Explore becoMe PRO';
  };

  const ctaText = getCTAText();
  
  // Don't show overlay for PRO or active trial
  if (!ctaText) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-[6px] pointer-events-none select-none opacity-60">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/40 backdrop-blur-sm rounded-xl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-5 w-5" />
          <span className="text-sm font-medium">
            {feature || (locale === 'pt-PT' ? 'Funcionalidade PRO' : 'PRO Feature')}
          </span>
        </div>
        <Button 
          size="sm" 
          className="gap-2"
          onClick={() => {
            // Navigate to decision or show paywall
            window.location.href = '/decision';
          }}
        >
          {ctaText}
        </Button>
      </div>
    </div>
  );
};
