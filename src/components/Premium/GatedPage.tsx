import { useNavigate } from "react-router-dom";
import { Crown, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Navigation } from "@/components/Layout/Navigation";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { useState } from "react";
import { APP_NAME, PRO_FEATURES, PLANS } from "@/config/billing";

interface GatedPageProps {
  children: React.ReactNode;
  featureName?: string;
}

/**
 * GatedPage - Wraps entire pages that are PRO-only.
 * FREE users see a premium upsell screen instead of the page content.
 * TRIAL and PRO users see the full page.
 */
export const GatedPage = ({ children, featureName }: GatedPageProps) => {
  const { locale } = useI18n();
  const { subscription, trialStatus } = useSubscription();
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);

  const isPT = locale === "pt-PT";
  const lang = isPT ? "pt" : "en";
  
  // Check if user has PRO access (PRO plan or active trial)
  const hasPro = subscription.plan === "pro" || trialStatus.isActive;

  // If PRO, render children normally
  if (hasPro) {
    return <>{children}</>;
  }

  // Get starting price from billing config
  const startingPrice = PLANS.find(p => p.id === "monthly")?.price ?? 7.99;

  // FREE users see the gated upsell screen
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <main className="container py-8 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Premium icon */}
          <div className="relative mx-auto w-20 h-20">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center">
              <Crown className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {isPT ? "Funcionalidade PRO" : "PRO Feature"}
            </h1>
            <p className="text-muted-foreground">
              {featureName 
                ? (isPT 
                    ? `${featureName} está disponível no plano PRO.` 
                    : `${featureName} is available in the PRO plan.`)
                : (isPT 
                    ? "Esta funcionalidade está disponível no plano PRO." 
                    : "This feature is available in the PRO plan.")
              }
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-card rounded-2xl border border-border/30 p-5 space-y-3 text-left">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {isPT ? `Com ${APP_NAME} PRO tens acesso a:` : `With ${APP_NAME} PRO you get:`}
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {PRO_FEATURES[lang].map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button 
              onClick={() => setShowPaywall(true)} 
              className="w-full h-12 gap-2 text-base font-semibold"
            >
              <Crown className="h-5 w-5" />
              {isPT ? `Desbloquear ${APP_NAME} PRO` : `Unlock ${APP_NAME} PRO`}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate("/app")} 
              className="w-full text-muted-foreground gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {isPT ? "Voltar aos Hábitos" : "Back to Habits"}
            </Button>
          </div>

          {/* Pricing hint */}
          <p className="text-xs text-muted-foreground">
            {isPT 
              ? `A partir de €${startingPrice.toFixed(2).replace(".", ",")}/mês • 7 dias grátis para novos utilizadores` 
              : `From €${startingPrice.toFixed(2)}/month • 7-day free trial for new users`}
          </p>
        </div>
      </main>

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {}}
        trialDaysLeft={0}
      />
    </div>
  );
};
