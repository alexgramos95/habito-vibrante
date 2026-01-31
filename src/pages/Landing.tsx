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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { upgradeToPro } = useSubscription();

  const handleStartTrial = () => {
    navigate("/onboarding");
  };

  const handleUpgrade = (plan: "monthly" | "yearly" | "lifetime") => {
    upgradeToPro(plan);
    setShowPaywall(false);
    navigate("/app");
  };

  // FAQ items - Updated pricing JANUARY 2026
  const faqs = [
    {
      q: "What makes becoMe different from other habit trackers?",
      a: "becoMe focuses on identity transformation, not just streak counting. It uses weekly cycles that match how life actually works, and takes a scientific approach without moralization.",
    },
    {
      q: "How does pricing work?",
      a: "We offer three plans: Monthly at €7.99/month, Yearly at €59.99/year (best value), and Lifetime at €149 (one-time payment). All plans include full Pro access with unlimited habits and trackers.",
    },
    {
      q: "Can I export my data?",
      a: "Yes, Pro users can export all data as CSV or PDF at any time. Your data is yours.",
    },
    {
      q: "What happens during the free trial?",
      a: "You get 7 days of full Pro access - unlimited habits, trackers, and all features. No credit card required to start.",
    },
    {
      q: "Is there a money-back guarantee?",
      a: "Yes. If you're not satisfied within 30 days of purchase, we'll refund you. No questions asked.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Marketing Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/60 shadow-sm">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">becoMe</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button size="sm" onClick={handleStartTrial}>
              Start Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm bg-secondary/50">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            7 dias grátis · PRO desde €7,99/mês
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
            Torna-te consistente,<br />um dia de cada vez.
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            A becoMe ajuda-te a criar hábitos com intenção, clareza e continuidade.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={handleStartTrial} className="gap-2 px-8">
              Começar agora
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setShowPaywall(true)}>
              Saber mais
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Junta-te a quem constrói hábitos duradouros através da identidade, não da força de vontade.
          </p>
        </div>
      </section>

      {/* What becoMe Does */}
      <section className="py-16 bg-secondary/40">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">What becoMe Does</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete system for identity-driven behavior change
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                title: "Habit Tracking",
                desc: "Simple, visual, effective. Track daily and weekly habits.",
              },
              {
                icon: Target,
                title: "Custom Trackers",
                desc: "Monitor any metric that matters. Reduce or increase.",
              },
              {
                icon: PiggyBank,
                title: "Financial Impact",
                desc: "See real savings from behavior changes.",
              },
              {
                icon: Calendar,
                title: "Weekly Cycles",
                desc: "Life isn't about perfect days. It's about consistent weeks.",
              },
              {
                icon: BarChart3,
                title: "Visual Progress",
                desc: "Charts and calendars that show your journey.",
              },
              {
                icon: Sparkles,
                title: "Future Self",
                desc: "Define who you're becoming. Let habits flow from identity.",
              },
            ].map((item, i) => (
              <Card key={i} className="border-border bg-card shadow-sm group hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Matters - Identity Segments */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">Why It Matters</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Different people, same goal: lasting change</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(icpMessaging).map(([key, segment]) => (
              <Card key={key} className="border-border bg-card shadow-sm overflow-hidden">
                <CardContent className="p-5">
                  <Badge variant="outline" className="mb-3 capitalize bg-secondary/50">
                    {key}
                  </Badge>
                  <h3 className="text-lg font-bold mb-2">{segment.headline}</h3>
                  <p className="text-muted-foreground mb-3 text-sm">{segment.subheadline}</p>
                  <ul className="space-y-1.5">
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
      <section className="py-16 bg-secondary/40">
        <div className="container max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">Simple Pricing</h2>
            <p className="text-muted-foreground">Start free. Upgrade when you're ready.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(pricingDisplay).map(([key, plan]) => (
              <Card
                key={key}
                className={cn(
                  "border-border bg-card shadow-sm relative overflow-hidden transition-all",
                  plan.popular && "border-primary/50 ring-2 ring-primary/20",
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-1">{plan.label}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">€{plan.price.toFixed(2).replace(".", ",")}</span>
                    {plan.period !== "once" && <span className="text-muted-foreground text-sm">/{plan.period === "month" ? "mês" : "ano"}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                  {plan.savings && (
                    <p className="text-xs text-success mb-3">{plan.savings}</p>
                  )}
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => {
                      setSelectedPricing(key as "monthly" | "yearly" | "lifetime");
                      setShowPaywall(true);
                    }}
                  >
                    {key === "lifetime" ? "Get Lifetime Access" : "Choose Plan"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            All plans include: Unlimited habits • Unlimited trackers • Full calendar • Financial tracking • Export • No
            ads
          </p>
        </div>
      </section>

      {/* Testimonials */}
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
      <section className="py-16 bg-secondary/40">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronDown
                    className={cn("h-4 w-4 text-muted-foreground transition-transform", openFaq === i && "rotate-180")}
                  />
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="container max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-3">Pronto para começar?</h2>
          <p className="text-muted-foreground mb-6">7 dias grátis. Atualiza para PRO desde €7,99/mês.</p>
          <Button size="lg" onClick={handleStartTrial} className="gap-2 px-8">
            Começar agora
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <Flame className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">becoMe</span>
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
        trialDaysLeft={0}
      />
    </div>
  );
};

export default Landing;
