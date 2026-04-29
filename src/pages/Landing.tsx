import { useEffect, useMemo, useRef, useState } from "react";
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
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { BecomeLogo } from "@/components/Brand/BecomeLogo";
import {
  PhoneFrame,
  HabitsPreview,
  CalendarPreview,
  ProgressPreview,
  NutritionPreview,
  ShoppingPreview,
} from "@/components/Landing/LandingPreviews";

/**
 * Landing — "Identity OS for ambitious people"
 * CRO-tuned: emotional hero, repeated CTA, sticky mobile CTA, scroll reveal.
 */

/* ---------- Scroll reveal (fade-in on view) ---------- */
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      )}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
};

/* ---------- Animated counter (when in view) ---------- */
const Counter = ({
  end,
  suffix = "",
  duration = 1400,
  className = "",
}: {
  end: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let started = false;
    const run = (start: number) => (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(end * eased));
      if (p < 1) raf = requestAnimationFrame(run(start));
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          raf = requestAnimationFrame((t) => run(t)(t));
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [end, duration]);

  const formatted =
    end >= 1000 ? `${(val / 1000).toFixed(val >= 1000 ? 1 : 0)}K` : `${val}`;

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {formatted}
      {suffix}
    </span>
  );
};

/* ---------- A/B test for hero headline + primary CTA ----------
 * Sticky per visitor (localStorage). Logged via analytics on mount.
 */
type HeroVariant = "promise" | "identity" | "system";
const HERO_AB_KEY = "become_landing_hero_ab";
const HERO_VARIANTS: Record<HeroVariant, {
  headline: React.ReactNode;
  sub: string;
  cta: string;
}> = {
  promise: {
    headline: (
      <>
        Become the person<br />
        <span className="text-primary" style={{ textShadow: "0 0 60px hsl(var(--neon-toxic) / 0.5)" }}>
          you promised
        </span><br />
        yourself you'd be.
      </>
    ),
    sub: "Habits, progress and discipline in one operating system.",
    cta: "Start Free — 7 Days",
  },
  identity: {
    headline: (
      <>
        Stop tracking habits.<br />
        <span className="text-primary" style={{ textShadow: "0 0 60px hsl(var(--neon-toxic) / 0.5)" }}>
          Build identity.
        </span>
      </>
    ),
    sub: "One operating system for the life you keep postponing.",
    cta: "Try It Free",
  },
  system: {
    headline: (
      <>
        Six apps. One life.<br />
        <span className="text-primary" style={{ textShadow: "0 0 60px hsl(var(--neon-toxic) / 0.5)" }}>
          Become the system.
        </span>
      </>
    ),
    sub: "Habits, calendar, nutrition and shopping — finally one place.",
    cta: "Get Started Free",
  },
};

