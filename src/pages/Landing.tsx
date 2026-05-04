import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Calendar as CalendarIcon,
  Activity,
  ShieldCheck,
  PlayCircle,
  ListChecks,
  Check,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { BecomeLogo } from "@/components/Brand/BecomeLogo";
import { DayViewPreview } from "@/components/Landing/DayViewPreview";

/**
 * Landing — Final conversion pass.
 *
 * Story arc (one idea per viewport, generous breathing room):
 *   Hero (almost empty) → Problem (linear) → Belief break →
 *   Solution turning point → Product (hero moment) → Loop visual →
 *   Outcomes → Differentiation → Pricing → FAQ → Final CTA
 *
 * Rules: one focal element per section, no horizontal competition,
 * pure typography in narrative sections, English only.
 */

/* ---------- Scroll reveal ---------- */
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
        "w-full transition-all duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      )}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const { upgradeToPro } = useSubscription();

  const handleStartTrial = () => {
    try {
      (window as unknown as { plausible?: (e: string, o?: unknown) => void })
        .plausible?.("landing_cta_click");
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

  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const outcomes = [
    { icon: CheckCircle2, title: "Build consistency", desc: "Daily systems that compound — not streak anxiety." },
    { icon: CalendarIcon, title: "Stay on track", desc: "One screen. Every priority. Zero context-switching." },
    { icon: Activity, title: "Know your progress", desc: "Habits, metrics, momentum — without the noise." },
    { icon: ShieldCheck, title: "Keep control", desc: "Encrypted, private, exportable. Yours forever." },
  ];

  const faqs = [
    {
      q: "Is Become just another habit tracker?",
      a: "No. Habit trackers count check-marks. Become is a daily system — habits, planning, metrics and momentum, in one place.",
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

  /* Section spacing — generous, unified vertical rhythm */
  const SECTION = "py-32 md:py-44";
  const SECTION_TIGHT = "py-24 md:py-32";

  return (
    <div className="with-scanlines min-h-screen max-w-full overflow-x-clip bg-background text-foreground antialiased animate-page-enter">
      {/* ===== NAV ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-2xl bg-background/70 border-b border-foreground/[0.05]">
        <div className="container max-w-6xl flex items-center justify-between h-16">
          <BecomeLogo />
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <button onClick={() => scrollTo("product")} className="hover:text-foreground transition-colors">Product</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-foreground transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" onClick={handleStartTrial}>
              Download the app
            </Button>
          </div>
        </div>
      </nav>

      {/* ===== 1. HERO — mobile app download page ===== */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-28 md:pt-24 pb-16 md:pb-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none opacity-30"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--neon-ultra) / 0.14), transparent 70%)",
          }}
        />
        <div className="container max-w-7xl relative z-10 px-5 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 md:gap-10 items-center">
            {/* Text block */}
            <div className="text-center md:text-left animate-fade-in order-1">
              <h1 className="type-display text-[40px] sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] mb-6 md:mb-8">
                You don't need motivation.
                <br />
                <span
                  className="text-primary"
                  style={{ textShadow: "0 0 32px hsl(var(--neon-toxic) / 0.35)" }}
                >
                  You need a system.
                </span>
              </h1>

              <p className="type-body text-base sm:text-lg md:text-xl text-muted-foreground/85 mb-8 md:mb-10 max-w-[44ch] mx-auto md:mx-0">
                Plan. Execute. Repeat.
              </p>

              <div className="flex flex-col items-center md:items-start gap-5">
                <Button
                  size="xl"
                  onClick={handleStartTrial}
                  className="gap-2 px-10 w-full sm:w-auto shadow-[0_0_28px_hsl(var(--neon-toxic)/0.35)]"
                >
                  Download the app
                  <ArrowRight className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleStartTrial}
                    aria-label="Download on the App Store"
                    className="h-12 px-4 flex items-center gap-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M16.365 1.43c0 1.14-.42 2.23-1.13 3.05-.78.92-2.05 1.63-3.06 1.55-.13-1.11.4-2.27 1.1-3.05.79-.88 2.13-1.55 3.09-1.55zM20.5 17.55c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.13 3.51-1.54.02-1.94-1-4.04-.99-2.1.01-2.54 1.01-4.08.99-1.74-.02-3.06-1.77-4.05-3.33C.01 16.43-.27 11.06 1.4 8.21c1.18-2.02 3.04-3.21 4.79-3.21 1.78 0 2.9 1 4.37 1 1.43 0 2.3-1 4.36-1 1.56 0 3.21.85 4.39 2.31-3.86 2.12-3.23 7.63 1.19 10.24z" />
                    </svg>
                    <div className="text-left leading-tight">
                      <div className="text-[9px] uppercase tracking-wider opacity-80">Download on the</div>
                      <div className="text-sm font-semibold">App Store</div>
                    </div>
                  </button>
                  <button
                    onClick={handleStartTrial}
                    aria-label="Get it on Google Play"
                    className="h-12 px-4 flex items-center gap-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                      <path fill="#34A853" d="M3.6 2.3C3.2 2.7 3 3.3 3 4.1v15.8c0 .8.2 1.4.6 1.8l.1.1L12.6 13v-.2L3.7 2.2l-.1.1z"/>
                      <path fill="#FBBC04" d="M15.6 16.1L12.6 13v-.2l3-3 .1.1 3.6 2c1 .6 1 1.5 0 2.1l-3.7 2.1z"/>
                      <path fill="#EA4335" d="M15.7 16l-3.1-3.1L3.6 21.7c.4.4 1 .4 1.7.1L15.7 16"/>
                      <path fill="#4285F4" d="M15.7 6L5.3 2.2c-.7-.4-1.3-.3-1.7.1l9 9 3.1-3.1z"/>
                    </svg>
                    <div className="text-left leading-tight">
                      <div className="text-[9px] uppercase tracking-wider opacity-80">Get it on</div>
                      <div className="text-sm font-semibold">Google Play</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Phone mockups (~15% larger, side phones slightly blurred) */}
            <div className="relative order-2 mx-auto w-full max-w-[600px] h-[600px] sm:h-[690px] md:h-[740px]">
              <div
                className="absolute inset-0 -z-10 pointer-events-none opacity-70 blur-3xl"
                style={{
                  background:
                    "radial-gradient(closest-side, hsl(var(--neon-toxic) / 0.22), transparent 70%)",
                }}
              />

              {/* Left phone — Habits list */}
              <div className="absolute top-14 left-0 sm:left-1 w-[44%] aspect-[9/19] rounded-[28px] border border-foreground/15 bg-card p-1.5 shadow-[0_30px_80px_-20px_hsl(var(--neon-ultra)/0.45)] -rotate-[10deg] origin-bottom-right opacity-80 blur-[1.5px]">
                <div className="rounded-[22px] overflow-hidden bg-background border border-foreground/10 h-full p-3 flex flex-col gap-2.5">
                  <div className="font-mono text-[8px] uppercase tracking-widest text-primary">Habits · Today</div>
                  {[
                    { name: "Meditate", time: "06:45", done: true, color: "hsl(265 70% 60%)" },
                    { name: "Workout", time: "07:30", done: true, color: "hsl(var(--primary))" },
                    { name: "Read", time: "08:15", done: false, color: "hsl(195 80% 55%)" },
                    { name: "Journal", time: "22:00", done: false, color: "hsl(340 75% 60%)" },
                  ].map((h) => (
                    <div key={h.name} className="flex items-center gap-2 border border-foreground/10 bg-card/60 p-1.5">
                      <div
                        className="h-6 w-[2px]"
                        style={{ backgroundColor: h.color, opacity: h.done ? 1 : 0.5 }}
                      />
                      <div
                        className={cn(
                          "h-4 w-4 border flex items-center justify-center",
                          h.done ? "bg-primary border-primary" : "border-foreground/30",
                        )}
                      >
                        {h.done && <Check className="h-2.5 w-2.5 stroke-[3] text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-[9px] font-bold uppercase tracking-tight", h.done ? "text-primary" : "text-foreground")}>
                          {h.name}
                        </div>
                      </div>
                      <div className="font-mono text-[7px] text-muted-foreground/70">{h.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right phone — Progress / overview */}
              <div className="absolute top-14 right-0 sm:right-1 w-[44%] aspect-[9/19] rounded-[28px] border border-foreground/15 bg-card p-1.5 shadow-[0_30px_80px_-20px_hsl(var(--neon-ultra)/0.45)] rotate-[10deg] origin-bottom-left opacity-80 blur-[1.5px]">
                <div className="rounded-[22px] overflow-hidden bg-background border border-foreground/10 h-full p-3 flex flex-col gap-2">
                  <div className="font-mono text-[8px] uppercase tracking-widest text-primary">Progress</div>
                  <div className="mt-1">
                    <div className="font-black italic tracking-tighter text-2xl text-primary tabular-nums" style={{ textShadow: "0 0 10px hsl(var(--neon-toxic) / 0.4)" }}>
                      87<span className="text-[10px] text-muted-foreground/60 ml-0.5 not-italic">%</span>
                    </div>
                    <div className="font-mono text-[7px] uppercase tracking-wider text-muted-foreground/60">This week</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mt-2">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "aspect-square rounded-[1px]",
                          i % 7 === 6 ? "bg-foreground/10" : i % 4 === 0 ? "bg-primary/40" : "bg-primary/85",
                        )}
                      />
                    ))}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {[
                      { label: "Meditate", w: 92 },
                      { label: "Workout", w: 78 },
                      { label: "Read", w: 64 },
                    ].map((m) => (
                      <div key={m.label} className="space-y-0.5">
                        <div className="flex justify-between font-mono text-[7px] uppercase tracking-wider text-muted-foreground/70">
                          <span>{m.label}</span>
                          <span className="text-primary">{m.w}%</span>
                        </div>
                        <div className="h-1 bg-foreground/10 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${m.w}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto font-mono text-[7px] uppercase tracking-wider text-primary">Streak · 47d</div>
                </div>
              </div>

              {/* Center phone — Day View (real screen) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[62%] aspect-[9/19] rounded-[36px] border border-foreground/15 bg-card p-2 shadow-[0_50px_120px_-20px_hsl(var(--neon-ultra)/0.55)] z-10">
                <div className="rounded-[28px] overflow-hidden bg-background border border-foreground/10 h-full px-3 py-4">
                  <div className="origin-top scale-[0.62] sm:scale-[0.68] -mb-[40%]">
                    <DayViewPreview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. PROBLEM (linear, full width, centered) ===== */}
      <section className={cn(SECTION, "border-t border-foreground/[0.05]")}>
        <div className="container max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="type-display text-3xl sm:text-5xl md:text-6xl leading-[1.1]">
              You start when you feel good.
            </h2>
          </Reveal>
        </div>
      </section>

      <section className={SECTION}>
        <div className="container max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="type-display text-3xl sm:text-5xl md:text-6xl leading-[1.1] text-muted-foreground/70">
              You stop when you don't.
            </h2>
          </Reveal>
        </div>
      </section>

      <section className={SECTION}>
        <div className="container max-w-3xl px-6 text-center">
          <Reveal>
            <h2
              className="type-display text-4xl sm:text-6xl md:text-7xl leading-[1.05] text-primary"
              style={{ textShadow: "0 0 28px hsl(var(--neon-toxic) / 0.35)" }}
            >
              That's the cycle.
            </h2>
          </Reveal>
        </div>
      </section>

      {/* ===== 3. BELIEF BREAK ===== */}
      <section className={cn(SECTION, "border-t border-foreground/[0.05]")}>
        <div className="container max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="type-display text-4xl sm:text-6xl md:text-7xl leading-[1.05]">
              It's <span className="text-primary" style={{ textShadow: "0 0 28px hsl(var(--neon-toxic) / 0.35)" }}>not</span> your fault.
            </h2>
          </Reveal>
        </div>
      </section>

      <section className={SECTION}>
        <div className="container max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="type-display text-3xl sm:text-5xl md:text-6xl leading-[1.1]">
              Motivation fades.
              <br />
              <span className="text-muted-foreground/70">That's why nothing sticks.</span>
            </h2>
          </Reveal>
        </div>
      </section>

      {/* ===== 4. TURNING POINT ===== */}
      <section className={cn(SECTION, "border-t border-foreground/[0.05] relative overflow-hidden")}>
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, hsl(var(--neon-toxic) / 0.1), transparent 60%)",
          }}
        />
        <div className="container max-w-3xl px-6 text-center relative z-10">
          <Reveal>
            <h2 className="type-display text-3xl sm:text-5xl md:text-6xl leading-[1.05]">
              You don't need more motivation.
              <br />
              <span className="text-primary" style={{ textShadow: "0 0 32px hsl(var(--neon-toxic) / 0.4)" }}>
                You need a system.
              </span>
            </h2>
          </Reveal>
        </div>
      </section>

      {/* ===== 5. PRODUCT — hero moment ===== */}
      <section id="product" className={cn(SECTION, "border-t border-foreground/[0.05]")}>
        <div className="container max-w-6xl px-6">
          <Reveal>
            <div className="text-center mb-16 md:mb-20">
              <h2 className="type-display text-3xl sm:text-5xl md:text-6xl leading-[1.05]">
                One place. Every day.
              </h2>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="relative mx-auto w-full max-w-[560px]">
              <div
                className="absolute -inset-10 -z-10 pointer-events-none opacity-70 blur-3xl"
                style={{
                  background:
                    "radial-gradient(closest-side, hsl(var(--neon-toxic) / 0.22), transparent 70%)",
                }}
              />
              <div className="relative rounded-[44px] border border-foreground/15 bg-card p-3 shadow-[0_40px_120px_-20px_hsl(var(--neon-ultra)/0.5)]">
                <div className="rounded-[36px] overflow-hidden bg-background border border-foreground/10 px-5 py-7">
                  <DayViewPreview />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== 6. LOOP VISUAL ===== */}
      <section className={SECTION_TIGHT}>
        <div className="container max-w-4xl px-6">
          <Reveal>
            <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4 sm:gap-x-6 text-center">
              {[
                { icon: PlayCircle, label: "Open" },
                { icon: ListChecks, label: "Follow" },
                { icon: Check, label: "Complete" },
                { icon: RotateCw, label: "Repeat" },
              ].map((step, i, arr) => (
                <li key={step.label} className="flex items-center gap-3 sm:gap-6">
                  <div className="flex items-center gap-2.5">
                    <step.icon className="h-5 w-5 text-primary" />
                    <span className="font-bold uppercase italic tracking-tight text-base sm:text-xl text-foreground">
                      {step.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ===== 7. OUTCOMES ===== */}
      <section className={cn(SECTION_TIGHT, "border-t border-foreground/[0.05]")}>
        <div className="container max-w-5xl px-6">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="type-display text-3xl md:text-5xl">
                A system that runs your day.
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-px bg-foreground/[0.05] border border-foreground/[0.05] sm:grid-cols-2 lg:grid-cols-4">
            {outcomes.map((o, i) => (
              <Reveal key={o.title} delay={i * 60} className="h-full">
                <div className="bg-background p-7 group hover:bg-foreground/[0.025] transition-colors duration-300 h-full w-full min-h-[220px] flex flex-col">
                  <div className="h-11 w-11 mb-7 flex items-center justify-center border border-foreground/10 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-300">
                    <o.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2.5 tracking-tight">{o.title}</h3>
                  <p className="type-body text-sm text-muted-foreground/80">{o.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 8. DIFFERENTIATION ===== */}
      <section className={cn(SECTION, "border-t border-foreground/[0.05]")}>
        <div className="container max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="type-display text-4xl sm:text-6xl md:text-7xl leading-[1.05]">
              Most apps track.
              <br />
              <span className="text-primary" style={{ textShadow: "0 0 28px hsl(var(--neon-toxic) / 0.35)" }}>
                This one drives.
              </span>
            </h2>
          </Reveal>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className={cn(SECTION_TIGHT, "border-t border-foreground/[0.05] relative overflow-hidden")}>
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, hsl(var(--neon-ultra) / 0.06), transparent 70%)",
          }}
        />
        <div className="container max-w-5xl px-6 relative z-10">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="type-display text-3xl md:text-5xl mb-4">
                Start free. Commit when ready.
              </h2>
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
                      ? "border-primary/50 bg-foreground/[0.03] shadow-[0_0_24px_hsl(var(--neon-toxic)/0.08)] md:scale-[1.03]"
                      : "border-foreground/10 bg-background hover:border-foreground/25",
                  )}
                >
                  {p.badge && (
                    <div className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 type-eyebrow px-3 py-1",
                      p.popular
                        ? "bg-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--neon-toxic)/0.22)]"
                        : "bg-foreground text-background",
                    )}>
                      {p.badge}
                    </div>
                  )}
                  <p className="type-eyebrow text-muted-foreground mb-5 mt-1">{p.label}</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={cn("type-display text-5xl md:text-6xl", p.popular && "text-primary")} style={p.popular ? { textShadow: "0 0 18px hsl(var(--neon-toxic) / 0.3)" } : undefined}>
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
      <section id="faq" className={cn(SECTION_TIGHT, "border-t border-foreground/[0.05]")}>
        <div className="container max-w-3xl px-6">
          <Reveal>
            <div className="text-center mb-12">
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

      {/* ===== 9. FINAL CTA — inevitable ===== */}
      <section className={cn(SECTION, "border-t border-foreground/[0.05] relative overflow-hidden")}>
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--neon-toxic) / 0.1), transparent 65%)",
          }}
        />
        <div className="container max-w-3xl px-6 text-center relative z-10">
          <Reveal>
            <h2 className="type-display text-4xl sm:text-6xl md:text-7xl mb-12 leading-[1.05]">
              Stop restarting.
            </h2>
            <Button
              size="xl"
              onClick={handleStartTrial}
              className="gap-2 px-14 shadow-[0_0_32px_hsl(var(--neon-toxic)/0.4)]"
            >
              Start your system
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
          className="w-full gap-2 shadow-[0_0_24px_hsl(var(--neon-toxic)/0.35)]"
        >
          Start your system
          <ArrowRight className="h-5 w-5" />
        </Button>
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
