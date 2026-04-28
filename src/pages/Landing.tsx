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
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/Paywall/PaywallModal";

/**
 * Landing — "Identity OS for ambitious people"
 * Premium, mature, conversion-focused. Apple × WHOOP × Nike discipline.
 * Black canvas, neon-lime accent, restrained ultraviolet glow.
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
      a: "No. Habit trackers count check-marks. Become is an operating system for identity — habits, nutrition, planning, metrics and momentum, all in one place.",
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
      a: "Yes. One click in your account. No emails, no friction. 30-day money-back guarantee on yearly and lifetime.",
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
      <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden">
        {/* Ambient ultraviolet glow */}
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

          <p className="type-body text-lg md:text-xl text-muted-foreground max-w-[34ch] mx-auto mb-12">
            One system for habits, health, and momentum.<br className="hidden md:block" />
            Built for people serious about who they're becoming.
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
                {/* Faux app screen */}
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

      {/* ===== WHY USERS FAIL ===== */}
      <section id="how" className="py-24 md:py-32 border-t border-foreground/[0.06]">
        <div className="container max-w-3xl text-center px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-5">// The problem</p>
          <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight leading-[1] mb-6">
            Most people don't fail<br />because of motivation.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12">
            They fail because they don't have <span className="text-foreground">systems</span>.
            Apps remind them. Coaches push them. But nothing connects who they are today
            with who they're trying to become.
          </p>
          <div className="inline-block border-l-2 border-primary pl-6 py-2 text-left max-w-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2">// Then there's Become</p>
            <p className="text-base text-foreground leading-relaxed">
              One operating system for your habits, health, plans and momentum.
              Built for people who are done playing.
            </p>
          </div>
        </div>
      </section>

      {/* ===== WHAT'S INSIDE ===== */}
      <section id="inside" className="py-24 md:py-32 border-t border-foreground/[0.06]">
        <div className="container max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">// What's inside</p>
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight leading-[1] mb-4">
              One system. Every lever.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Stop stitching six apps together. Become unifies the inputs that actually move identity.
            </p>
          </div>

          <div className="grid gap-px bg-foreground/[0.06] border border-foreground/[0.06] md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => (
              <div
                key={i}
                className="bg-background p-8 group hover:bg-foreground/[0.02] transition-colors"
              >
                <div className="h-10 w-10 mb-6 flex items-center justify-center border border-foreground/10 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                  <m.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-tight">{m.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GAMIFICATION ===== */}
      <section className="py-24 md:py-32 border-t border-foreground/[0.06] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, hsl(var(--neon-toxic) / 0.08), transparent 60%)",
          }}
        />
        <div className="container max-w-5xl px-6 relative z-10">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">// Momentum</p>
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight leading-[1] mb-4">
              Progress should feel addictive.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Streaks, levels and consistency — calibrated for adults. No confetti spam.
            </p>
          </div>

          <div className="grid gap-px bg-foreground/[0.06] border border-foreground/[0.06] md:grid-cols-4">
            {[
              { label: "Streak", value: "47", unit: "On fire.", icon: Flame },
              { label: "Level", value: "12", unit: "Next one's close.", icon: TrendingUp },
              { label: "Points", value: "2.4K", unit: "This month.", icon: Sparkles },
              { label: "Consistency", value: "89%", unit: "Real momentum.", icon: Target },
            ].map((s, i) => (
              <div key={i} className="bg-background p-8 text-center group hover:bg-foreground/[0.015] transition-colors">
                <s.icon className="h-4 w-4 mx-auto text-primary mb-3 transition-transform group-hover:scale-110" />
                <p className="type-eyebrow mb-2">{s.label}</p>
                <p className="text-4xl font-black italic text-primary mb-1.5 tabular-nums" style={{ textShadow: "0 0 24px hsl(var(--neon-toxic) / 0.4)" }}>
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground/80">{s.unit}</p>
              </div>
            ))}
          </div>

          {/* Consistency strip */}
          <div className="mt-10 border border-foreground/[0.06] bg-background p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="type-eyebrow">Last 30 days</p>
              <p className="type-eyebrow text-primary">You're building momentum.</p>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 30 }).map((_, i) => {
                const intensity = [0.15, 0.4, 0.7, 1][Math.floor(Math.random() * 4)];
                return (
                  <div
                    key={i}
                    className="flex-1 h-10 transition-transform hover:scale-y-110 origin-bottom"
                    style={{ background: `hsl(var(--neon-toxic) / ${intensity})` }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== DIFFERENTIATION ===== */}
      <section className="py-24 md:py-32 border-t border-foreground/[0.06]">
        <div className="container max-w-3xl px-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-5">// Why Become</p>
          <h2 className="text-3xl md:text-6xl font-black italic uppercase tracking-tight leading-[1] mb-8">
            Most apps track tasks.<br />
            <span className="text-primary" style={{ textShadow: "0 0 40px hsl(var(--neon-toxic) / 0.4)" }}>
              Become tracks transformation.
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Tasks come and go. Identity is what stays. Every check-in inside Become is a vote
            for the version of you that's worth becoming.
          </p>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="py-24 md:py-32 border-t border-foreground/[0.06]">
        <div className="container max-w-6xl px-6">
          <div className="grid gap-px bg-foreground/[0.06] border border-foreground/[0.06] md:grid-cols-3 mb-16">
            {[
              { value: "12,400+", label: "People in motion" },
              { value: "1.2M", label: "Wins logged" },
              { value: "380K", label: "Days showed up" },
            ].map((s, i) => (
              <div key={i} className="bg-background p-10 text-center">
                <p className="text-5xl font-black italic tracking-tight mb-2 tabular-nums">{s.value}</p>
                <p className="type-eyebrow">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: "Alex M.", role: "Founder", text: "I tried 6 productivity apps. Become is the first that didn't feel like a toy. It feels like infrastructure." },
              { name: "Maria S.", role: "Designer", text: "The nutrition + habits combo is the killer feature. My week is finally one system, not seven tabs." },
              { name: "James K.", role: "Operator", text: "Weekly cycles changed everything. I stopped chasing perfect days and started compounding." },
            ].map((t, i) => (
              <div key={i} className="border border-foreground/[0.08] bg-foreground/[0.02] p-6 hover:border-primary/30 transition-colors">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-primary text-primary" />)}
                </div>
                <p className="text-sm leading-relaxed mb-6 text-foreground/90">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-foreground/[0.06]">
                  <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-sm text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-24 md:py-32 border-t border-foreground/[0.06]">
        <div className="container max-w-5xl px-6">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">// Pricing</p>
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight leading-[1] mb-4">
              Start free. Commit when ready.
            </h2>
            <p className="text-muted-foreground">Same product. Three commitments.</p>
          </div>

          <div className="grid gap-px bg-foreground/[0.06] border border-foreground/[0.06] md:grid-cols-3">
            {[
              { key: "monthly", label: "Monthly", price: "€7.99", period: "/mo", desc: "Try it. Stay if you love it.", popular: false },
              { key: "yearly", label: "Yearly", price: "€59.99", period: "/yr", desc: "Best value. Save 37%.", popular: true },
              { key: "lifetime", label: "Lifetime", price: "€149", period: "once", desc: "Pay once. Own it forever.", popular: false },
            ].map(p => (
              <div key={p.key} className={cn("bg-background p-8 relative", p.popular && "bg-foreground/[0.02]")}>
                {p.popular && (
                  <div className="absolute top-0 left-0 bg-primary text-primary-foreground font-mono text-[9px] uppercase tracking-widest px-3 py-1">
                    Most popular
                  </div>
                )}
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3 mt-2">{p.label}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-black italic tracking-tight">{p.price}</span>
                  <span className="text-muted-foreground text-sm">{p.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">{p.desc}</p>
                <Button
                  className="w-full"
                  variant={p.popular ? "default" : "outline"}
                  onClick={() => { setShowPaywall(true); }}
                >
                  {p.key === "lifetime" ? "Get Lifetime" : "Start 7-day Trial"}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground font-mono uppercase tracking-wider">
            <span>✓ Unlimited habits</span>
            <span>✓ AI nutrition</span>
            <span>✓ Full calendar</span>
            <span>✓ Export anytime</span>
            <span>✓ No ads</span>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-24 md:py-32 border-t border-foreground/[0.06]">
        <div className="container max-w-3xl px-6">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">// FAQ</p>
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight leading-[1]">
              Questions, answered.
            </h2>
          </div>

          <div className="border-t border-foreground/[0.08]">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-foreground/[0.08]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-6 text-left group"
                >
                  <span className="font-semibold text-base md:text-lg pr-4 group-hover:text-primary transition-colors">
                    {faq.q}
                  </span>
                  <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", openFaq === i && "rotate-180 text-primary")} />
                </button>
                {openFaq === i && (
                  <div className="pb-6 text-muted-foreground leading-relaxed animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-32 md:py-40 border-t border-foreground/[0.06] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--neon-toxic) / 0.12), transparent 60%)",
          }}
        />
        <div className="container max-w-3xl px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tight leading-[0.95] mb-8">
            Your future self<br />
            <span className="text-primary" style={{ textShadow: "0 0 50px hsl(var(--neon-toxic) / 0.5)" }}>
              starts today.
            </span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            7 days free. No credit card. Cancel anytime.
          </p>
          <Button size="lg" onClick={handleStartTrial} className="gap-2 px-12">
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