const Landing = () => {
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const { upgradeToPro } = useSubscription();

  // ── A/B variant ─────────────────────────────────────────────
  const heroVariant = useMemo<HeroVariant>(() => {
    if (typeof window === "undefined") return "promise";
    try {
      const saved = localStorage.getItem(HERO_AB_KEY) as HeroVariant | null;
      if (saved && saved in HERO_VARIANTS) return saved;
      const keys = Object.keys(HERO_VARIANTS) as HeroVariant[];
      const pick = keys[Math.floor(Math.random() * keys.length)];
      localStorage.setItem(HERO_AB_KEY, pick);
      return pick;
    } catch {
      return "promise";
    }
  }, []);
  const hero = HERO_VARIANTS[heroVariant];

  useEffect(() => {
    try {
      // Light-weight analytics breadcrumb (no-op if not wired up)
      (window as unknown as { plausible?: (e: string, o?: unknown) => void })
        .plausible?.("landing_hero_variant", { props: { variant: heroVariant } });
    } catch { /* noop */ }
  }, [heroVariant]);

  const handleStartTrial = () => {
    try {
      (window as unknown as { plausible?: (e: string, o?: unknown) => void })
        .plausible?.("landing_cta_click", { props: { variant: heroVariant } });
    } catch { /* noop */ }
    navigate("/onboarding");
  };
  const handleUpgrade = (plan: "monthly" | "yearly" | "lifetime") => {
    upgradeToPro(plan);
    setShowPaywall(false);
    navigate("/app");
  };
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Sticky mobile CTA appears after hero
  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      a: "7 days of full Pro access. No credit card required. After the trial you stay on Free with 3 habits, or upgrade to keep everything.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. One click in your account. 30-day money-back guarantee on yearly and lifetime.",
    },
    {
      q: "Does my data stay private?",
      a: "Always. Encrypted sync, no ads, no data selling. Export to CSV or PDF whenever you want.",
    },
  ];

  return (
    <div className="with-scanlines min-h-screen bg-background text-foreground antialiased animate-page-enter">
      {/* ===== NAV ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-2xl bg-background/70 border-b border-foreground/[0.05]">
        <div className="container max-w-6xl flex items-center justify-between h-16">
          <BecomeLogo />
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <button onClick={() => scrollTo("inside")} className="hover:text-foreground transition-colors">Product</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-foreground transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button size="sm" onClick={handleStartTrial}>
              Start Free
            </Button>
          </div>
        </div>
      </nav>

      {/* ===== HERO — preview above the fold (desktop split, mobile stacked) ===== */}
      <section className="relative pt-24 pb-12 md:pt-28 md:pb-16 overflow-hidden">
        {/* Ambient glows */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] pointer-events-none opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--neon-ultra) / 0.20), transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none opacity-50"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--neon-toxic) / 0.12), transparent 70%)",
          }}
        />

        <div className="container max-w-6xl relative z-10 px-6">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
            {/* Copy — minimal: badge, headline, sub, one CTA */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 border border-foreground/10 bg-foreground/[0.03] backdrop-blur-sm animate-fade-in">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
                <span className="type-eyebrow text-muted-foreground">
                  Identity OS · Now in beta
                </span>
              </div>

              <h1 className="type-display text-[44px] sm:text-6xl md:text-7xl lg:text-[80px] leading-[0.95] mb-6 animate-fade-in">
                {hero.headline}
              </h1>

              <p className="type-body text-base md:text-lg text-muted-foreground/90 max-w-[42ch] mx-auto lg:mx-0 mb-8 animate-fade-in">
                {hero.sub}
              </p>

              <div className="flex justify-center lg:justify-start mb-3">
                <Button
                  size="lg"
                  onClick={handleStartTrial}
                  className="gap-2 px-12 w-full sm:w-auto"
                >
                  {hero.cta}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>

              <p className="type-eyebrow text-muted-foreground/50">
                7 days free · No credit card
              </p>
            </div>

            {/* Real product preview — above the fold */}
            <div className="relative mx-auto w-full max-w-[360px] lg:max-w-none" style={{ animation: "float 6s ease-in-out infinite" }}>
              {/* Glow halo */}
              <div
                className="absolute -inset-8 pointer-events-none opacity-70 blur-2xl"
                style={{
                  background:
                    "radial-gradient(closest-side, hsl(var(--neon-toxic) / 0.25), transparent 70%)",
                }}
              />
              <div className="relative">
                <PhoneFrame>
                  <HabitsPreview />
                </PhoneFrame>
              </div>
            </div>
          </div>
        </div>

        {/* Float keyframes (scoped) */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @media (prefers-reduced-motion: reduce) {
            [style*="animation: float"] { animation: none !important; }
          }
        `}</style>
      </section>

      {/* ===== PROBLEM (story step 1) ===== */}
      <section className="py-16 md:py-20 border-t border-foreground/[0.05]">
        <div className="container max-w-3xl px-6 text-center">
          <Reveal>
            <p className="type-eyebrow text-primary mb-5">// The problem</p>
            <h2 className="type-display text-3xl md:text-5xl mb-6">
              Six apps. Zero identity.
            </h2>
            <p className="type-body text-base md:text-lg text-muted-foreground/85 max-w-[52ch] mx-auto">
              Habits in one app. Meals in another. Calendar somewhere else.
              You don't need more tools — you need one system that compounds.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== WHAT'S INSIDE + PRODUCT PROOF ===== */}
      <section id="inside" className="py-16 md:py-20 border-t border-foreground/[0.05]">
        <div className="container max-w-6xl px-6">
          <Reveal>
            <div className="text-center mb-12">
              <p className="type-eyebrow text-primary mb-4">// The product</p>
              <h2 className="type-display text-3xl md:text-5xl mb-4">
                One system. Every lever.
              </h2>
              <p className="type-body text-muted-foreground/80 max-w-[44ch] mx-auto">
                Stop stitching six apps together. Become unifies the inputs that move identity.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-px bg-foreground/[0.05] border border-foreground/[0.05] md:grid-cols-2 lg:grid-cols-3 mb-16">
            {modules.map((m, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="bg-background p-7 group hover:bg-foreground/[0.025] transition-colors duration-300 h-full">
                  <div className="h-11 w-11 mb-7 flex items-center justify-center border border-foreground/10 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-300">
                    <m.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2.5 tracking-tight">{m.title}</h3>
                  <p className="type-body text-sm text-muted-foreground/80">{m.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Secondary modules — Habits already lives in the hero as the
              core engine. These four feed off it with equal visual weight. */}
          <Reveal>
            <div className="text-center mb-8">
              <p className="type-eyebrow text-primary mb-3">// Powered by Habits</p>
              <h3 className="type-display text-2xl md:text-3xl max-w-[28ch] mx-auto">
                Four modules. One identity loop.
              </h3>
            </div>
          </Reveal>

          <div className="grid gap-px bg-foreground/[0.05] border border-foreground/[0.05] sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Comp: CalendarPreview, label: "Calendar", desc: "Perfect days, streaks, peak weeks." },
              { Comp: ProgressPreview, label: "Progress", desc: "Cycle reading, no noise." },
              { Comp: NutritionPreview, label: "Nutrition", desc: "Weekly plan, macros, meals." },
              { Comp: ShoppingPreview, label: "Shopping", desc: "List generated from your week's plan." },
            ].map(({ Comp, label, desc }, i) => (
              <Reveal key={label} delay={i * 80}>
                <div className="bg-background p-6 h-full flex flex-col items-center gap-4">
                  <div className="w-full max-w-[300px]">
                    <PhoneFrame>
                      <Comp />
                    </PhoneFrame>
                  </div>
                  <div className="text-center">
                    <p className="type-eyebrow text-primary mb-1">// {label}</p>
                    <p className="text-sm text-muted-foreground/80 max-w-[24ch] mx-auto">
                      {desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Inline CTA after proof */}
          <Reveal>
            <div className="mt-12 text-center">
              <Button
                size="lg"
                onClick={handleStartTrial}
                className="gap-2 px-12"
              >
                {hero.cta}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <p className="type-eyebrow text-muted-foreground/50 mt-4">
                7 days free · No credit card
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== TRANSFORMATION (with animated counters) ===== */}
      <section className="py-16 md:py-20 border-t border-foreground/[0.05] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, hsl(var(--neon-toxic) / 0.08), transparent 60%)",
          }}
        />
        <div className="container max-w-5xl px-6 relative z-10">
          <Reveal>
            <div className="text-center mb-12">
              <p className="type-eyebrow text-primary mb-4">// The transformation</p>
              <h2 className="type-display text-3xl md:text-5xl mb-4">
                Progress should feel addictive.
              </h2>
              <p className="type-body text-muted-foreground/80 max-w-[44ch] mx-auto">
                Streaks, levels and consistency — calibrated for adults. No confetti spam.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-px bg-foreground/[0.05] border border-foreground/[0.05] grid-cols-2 md:grid-cols-4">
            {[
              { label: "Streak", end: 47, suffix: "", unit: "On fire.", icon: Flame },
              { label: "Level", end: 12, suffix: "", unit: "Next one's close.", icon: TrendingUp },
              { label: "Points", end: 2400, suffix: "", unit: "This month.", icon: Sparkles },
              { label: "Consistency", end: 89, suffix: "%", unit: "Real momentum.", icon: Target },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="bg-background p-7 md:p-9 text-center group hover:bg-foreground/[0.02] transition-colors duration-300 h-full">
                  <s.icon className="h-4 w-4 mx-auto text-primary mb-4 transition-transform duration-300 group-hover:scale-110" />
                  <p className="type-eyebrow mb-3">{s.label}</p>
                  <p
                    className="type-display text-4xl md:text-5xl text-primary mb-2"
                    style={{ textShadow: "0 0 24px hsl(var(--neon-toxic) / 0.5)" }}
                  >
                    <Counter end={s.end} suffix={s.suffix} />
                  </p>
                  <p className="type-body text-xs text-muted-foreground/70">{s.unit}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF — testimonials ===== */}
      <section className="py-16 md:py-20 border-t border-foreground/[0.05]">
        <div className="container max-w-6xl px-6">
          <Reveal>
            <div className="text-center mb-10">
              <p className="type-eyebrow text-primary mb-4">// Early users</p>
              <h2 className="type-display text-3xl md:text-5xl mb-4">
                Built for people who stop quitting.
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-px bg-foreground/[0.05] border border-foreground/[0.05] md:grid-cols-3">
            {[
              {
                quote: "First app I haven't deleted in week two. The system actually compounds.",
                name: "Miguel R.",
                role: "Founder · Lisbon",
              },
              {
                quote: "Replaced four apps. My mornings are quieter and my consistency is up 3×.",
                name: "Ana C.",
                role: "Product Lead · Porto",
              },
              {
                quote: "Feels like a coach, not a tracker. The progress reading hits different.",
                name: "Tomás L.",
                role: "Athlete · Madrid",
              },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 80}>
                <figure className="bg-background p-7 h-full flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[0,1,2,3,4].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <blockquote className="type-body text-foreground/90 text-[15px] leading-relaxed flex-1">
                    "{t.quote}"
                  </blockquote>
                  <figcaption className="mt-5 pt-5 border-t border-foreground/[0.07]">
                    <p className="font-bold text-sm tracking-tight">{t.name}</p>
                    <p className="type-eyebrow text-muted-foreground/70 mt-0.5">{t.role}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-10 text-center">
              <Button size="lg" onClick={handleStartTrial} className="gap-2 px-12">
                {hero.cta}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <p className="type-eyebrow text-muted-foreground/50 mt-4">
                Join them · 7 days free · No card
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== PRICING — premium framing ===== */}
      <section id="pricing" className="py-16 md:py-24 border-t border-foreground/[0.05] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, hsl(var(--neon-ultra) / 0.10), transparent 65%)",
          }}
        />
        <div className="container max-w-5xl px-6 relative z-10">
          <Reveal>
            <div className="text-center mb-12">
              <p className="type-eyebrow text-primary mb-4">// Pricing</p>
              <h2 className="type-display text-3xl md:text-5xl mb-4">
                Start free. Commit when ready.
              </h2>
              <p className="type-body text-muted-foreground/80">
                Less than one coffee a week. One system for life.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 md:gap-5 md:grid-cols-3">
            {[
              {
                key: "monthly", label: "Monthly", price: "€7.99", period: "/mo",
                desc: "Try it. Stay if you love it.", popular: false, badge: null as string | null,
                anchor: null as string | null,
                perks: ["Cancel anytime", "All Pro features", "Encrypted sync"],
              },
              {
                key: "yearly", label: "Yearly", price: "€59.99", period: "/yr",
                desc: "Best value. Save 37%.", popular: true, badge: "Most popular",
                anchor: "€95.88",
                perks: ["≈ €5/mo", "30-day money-back", "All Pro features", "Encrypted sync"],
              },
              {
                key: "lifetime", label: "Lifetime", price: "€149", period: "once",
                desc: "Pay once. Own it forever.", popular: false, badge: "Best long-term",
                anchor: null,
                perks: ["No subscriptions", "All future updates", "Pays back in ~24 months"],
              },
            ].map((p, i) => (
              <Reveal key={p.key} delay={i * 80}>
                <div
                  className={cn(
                    "relative h-full p-7 md:p-8 border transition-all duration-300 group",
                    p.popular
                      ? "border-primary/50 bg-foreground/[0.03] shadow-[0_0_40px_hsl(var(--neon-toxic)/0.12)] md:scale-[1.03]"
                      : "border-foreground/10 bg-background hover:border-foreground/25",
                  )}
                >
                  {p.badge && (
                    <div className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 type-eyebrow px-3 py-1",
                      p.popular
                        ? "bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--neon-toxic)/0.4)]"
                        : "bg-foreground text-background",
                    )}>
                      {p.badge}
                    </div>
                  )}
                  <p className="type-eyebrow text-muted-foreground mb-5 mt-1">{p.label}</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={cn("type-display text-5xl md:text-6xl", p.popular && "text-primary")} style={p.popular ? { textShadow: "0 0 30px hsl(var(--neon-toxic) / 0.5)" } : undefined}>
                      {p.price}
                    </span>
                    <span className="text-muted-foreground text-sm">{p.period}</span>
                    {p.anchor && (
                      <span className="text-muted-foreground/50 text-sm line-through ml-1">
                        {p.anchor}
                      </span>
                    )}
                  </div>
                  <p className="type-body text-sm text-muted-foreground/80 mb-6">{p.desc}</p>
                  <ul className="space-y-2 mb-8 min-h-[110px]">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm text-foreground/85">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    size="lg"
                    variant={p.popular ? "default" : "outline"}
                    onClick={handleStartTrial}
                  >
                    Start 7-Day Trial
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 type-eyebrow text-muted-foreground/70">
            <span>✓ 7-day free trial</span>
            <span>✓ No credit card</span>
            <span>✓ Cancel anytime</span>
            <span>✓ Encrypted & private</span>
            <span>✓ 30-day refund</span>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-16 md:py-20 border-t border-foreground/[0.05]">
        <div className="container max-w-3xl px-6">
          <Reveal>
            <div className="text-center mb-12">
              <p className="type-eyebrow text-primary mb-5">// FAQ</p>
              <h2 className="type-display text-3xl md:text-5xl">
                Questions, answered.
              </h2>
            </div>
          </Reveal>

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
                  <div className="pb-7 type-body text-muted-foreground/85 animate-fade-in max-w-[60ch]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-20 md:py-28 border-t border-foreground/[0.05] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--neon-toxic) / 0.14), transparent 60%)",
          }}
        />
        <div className="container max-w-3xl px-6 text-center relative z-10">
          <Reveal>
            <h2 className="type-display text-4xl md:text-7xl mb-10">
              Your future self<br />
              <span className="text-primary" style={{ textShadow: "0 0 50px hsl(var(--neon-toxic) / 0.6)" }}>
                starts today.
              </span>
            </h2>
            <p className="type-body text-lg text-muted-foreground/85 mb-12 max-w-xl mx-auto">
              7 days free. No credit card. Cancel anytime.
            </p>
            <Button
              size="xl"
              onClick={handleStartTrial}
              className="gap-2 px-14"
            >
              {hero.cta}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-12 border-t border-foreground/[0.06] pb-28 md:pb-12">
        <div className="container max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <BecomeLogo size="sm" />
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

      {/* ===== STICKY MOBILE CTA ===== */}
      <div
        className={cn(
          "md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-background/90 backdrop-blur-xl border-t border-foreground/10 transition-all duration-300",
          showStickyCTA ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <Button
          size="lg"
          onClick={handleStartTrial}
          className="w-full gap-2"
        >
          {hero.cta}
          <ArrowRight className="h-5 w-5" />
        </Button>
        <p className="text-center type-eyebrow text-muted-foreground/50 mt-2">
          1-tap with Google or Apple · No card
        </p>
      </div>

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
