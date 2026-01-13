import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Flame,
  Target,
  TrendingUp,
  PiggyBank,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Star,
  Shield,
  Zap,
  ChevronDown,
  Crown,
  BarChart3,
  Sparkles,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { storeMetadata, icpMessaging, pricingDisplay } from "@/data/storeMetadata";

const Landing = () => {
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState<"monthly" | "yearly" | "lifetime">("yearly");

  // Não iniciamos trial a partir da Landing; apenas navegamos
  const { needsOnboarding, upgradeToPro } = useSubscription();

  const handleStart = () => {
    if (needsOnboarding) {
      navigate("/onboarding");
    } else {
      navigate("/app");
    }
  };

  const handleUpgrade = (plan: "monthly" | "yearly" | "lifetime") => {
    upgradeToPro(plan);
    setShowPaywall(false);
    navigate("/app");
  };

  // FAQ items
  const faqs = [
    {
      q: "What makes becoMe different from other habit trackers?",
      a: "becoMe focuses on identity transformation, not just streak counting. It includes financial tracking to show the real cost of habits, uses weekly cycles that match how life actually works, and takes a scientific approach without moralization.",
    },
    {
      q: "How does the free trial work?",
      a: "You get 2 days of full Pro access with the Monthly plan. No credit card required. After the trial, you can continue with limited free access (3 habits, limited calendar) or upgrade to Pro.",
    },
    {
      q: "Can I export my data?",
      a: "Yes, Pro users can export all data as CSV or PDF at any time. Your data is yours.",
    },
    {
      q: "What's the financial tracking feature?",
      a: "becoMe calculates savings from behavior changes. If you reduce coffee from 4 to 2 cups daily at $3.50 each, you'll see your monthly savings. Discipline pays off.",
    },
    {
      q: "Is there a money-back guarantee?",
      a: "Yes. If you're not satisfied within 30 days of purchase, we'll refund you. No questions asked.",
    },
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Marketing Navigation - No app links */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg">becoMe</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button size="sm" onClick={handleStart}>
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            2-day free trial • No credit card required
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Identity <span className="text-gradient">&gt;</span> Intensity
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Track habits. See savings. Become who you're aiming to be. A scientific approach to consistency without the
            guilt.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleStart} className="gap-2 text-lg px-8">
              Start Your 2-Day Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setShowPaywall(true)}>
              View Pricing
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Join thousands building lasting habits through identity, not willpower.
          </p>
        </div>
      </section>

      {/* What becoMe Does */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">What becoMe Does</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete system for identity-driven behavior change
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                title: "Habit Tracking",
                desc: "Simple, visual, effective. Track daily and weekly habits.",
              },
              { icon: Target, title: "Custom Trackers", desc: "Monitor any metric that matters. Reduce or increase." },
              { icon: PiggyBank, title: "Financial Impact", desc: "See real savings from behavior changes." },
              {
                icon: Calendar,
                title: "Weekly Cycles",
                desc: "Life isn't about perfect days. It's about consistent weeks.",
              },
              { icon: BarChart3, title: "Visual Progress", desc: "Charts and calendars that show your journey." },
              {
                icon: Sparkles,
                title: "Future Self",
                desc: "Define who you're becoming. Let habits flow from identity.",
              },
            ].map((item, i) => (
              <Card key={i} className="glass border-border/30 group hover:glow-subtle transition-all">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Matters - Identity Segments */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why It Matters</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Different people, same goal: lasting change</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(icpMessaging).map(([key, segment]) => (
              <Card key={key} className="glass border-border/30 overflow-hidden">
                <CardContent className="p-6">
                  <Badge variant="outline" className="mb-4 capitalize">
                    {key}
                  </Badge>
                  <h3 className="text-xl font-bold mb-2">{segment.headline}</h3>
                  <p className="text-muted-foreground mb-4">{segment.subheadline}</p>
                  <ul className="space-y-2">
                    {segment.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-secondary/30">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground">Start free. Upgrade when you're ready.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(pricingDisplay).map(([key, plan]) => (
              <Card
                key={key}
                className={cn(
                  "glass border-border/30 relative overflow-hidden transition-all",
                  plan.popular && "border-primary/50 ring-2 ring-primary/20",
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-1">{plan.label}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    {plan.period !== "once" && <span className="text-muted-foreground">/{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => {
                      setSelectedPricing(key as any);
                      setShowPaywall(true);
                    }}
                  >
                    {key === "lifetime" ? "Get Lifetime Access" : "Choose Plan"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include: Unlimited habits • Unlimited trackers • Full calendar • Financial tracking • Export • No
            ads
          </p>
        </div>
      </section>

      {/* Testimonials Placeholder */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Users Say</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Alex",
                role: "Engineer",
                text: "Finally, a habit app that doesn't treat me like a child. Data-driven and no guilt trips.",
              },
              {
                name: "Maria",
                role: "Designer",
                text: "The financial tracking opened my eyes. I've saved €200/month just by tracking my coffee habit.",
              },
              {
                name: "James",
                role: "Entrepreneur",
                text: "Weekly cycles > daily perfection. This app gets how life actually works.",
              },
            ].map((t, i) => (
              <Card key={i} className="glass border-border/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm mb-4 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-secondary/30">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="glass border border-border/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="font-medium">{faq.q}</span>
                  <ChevronDown
                    className={cn("h-5 w-5 text-muted-foreground transition-transform", openFaq === i && "rotate-180")}
                  />
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to become?</h2>
          <p className="text-muted-foreground mb-8">Start your 2-day free trial. No credit card required.</p>
          <Button size="lg" onClick={handleStart} className="gap-2 text-lg px-8">
            Start Your 2-Day Trial
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Flame className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold">becoMe</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="mailto:support@become.app" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} becoMe. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        trigger="calendar"
        trialDaysLeft={2}
      />
    </div>
  );
};

export default Landing;
