import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { useSubscription } from "@/hooks/useSubscription";
import { GATING_COPY } from "@/config/copy";

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
  const lang = locale === "pt-PT" ? "pt" : "en";

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
    // FREE or expired trial
    return GATING_COPY.unlockCTA[lang];
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
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40 backdrop-blur-sm rounded-xl p-6 text-center">
        <Lock className="h-6 w-6 text-muted-foreground" />
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {GATING_COPY.title[lang]}
          </p>
          <p className="text-xs text-muted-foreground max-w-[200px] whitespace-pre-line">
            {feature || GATING_COPY.subtitle[lang]}
          </p>
        </div>
        
        <Button 
          size="sm" 
          className="gap-2"
          onClick={() => {
            window.location.href = '/decision';
          }}
        >
          {ctaText}
        </Button>
      </div>
    </div>
  );
};
