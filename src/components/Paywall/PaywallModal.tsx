import { useState } from "react";
import { Crown, Check, Flame, Target, Calendar, Download, Bell, Zap, RefreshCw, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: (plan: "monthly" | "yearly" | "lifetime") => void;
  trigger?: string;
  trialDaysLeft?: number;
}

// PRICING ALIGNED WITH STRIPE (EUR)
// Monthly inclui trial de 2 dias
const PLANS = [
  {
    id: "monthly" as const,
    price: 9.99,
    period: "/month",
    popular: false,
    trialDays: 2, // 2-day free trial
  },
  {
    id: "yearly" as const,
    price: 89.99,
    period: "/year",
    popular: true,
    discount: "25%",
    monthlyEquivalent: 7.5,
  },
  {
    id: "lifetime" as const,
    price: 149.99,
    period: "once",
    popular: false,
    note: "forever",
  },
];

const PRO_FEATURES = [
  { icon: Target, label: "Unlimited habits" },
  { icon: Flame, label: "Unlimited trackers" },
  { icon: Calendar, label: "Full calendar history" },
  { icon: Zap, label: "Finances dashboard" },
  { icon: Download, label: "Export (CSV/PDF)" },
  { icon: Bell, label: "Cloud sync + restore" },
];

export const PaywallModal = ({ open, onClose, onUpgrade, trigger, trialDaysLeft = 0 }: PaywallModalProps) => {
  const { t, locale } = useI18n();
  const { isAuthenticated, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | "lifetime">("yearly");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleUpgrade = async () => {
    // If not authenticated, redirect to auth page
    if (!isAuthenticated) {
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
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, "_blank");
        toast({
          title: "Checkout opened",
          description: "Complete your purchase in the new tab.",
        });
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: "Checkout failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
      // Fallback to local upgrade for now
      onUpgrade(selectedPlan);
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
          title: "Purchases restored!",
          description: `Your ${data.purchase_plan} subscription has been restored.`,
        });
        onClose();
        window.location.reload();
      } else {
        toast({
          title: "No purchases found",
          description: data?.message || "No active subscription found for this account.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Restore error:", err);
      toast({
        title: "Restore failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  // Warrior + Coach messages based on trigger
  const getHeadline = () => {
    switch (trigger) {
      case "habits":
        return "You've hit your limit.";
      case "calendar":
        return "Your trial ended.";
      case "finances":
        return "Finances are Pro-only.";
      case "export":
        return "Export is Pro-only.";
      default:
        return "Upgrade to Pro";
    }
  };

  const getSubheadline = () => {
    switch (trigger) {
      case "habits":
        return "Serious about discipline? Remove the limits.";
      case "calendar":
        return "Don't break your streak. Keep building.";
      case "finances":
        return "See the compound effect of your discipline.";
      case "export":
        return "Own your data. Track your transformation.";
      default:
        return "Become who you're aiming to be.";
    }
  };

  const monthlyPlan = PLANS.find((p) => p.id === "monthly");

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
            <DialogTitle className="text-2xl font-bold">{getHeadline()}</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">{getSubheadline()}</DialogDescription>
          </DialogHeader>

          {trialDaysLeft > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning font-medium">
                ⏳ {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left in your trial
              </p>
            </div>
          )}
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
                  selectedPlan === plan.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-border",
                )}
              >
                {plan.popular && <Badge className="absolute -top-2 right-4 bg-primary">Most Popular</Badge>}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold capitalize">{plan.id}</p>
                    {plan.monthlyEquivalent && (
                      <p className="text-xs text-muted-foreground">
                        €{plan.monthlyEquivalent.toFixed(2)}/mo equivalent
                      </p>
                    )}
                    {plan.trialDays && (
                      <p className="text-xs text-warning font-medium">{plan.trialDays}-day free trial</p>
                    )}
                    {plan.note && <p className="text-xs text-success">Pay {plan.note}</p>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">€{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    {plan.discount && (
                      <Badge variant="secondary" className="text-success">
                        Save {plan.discount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Features */}
          <div className="pt-4 border-t border-border/30">
            <p className="text-sm font-medium mb-3">Everything in Pro:</p>
            <div className="grid grid-cols-2 gap-2">
              {PRO_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span className="text-muted-foreground">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4 space-y-3">
            <Button onClick={handleUpgrade} className="w-full h-12 text-base font-semibold gap-2" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : !isAuthenticated ? (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In to Upgrade
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5" />
                  Upgrade to Pro
                </>
              )}
            </Button>

            {/* Restore Purchases */}
            <Button variant="outline" onClick={handleRestore} className="w-full gap-2" disabled={restoring}>
              {restoring ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Restore Purchases
                </>
              )}
            </Button>

            <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
              Maybe later
            </Button>
          </div>

          {/* Trust + Disclosures */}
          <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
            {monthlyPlan?.trialDays && (
              <p>
                Monthly plan includes a {monthlyPlan.trialDays}-day free trial. You won&apos;t be charged if you cancel
                before the trial ends.
              </p>
            )}
            <p>This is where discipline compounds.</p>
            <p>
              Subscriptions auto-renew. Cancel anytime.{" "}
              <a href="/terms" className="underline">
                Terms
              </a>{" "}
              ·{" "}
              <a href="/privacy" className="underline">
                Privacy
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
