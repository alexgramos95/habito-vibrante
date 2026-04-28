import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Calendar,
  Apple,
  ShoppingBag,
  Flame,
  TrendingUp,
  Activity,
  Target,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/Paywall/PaywallModal";

/**
 * Landing — "Identity OS for ambitious people"
 * Premium, conversion-focused. Apple × WHOOP × Nike discipline.
 */
const Landing = () => {
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { upgradeToPro } = useSubscription();

  const handleStartTrial = () => navigate("/onboarding");
  const handleUpgrade = (plan: "monthly" | "yearly" | "lifetime") => {
    upgradeToPro(plan);
    setShowPaywall(false);
    navigate("/app");
  };
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const modules = [
    { icon: CheckCircle2, title: "Habits & Rituals", desc: "Daily systems that compound into identity." },
    { icon: Calendar, title: "Progress Calendar", desc: "See your consistency, week after week." },
    { icon: Apple, title: "Nutrition Control", desc: "Plan meals, hit macros, stay on protocol." },
    { icon: ShoppingBag, title: "Smart Shopping", desc: "Lists generated from your week's plan." },
    { icon: Flame, title: "Streaks & Levels", desc: "Momentum you can feel — without the noise." },
    { icon: Activity, title: "Personal Metrics", desc: "Track what matters. Ignore what doesn't." },
  ];

  const faqs = [
    {
      q: "Is Become just another habit tracker?",
      a: "No. Habit trackers count check-marks. Become is an operating system for identity — habits, nutrition, planning, metrics and momentum, in one place.",
    },
    {
      q: "How does the free trial work?",
      a: "7 days of full Pro access. No credit card required. Cancel anytime. After the trial you stay on Free with 3 habits, or upgrade to keep everything.",
    },
    {
      q: "What's included in Pro?",
      a: "Unlimited habits, full nutrition module, AI meal plans, shopping automation, full calendar history, advanced metrics, exports and priority support.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. One click in your account. 30-day money-back guarantee on yearly and lifetime.",
    },
    {
      q: "Does my data stay private?",
      a: "Always. End-to-end encrypted sync, no ads, no data selling. Export to CSV or PDF whenever you want.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased animate-page-enter">
      {/* ===== NAV ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-2xl bg-background/60 border-b border-foreground/[0.05]">
        <div className="container max-w-6xl flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-primary flex items-center justify-center">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-black italic uppercase tracking-tighter text-base">becoMe</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <button onClick={() => scrollTo("inside")} className="hover:text-foreground transition-colors">Product</button>
            <button onClick={() => scrollTo("how")} className="hover:text-foreground transition-colors">How it works</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-foreground transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button size="sm" onClick={handleStartTrial}>Start Free</Button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        {/* Ambient glows */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] pointer-events-none opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--neon-ultra) / 0.18), transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--neon-toxic) / 0.10), transparent 70%)",
          }}
        />

        <div className="container max-w-5xl relative z-10 text-center px-6">
          <div className="inline-flex items-center gap-2 mb-10 px-3 py-1.5 border border-foreground/10 bg-foreground/[0.03] backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
            <span className="type-eyebrow text-muted-foreground">
              Identity OS · Now in beta
            </span>
          </div>

          <h1 className="type-display text-[44px] sm:text-6xl md:text-7xl lg:text-[92px] mb-8 animate-fade-in">
            Become the person<br />
            <span className="text-primary" style={{ textShadow: "0 0 60px hsl(var(--neon-toxic) / 0.45)" }}>
              you promised
            </span><br />
            yourself you'd be.
          </h1>

          <p className="type-body text-lg md:text-xl text-muted-foreground max-w-[40ch] mx-auto mb-12">
            Habits, progress and discipline<br className="hidden md:block" />
            in one operating system.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-7">
            <Button size="lg" onClick={handleStartTrial} className="press-tactile gap-2 px-10 w-full sm:w-auto">
              Start Free
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="ghost" onClick={() => scrollTo("how")} className="press-tactile w-full sm:w-auto">
              See How It Works
            </Button>
          </div>

          <p className="type-eyebrow text-muted-foreground/50">
            7 days free · No credit card · Cancel anytime
          </p>

          {/* Mobile mockup */}
          <div className="mt-16 md:mt-24 relative max-w-[320px] mx-auto">
            <div
              className="absolute -inset-12 pointer-events-none opacity-70"
              style={{
                background: "radial-gradient(closest-side, hsl(var(--neon-toxic) / 0.18), transparent 70%)",
              }}
            />
            <div className="relative rounded-[44px] border border-foreground/15 bg-card p-2.5 shadow-[0_40px_120px_-20px_hsl(var(--neon-ultra)/0.4)]">
              <div className="rounded-[34px] overflow-hidden bg-background border border-foreground/10">
                <div className="px-5 pt-6 pb-8">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Tuesday · Week 17</p>
                      <h3 className="text-xl font-black italic uppercase tracking-tight mt-0.5">Today</h3>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <Flame className="h-4 w-4 text-primary" />
                    </div>
                  </div>

                  <div className="border border-foreground/10 bg-foreground/[0.02] p-3 mb-2.5 flex items-center gap-3">
                    <div className="h-7 w-7 border-2 border-primary bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Morning workout</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">06:30 · Done</p>
                    </div>
                  </div>
                  <div className="border border-foreground/10 bg-foreground/[0.02] p-3 mb-2.5 flex items-center gap-3">
                    <div className="h-7 w-7 border-2 border-primary bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Read 20 min</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">07:15 · Done</p>
                    </div>
                  </div>
                  <div className="border border-foreground/10 p-3 mb-4 flex items-center gap-3">
                    <div className="h-7 w-7 border-2 border-foreground/20" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Deep work · 90 min</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">09:00</p>
                    </div>
                  </div>

                  <div className="border-t border-foreground/10 pt-4 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Streak</p>
                      <p className="text-xl font-black italic">23 days</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground text-right">Level</p>
                      <p className="text-xl font-black italic text-primary text-right">07</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROBLEM → BECOME (merged) ===== */}
      <section id="how" className="py-24 md:py-28 border-t border-foreground/[0.05]">
        <div className="container max-w-3xl text-center px-6">
          <p className="type-eyebrow text-primary mb-6">// The shift</p>
          <h2 className="type-display text-3xl md:text-5xl mb-7">
            Most people don't fail<br />because of motivation.
          </h2>
          <p className="type-body text-lg md:text-xl text-muted-foreground mb-10 max-w-[44ch] mx-auto">
            They fail because they don't have <span className="text-foreground font-semibold">systems</span>.
            Become is one operating system for habits, health, plans and momentum —
            built for people who are done playing.
          </p>
        </div>
      </section>

      {/* ===== WHAT'S INSIDE + PRODUCT PROOF ===== */}
      <section id="inside" className="py-24 md:py-28 border-t border-foreground/[0.05]">
        <div className="container max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="type-eyebrow text-primary mb-5">// What's inside</p>
            <h2 className="type-display text-3xl md:text-5xl mb-5">
              One system. Every lever.
            </h2>
            <p className="type-body text-muted-foreground max-w-[44ch] mx-auto">
              Stop stitching six apps together. Become unifies the inputs that actually move identity.
            </p>
          </div>

          <div className="grid gap-px bg-foreground/[0.05] border border-foreground/[0.05] md:grid-cols-2 lg:grid-cols-3 mb-20">
            {modules.map((m, i) => (
              <div
                key={i}
                className="bg-background p-9 group hover:bg-foreground/[0.02] transition-colors duration-300"
              >
                <div className="h-11 w-11 mb-7 flex items-center justify-center border border-foreground/10 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-300">
                  <m.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2.5 tracking-tight">{m.title}</h3>
                <p className="type-body text-sm text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Real product UI previews */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Calendar preview */}
            <div className="border border-foreground/[0.08] bg-foreground/[0.015] p-7 rounded-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="type-eyebrow text-muted-foreground mb-1">// Calendar</p>
                  <h3 className="text-base font-bold tracking-tight">April · Week 17</h3>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  92% consistency
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {["M","T","W","T","F","S","S"].map((d, i) => (
                  <p key={i} className="text-center text-[10px] font-mono uppercase text-muted-foreground/60 mb-1">{d}</p>
                ))}
                {Array.from({ length: 28 }).map((_, i) => {
                  const intensities = [0, 0.2, 0.5, 0.85, 1];
                  const intensity = intensities[Math.floor((Math.sin(i * 1.7) + 1) * 2.4)];
                  return (
                    <div
                      key={i}
                      className="aspect-square border border-foreground/[0.06] transition-colors duration-200"
                      style={{ background: `hsl(var(--neon-toxic) / ${intensity})` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Nutrition preview */}
            <div className="border border-foreground/[0.08] bg-foreground/[0.015] p-7 rounded-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="type-eyebrow text-muted-foreground mb-1">// Nutrition</p>
                  <h3 className="text-base font-bold tracking-tight">Today's plan</h3>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  2,140 / 2,200 kcal
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { meal: "Breakfast", item: "Oats, berries, whey", kcal: 420 },
                  { meal: "Lunch", item: "Chicken, rice, greens", kcal: 680 },
                  { meal: "Snack", item: "Greek yogurt, almonds", kcal: 320 },
                  { meal: "Dinner", item: "Salmon, sweet potato", kcal: 720 },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between border border-foreground/[0.06] bg-background p-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{m.meal}</p>
                      <p className="text-sm font-semibold mt-0.5">{m.item}</p>
                    </div>
                    <p className="font-mono text-xs text-primary">{m.kcal}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-foreground/[0.06]">
                {[
                  { l: "Protein", v: "168g" },
                  { l: "Carbs", v: "210g" },
                  { l: "Fat", v: "72g" },
                ].map((m, i) => (
                  <div key={i} className="text-center">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{m.l}</p>
                    <p className="font-black italic text-base mt-1">{m.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MOMENTUM ===== */}
      <section className="py-24 md:py-28 border-t border-foreground/[0.05] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, hsl(var(--neon-toxic) / 0.08), transparent 60%)",
          }}
        />
        <div className="container max-w-5xl px-6 relative z-10">
          <div className="text-center mb-16">
            <p className="type-eyebrow text-primary mb-5">// Momentum</p>
            <h2 className="type-display text-3xl md:text-5xl mb-5">
              Progress should feel addictive.
            </h2>
            <p className="type-body text-muted-foreground max-w-[44ch] mx-auto">
              Streaks, levels and consistency — calibrated for adults. No confetti spam.
            </p>
          </div>

          <div className="grid gap-px bg-foreground/[0.05] border border-foreground/[0.05] md:grid-cols-4">
            {[
              { label: "Streak", value: "47", unit: "On fire.", icon: Flame },
              { label: "Level", value: "12", unit: "Next one's close.", icon: TrendingUp },
              { label: "Points", value: "2.4K", unit: "This month.", icon: Sparkles },
              { label: "Consistency", value: "89%", unit: "Real momentum.", icon: Target },
            ].map((s, i) => (
              <div key={i} className="bg-background p-9 text-center group hover:bg-foreground/[0.015] transition-colors duration-300">
                <s.icon className="h-4 w-4 mx-auto text-primary mb-4 transition-transform duration-300 group-hover:scale-110" />
                <p className="type-eyebrow mb-3">{s.label}</p>
                <p className="type-display text-5xl text-primary mb-2 tabular-nums" style={{ textShadow: "0 0 24px hsl(var(--neon-toxic) / 0.45)" }}>
                  {s.value}
                </p>
                <p className="type-body text-xs text-muted-foreground/80">{s.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CREDIBILITY ===== */}
      <section className="py-24 md:py-28 border-t border-foreground/[0.05] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, hsl(var(--neon-ultra) / 0.15), transparent 60%)",
          }}
        />
        <div className="container max-w-6xl px-6 relative">
          <div className="text-center mb-14 md:mb-16">
            <p className="type-eyebrow text-primary mb-5">// Built with intent</p>
            <h2 className="type-display text-3xl md:text-5xl lg:text-6xl mb-6 max-w-[20ch] mx-auto">
              Built for people serious about growth.
            </h2>
            <p className="type-body text-muted-foreground max-w-[52ch] mx-auto">
              No vanity metrics. No fake testimonials. A system measured by what actually matters.
            </p>
          </div>

          <div className="grid gap-px bg-foreground/[0.05] border border-foreground/[0.05] md:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "—", label: "Habits Completed", hint: "All-time check-ins" },
              { value: "—", label: "Active Streaks", hint: "Operators in motion" },
              { value: "—", label: "Weekly Consistency", hint: "Avg. completion rate" },
              { value: "—", label: "Daily Sessions", hint: "Showing up, every day" },
            ].map((s, i) => (
              <div
                key={i}
                className="group bg-background p-8 md:p-10 transition-colors duration-300 hover:bg-foreground/[0.02]"
              >
                <p className="type-display text-5xl md:text-6xl mb-4 tabular-nums text-foreground/90 group-hover:text-primary transition-colors duration-300">
                  {s.value}
                </p>
                <p className="type-eyebrow mb-2">{s.label}</p>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">{s.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
            <span>Private by default</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>No ads, ever</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>Encrypted sync</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-24 md:py-28 border-t border-foreground/[0.05]">
        <div className="container max-w-5xl px-6">
          <div className="text-center mb-16">
            <p className="type-eyebrow text-primary mb-5">// Pricing</p>
            <h2 className="type-display text-3xl md:text-5xl mb-5">
              Start free. Commit when ready.
            </h2>
            <p className="type-body text-muted-foreground">Same product. Three commitments.</p>
          </div>

          <div className="grid gap-px bg-foreground/[0.05] border border-foreground/[0.05] md:grid-cols-3">
            {[
              { key: "monthly", label: "Monthly", price: "€7.99", period: "/mo", desc: "Try it. Stay if you love it.", popular: false },
              { key: "yearly", label: "Yearly", price: "€59.99", period: "/yr", desc: "Best value. Save 37%.", popular: true },
              { key: "lifetime", label: "Lifetime", price: "€149", period: "once", desc: "Pay once. Own it forever.", popular: false },
            ].map(p => (
              <div key={p.key} className={cn("bg-background p-9 relative transition-colors duration-300", p.popular && "bg-foreground/[0.025]")}>
                {p.popular && (
                  <div className="absolute top-0 left-0 bg-primary text-primary-foreground type-eyebrow px-3 py-1">
                    Most popular
                  </div>
                )}
                <p className="type-eyebrow text-muted-foreground mb-4 mt-2">{p.label}</p>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="type-display text-5xl">{p.price}</span>
                  <span className="text-muted-foreground text-sm">{p.period}</span>
                </div>
                <p className="type-body text-sm text-muted-foreground mb-9 min-h-[40px]">{p.desc}</p>
                <Button
                  className="press-tactile w-full"
                  variant={p.popular ? "default" : "outline"}
                  onClick={handleStartTrial}
                >
                  Start Free
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 type-eyebrow text-muted-foreground/70">
            <span>✓ Unlimited habits</span>
            <span>✓ AI nutrition</span>
            <span>✓ Full calendar</span>
            <span>✓ Export anytime</span>
            <span>✓ No ads</span>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-24 md:py-28 border-t border-foreground/[0.05]">
        <div className="container max-w-3xl px-6">
          <div className="text-center mb-12">
            <p className="type-eyebrow text-primary mb-5">// FAQ</p>
            <h2 className="type-display text-3xl md:text-5xl">
              Questions, answered.
            </h2>
          </div>

          <div className="border-t border-foreground/[0.07]">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-foreground/[0.07]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-7 text-left group"
                >
                  <span className="font-semibold text-base md:text-lg pr-4 group-hover:text-primary transition-colors duration-200 tracking-tight">
                    {faq.q}
                  </span>
                  <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-all duration-300", openFaq === i && "rotate-180 text-primary")} />
                </button>
                {openFaq === i && (
                  <div className="pb-7 type-body text-muted-foreground animate-fade-in max-w-[60ch]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-28 md:py-36 border-t border-foreground/[0.05] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--neon-toxic) / 0.12), transparent 60%)",
          }}
        />
        <div className="container max-w-3xl px-6 text-center relative z-10">
          <h2 className="type-display text-4xl md:text-7xl mb-10">
            Your future self<br />
            <span className="text-primary" style={{ textShadow: "0 0 50px hsl(var(--neon-toxic) / 0.55)" }}>
              starts today.
            </span>
          </h2>
          <p className="type-body text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
            7 days free. No credit card. Cancel anytime.
          </p>
          <Button size="lg" onClick={handleStartTrial} className="press-tactile gap-2 px-12">
            Start Free
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-12 border-t border-foreground/[0.06]">
        <div className="container max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 bg-primary flex items-center justify-center">
                <Flame className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-black italic uppercase tracking-tighter text-sm">becoMe</span>
            </div>
            <div className="flex items-center gap-8 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="mailto:support@become.pt" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60">
              © {new Date().getFullYear()} becoMe
            </p>
          </div>
        </div>
      </footer>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        trigger="calendar"
        trialDaysLeft={0}
        forceLang="en"
      />
    </div>
  );
};

export default Landing;
