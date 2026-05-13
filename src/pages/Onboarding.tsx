import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n, type Locale } from "@/i18n/I18nContext";
import { writeOnboardingDraft } from "@/lib/onboardingDraft";
import { trackEvent } from "@/lib/canonicalEvents";
import { trackOnce } from "@/hooks/useAnalytics";
import { lovable } from "@/integrations/lovable/index";
import { BecomeLogo } from "@/components/Brand/BecomeLogo";

/* =============================================================
   ONBOARDING — Cinematic, emotional, app-first.

   Flow:
     welcome → auth → struggles (multi) → identity (single)
       → pull-back (single) → building → ready → /app

   Emotion first. Identity second. System third. Product fourth.
   ============================================================= */

type Step =
  | "welcome"
  | "auth"
  | "struggles"
  | "identity"
  | "pull"
  | "building"
  | "ready"
  | "language";

type Bilingual = { "pt-PT": string; "en-US": string };
const t = (b: Bilingual, locale: Locale) => b[locale] ?? b["en-US"];

/* ---------- Copy ---------- */
const COPY = {
  welcome: {
    badge: { "en-US": "Identity OS · Now in beta", "pt-PT": "Identity OS · Agora em beta" },
    titleA: { "en-US": "Stop relying on motivation.", "pt-PT": "Pára de depender da motivação." },
    titleB: { "en-US": "Become the system.", "pt-PT": "Torna-te o sistema." },
    sub: {
      "en-US": "Habits, calendar, nutrition and shopping in one place — so consistency finally compounds. Free for 7 days.",
      "pt-PT": "Hábitos, calendário, nutrição e compras num só lugar — para a consistência finalmente acumular. Grátis por 7 dias.",
    },
    bullets: {
      "en-US": [
        "Replace 6 apps with one daily system.",
        "Build streaks that compound — not anxiety.",
        "Free 7 days. No card. Cancel in one tap.",
      ],
      "pt-PT": [
        "Substitui 6 apps por um sistema diário.",
        "Cria sequências que acumulam — sem ansiedade.",
        "7 dias grátis. Sem cartão. Cancela num toque.",
      ],
    },
    cta: { "en-US": "Get started free", "pt-PT": "Começar grátis" },
    footer: { "en-US": "7 days free · No credit card", "pt-PT": "7 dias grátis · Sem cartão" },
    signin: { "en-US": "Sign in", "pt-PT": "Entrar" },
    startFree: { "en-US": "Start free", "pt-PT": "Começar grátis" },
  },
  auth: {
    chapter: { "en-US": "// Final step", "pt-PT": "// Passo final" },
    title: {
      "en-US": "Begin your\nsystem.",
      "pt-PT": "Começa o teu\nsistema.",
    },
    sub: { "en-US": "One system. Every day.", "pt-PT": "Um sistema. Todos os dias." },
    apple: { "en-US": "Continue with Apple", "pt-PT": "Continuar com Apple" },
    google: { "en-US": "Continue with Google", "pt-PT": "Continuar com Google" },
    email: { "en-US": "Continue with Email", "pt-PT": "Continuar com Email" },
    legal: {
      "en-US": "By continuing, you agree to our Terms & Privacy.",
      "pt-PT": "Ao continuar, concordas com os Termos e Privacidade.",
    },
  },
  struggles: {
    chapter: { "en-US": "// Honest check", "pt-PT": "// Momento honesto" },
    title: {
      "en-US": "What feels hardest\nright now?",
      "pt-PT": "O que sentes mais\ndifícil agora?",
    },
    hint: { "en-US": "Choose all that apply", "pt-PT": "Escolhe tudo o que se aplica" },
    cta: { "en-US": "Continue", "pt-PT": "Continuar" },
  },
  identity: {
    chapter: { "en-US": "// Direction", "pt-PT": "// Direção" },
    title: {
      "en-US": "Who do you\nwant to become?",
      "pt-PT": "Quem queres\ntornar-te?",
    },
  },
  pull: {
    chapter: { "en-US": "// Awareness", "pt-PT": "// Consciência" },
    title: {
      "en-US": "What keeps pulling\nyou backwards?",
      "pt-PT": "O que te puxa\nsempre para trás?",
    },
  },
  building: {
    chapter: { "en-US": "// Preparing", "pt-PT": "// A preparar" },
    statements: {
      "en-US": [
        "Building your routines…",
        "Creating your structure…",
        "Preparing your system…",
        "Shaping your daily flow…",
      ],
      "pt-PT": [
        "A construir as tuas rotinas…",
        "A criar a tua estrutura…",
        "A preparar o teu sistema…",
        "A moldar o teu dia…",
      ],
    },
  },
  ready: {
    title: { "en-US": "Your system is ready.", "pt-PT": "O teu sistema está pronto." },
    sub: {
      "en-US": "This is the start of something.",
      "pt-PT": "É o início de algo.",
    },
  },
};

const STRUGGLES: { id: string; label: Bilingual }[] = [
  { id: "consistency", label: { "en-US": "Staying consistent", "pt-PT": "Manter a consistência" } },
  { id: "structure", label: { "en-US": "Building routines", "pt-PT": "Construir rotinas" } },
  { id: "focus", label: { "en-US": "Staying focused", "pt-PT": "Manter o foco" } },
  { id: "restart", label: { "en-US": "Restarting every week", "pt-PT": "Recomeçar todas as semanas" } },
  { id: "motivation", label: { "en-US": "Low motivation", "pt-PT": "Pouca motivação" } },
];

const IDENTITIES: { id: string; label: Bilingual }[] = [
  { id: "disciplined", label: { "en-US": "Disciplined", "pt-PT": "Disciplinado" } },
  { id: "focused", label: { "en-US": "Focused", "pt-PT": "Focado" } },
  { id: "healthier", label: { "en-US": "Healthier", "pt-PT": "Mais saudável" } },
  { id: "consistent", label: { "en-US": "Consistent", "pt-PT": "Consistente" } },
  { id: "organized", label: { "en-US": "Organized", "pt-PT": "Organizado" } },
];

const PULLS: { id: string; label: Bilingual }[] = [
  { id: "distraction", label: { "en-US": "Distraction", "pt-PT": "Distração" } },
  { id: "fatigue", label: { "en-US": "Fatigue", "pt-PT": "Cansaço" } },
  { id: "doubt", label: { "en-US": "Self-doubt", "pt-PT": "Dúvida em mim" } },
  { id: "overwhelm", label: { "en-US": "Overwhelm", "pt-PT": "Sobrecarga" } },
  { id: "isolation", label: { "en-US": "Lack of structure", "pt-PT": "Falta de estrutura" } },
];

const IDENTITY_TO_VECTORS: Record<string, string[]> = {
  disciplined: ["Disciplined"],
  focused: ["Focused"],
  healthier: ["Healthy"],
  consistent: ["Consistent", "Calm"],
  organized: ["Wealthy"],
};

/* ---------- Cinematic background ---------- */
const Backdrop = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 80% 55% at 50% 0%, hsl(var(--neon-ultra) / 0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, hsl(var(--neon-toxic) / 0.10), transparent 60%)",
      }}
    />
    <div
      className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    />
  </div>
);

/* ---------- Screen wrapper ---------- */
const Screen = ({
  children,
  keyName,
}: {
  children: React.ReactNode;
  keyName: string;
}) => (
  <div
    key={keyName}
    className="relative z-10 flex-1 flex flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1rem)] animate-in fade-in duration-700"
  >
    <div className="max-w-md w-full mx-auto flex-1 flex flex-col">{children}</div>
  </div>
);

/* ---------- Reusable option pill ---------- */
const Option = ({
  selected,
  onClick,
  children,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  multi?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative w-full text-left px-5 py-4 border-2 transition-all duration-300 active:scale-[0.99] flex items-center justify-between gap-3",
      selected
        ? "border-primary bg-primary/[0.10] shadow-[0_0_28px_hsl(var(--neon-toxic)/0.3)]"
        : "border-foreground/10 hover:border-foreground/30 bg-foreground/[0.015]",
    )}
  >
    <span
      className={cn(
        "text-base font-semibold tracking-tight transition-colors",
        selected && "text-primary",
      )}
    >
      {children}
    </span>
    {multi && (
      <span
        className={cn(
          "h-5 w-5 border-2 flex items-center justify-center transition-all",
          selected ? "border-primary bg-primary" : "border-foreground/20",
        )}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
      </span>
    )}
  </button>
);

/* =============================================================
   COMPONENT
   ============================================================= */
const Onboarding = () => {
  const navigate = useNavigate();
  const { locale, setLocale } = useI18n();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const { completeOnboarding } = useSubscription();

  const [step, setStep] = useState<Step>("welcome");
  const [struggles, setStruggles] = useState<string[]>([]);
  const [identity, setIdentity] = useState<string[]>([]);
  const [pull, setPull] = useState<string[]>([]);
  const [authBusy, setAuthBusy] = useState<null | "google" | "apple">(null);
  const [buildIdx, setBuildIdx] = useState(0);

  // Skip onboarding entirely if already completed (unless ?restart=1)
  useEffect(() => {
    try {
      const restart = new URLSearchParams(window.location.search).get("restart") === "1";
      if (restart) {
        localStorage.removeItem("become-onboarding-complete");
        localStorage.removeItem("itero-onboarding-complete");
      } else if (localStorage.getItem("become-onboarding-complete") === "true") {
        navigate("/app", { replace: true });
        return;
      }
    } catch {
      /* ignore */
    }
    trackEvent("onboarding_started", { source: "app" });
  }, [navigate]);

  // If user authenticates while on final auth step, send them into the app
  useEffect(() => {
    if (step === "auth" && isAuthenticated) {
      navigate("/app", { replace: true });
    }
  }, [step, isAuthenticated, navigate]);

  const goToAuthOrSkip = useCallback(() => {
    setStep("struggles");
  }, []);

  // Building rotates statements then advances
  useEffect(() => {
    if (step !== "building") return;
    const statements = COPY.building.statements[locale];
    const rotate = window.setInterval(() => {
      setBuildIdx((i) => (i + 1) % statements.length);
    }, 1100);
    const finish = window.setTimeout(() => setStep("ready"), 4600);
    return () => {
      window.clearInterval(rotate);
      window.clearTimeout(finish);
    };
  }, [step, locale]);

  // Ready screen runs completion + advances
  useEffect(() => {
    if (step !== "ready") return;
    const run = async () => {
      const identityVectors = Array.from(
        new Set(identity.flatMap((id) => IDENTITY_TO_VECTORS[id] ?? [])),
      );
      const primaryIdentity = identity[0] ?? null;
      try {
        writeOnboardingDraft({
          locale,
          improvementAreas: struggles,
          identityVectors,
          selectedPresets: [],
          identityChoice: identity,
          obstacle: struggles[0] ?? null,
          tagline: "",
          habitsToCreate: [],
          trackersToCreate: [],
        } as any);
        localStorage.setItem("become-onboarding-complete", "true");
        localStorage.setItem("itero-onboarding-complete", "true");
        localStorage.setItem("become-first-session", "1");
        localStorage.setItem("become-show-first-action-hint", "true");
      } catch {
        /* ignore */
      }
      trackOnce("onboarding_completed", "onboarding_completed", {
        identity,
        struggles,
        pull,
        locale,
        source: "cinematic",
      });
      trackEvent("onboarding_completed", { identity: primaryIdentity, locale });
      completeOnboarding({
        improvementAreas: struggles,
        identityVectors,
        selectedPresets: [],
      });
    };
    run();
    const t = window.setTimeout(() => {
      if (isAuthenticated) {
        navigate("/app", { replace: true });
      } else {
        setStep("language");
      }
    }, 2400);
    return () => window.clearTimeout(t);
  }, [step, identity, struggles, pull, locale, completeOnboarding, navigate, isAuthenticated]);

  const handleGoogle = async () => {
    setAuthBusy("google");
    const { error } = await signInWithGoogle();
    if (error) setAuthBusy(null);
  };

  const handleApple = async () => {
    setAuthBusy("apple");
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: `${window.location.origin}/onboarding`,
      });
      if (result.error || result.redirected) return;
    } catch {
      /* ignore */
    }
    setAuthBusy(null);
  };

  const toggleStruggle = (id: string) =>
    setStruggles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const continueCta = useMemo(
    () =>
      locale === "pt-PT"
        ? "Continuar em Português"
        : "Continue in English",
    [locale],
  );

  return (
    <div className="with-scanlines min-h-screen bg-background text-foreground antialiased flex flex-col relative overflow-hidden">
      <Backdrop />

      {/* WELCOME */}
      {step === "welcome" && (
        <Screen keyName="welcome">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <BecomeLogo size="sm" />
            <div className="flex items-center gap-3">
              <button
                onClick={goToAuthOrSkip}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={goToAuthOrSkip}
                className="font-black italic uppercase tracking-tight text-[11px] px-3 py-1.5 bg-primary text-primary-foreground border-2 border-primary shadow-[2px_2px_0_0_hsl(var(--neon-ultra))] hover:shadow-[3px_3px_0_0_hsl(var(--neon-ultra))] hover:-translate-y-0.5 transition-all"
              >
                Start free
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {/* Beta badge */}
            <div className="flex justify-center mb-6 animate-in fade-in duration-1000">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-foreground/5 border border-foreground/10 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
                Identity OS · Now in beta
              </div>
            </div>

            {/* Headline */}
            <h1 className="type-display text-center text-[32px] sm:text-5xl md:text-6xl leading-[0.95] mb-5 animate-in fade-in slide-in-from-bottom-2 duration-1000">
              Stop relying on motivation.
              <br />
              <span
                className="text-primary"
                style={{ textShadow: "0 0 32px hsl(var(--neon-toxic) / 0.35)" }}
              >
                Become the system.
              </span>
            </h1>

            {/* Sub */}
            <p
              className="type-body text-center text-sm sm:text-base text-muted-foreground/85 mb-7 max-w-md mx-auto animate-in fade-in duration-1000"
              style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
            >
              Habits, calendar, nutrition and shopping in one place — so consistency finally compounds. Free for 7 days.
            </p>

            {/* Bullets */}
            <ul
              className="space-y-3 mb-2 max-w-md mx-auto w-full animate-in fade-in duration-1000"
              style={{ animationDelay: "500ms", animationFillMode: "backwards" }}
            >
              {[
                "Replace 6 apps with one daily system.",
                "Build streaks that compound — not anxiety.",
                "Free 7 days. No card. Cancel in one tap.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/60 text-primary shrink-0">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="type-body text-sm sm:text-base text-foreground/90">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={goToAuthOrSkip}
              className="w-full h-14 bg-primary text-primary-foreground font-black italic uppercase tracking-tight text-sm border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))] hover:shadow-[5px_5px_0_0_hsl(var(--neon-ultra))] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_hsl(var(--neon-ultra))] transition-all inline-flex items-center justify-center gap-2"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
              7 days free · No credit card
            </p>
          </div>
        </Screen>
      )}

      {/* LANGUAGE — choose locale before final step */}
      {step === "language" && (
        <Screen keyName="language">
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4 text-center">
              // Language
            </p>
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-3 text-center">
              {locale === "pt-PT" ? "Escolhe o teu\nidioma." : "Choose your\nlanguage."}
            </h1>
            <p className="text-sm text-muted-foreground/70 text-center mb-10">
              {locale === "pt-PT"
                ? "Podes mudar mais tarde nas definições."
                : "You can change this later in settings."}
            </p>

            <div className="flex flex-col gap-2">
              <Option
                selected={locale === "en-US"}
                onClick={() => setLocale("en-US")}
                multi
              >
                English
              </Option>
              <Option
                selected={locale === "pt-PT"}
                onClick={() => setLocale("pt-PT")}
                multi
              >
                Português
              </Option>
            </div>
          </div>
          <button
            onClick={() => setStep("auth")}
            className="w-full h-14 mt-6 bg-primary text-primary-foreground font-black italic uppercase tracking-tight text-sm border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))] hover:shadow-[5px_5px_0_0_hsl(var(--neon-ultra))] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_hsl(var(--neon-ultra))] transition-all inline-flex items-center justify-center gap-2"
          >
            {locale === "pt-PT" ? "Continuar" : "Continue"} <ArrowRight className="h-4 w-4" />
          </button>
        </Screen>
      )}

      {/* AUTH */}
      {step === "auth" && (

        <Screen keyName="auth">
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4 text-center">
              {t(COPY.auth.chapter, locale)}
            </p>
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-3 text-center whitespace-pre-line">
              {t(COPY.auth.title, locale)}
            </h1>
            <p className="text-sm text-muted-foreground/70 text-center mb-10">
              {t(COPY.auth.sub, locale)}
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleApple}
                disabled={!!authBusy}
                className="w-full h-12 bg-foreground text-background font-semibold text-sm active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {authBusy === "apple" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <AppleIcon /> {t(COPY.auth.apple, locale)}
                  </>
                )}
              </button>
              <button
                onClick={handleGoogle}
                disabled={!!authBusy}
                className="w-full h-12 bg-foreground/[0.04] border-2 border-foreground/10 text-foreground font-semibold text-sm active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {authBusy === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon /> {t(COPY.auth.google, locale)}
                  </>
                )}
              </button>
              <button
                onClick={() => navigate("/auth?next=onboarding&mode=signup")}
                className="w-full h-12 bg-transparent border border-foreground/10 text-muted-foreground font-medium text-sm active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" /> {t(COPY.auth.email, locale)}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground/50 text-center mt-8 leading-relaxed">
              {t(COPY.auth.legal, locale)}
            </p>
          </div>
        </Screen>
      )}

      {/* STRUGGLES — multi-select */}
      {step === "struggles" && (
        <Screen keyName="struggles">
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4">
              {t(COPY.struggles.chapter, locale)}
            </p>
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-2 whitespace-pre-line">
              {t(COPY.struggles.title, locale)}
            </h1>
            <p className="text-xs text-muted-foreground/60 mb-10 font-mono uppercase tracking-wider">
              {t(COPY.struggles.hint, locale)}
            </p>
            <div className="flex flex-col gap-2">
              {STRUGGLES.map((opt) => (
                <Option
                  key={opt.id}
                  selected={struggles.includes(opt.id)}
                  onClick={() => toggleStruggle(opt.id)}
                  multi
                >
                  {t(opt.label, locale)}
                </Option>
              ))}
            </div>
          </div>
          <button
            onClick={() => setStep("identity")}
            disabled={struggles.length === 0}
            className="w-full h-14 mt-6 bg-primary text-primary-foreground font-black italic uppercase tracking-tight text-sm border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))] hover:shadow-[5px_5px_0_0_hsl(var(--neon-ultra))] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_hsl(var(--neon-ultra))] transition-all inline-flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            {t(COPY.struggles.cta, locale)} <ArrowRight className="h-4 w-4" />
          </button>
        </Screen>
      )}

      {/* IDENTITY — multi */}
      {step === "identity" && (
        <Screen keyName="identity">
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4">
              {t(COPY.identity.chapter, locale)}
            </p>
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-2 whitespace-pre-line">
              {t(COPY.identity.title, locale)}
            </h1>
            <p className="text-xs text-muted-foreground/60 mb-10 font-mono uppercase tracking-wider">
              {t(COPY.struggles.hint, locale)}
            </p>
            <div className="flex flex-col gap-2">
              {IDENTITIES.map((opt) => (
                <Option
                  key={opt.id}
                  selected={identity.includes(opt.id)}
                  onClick={() =>
                    setIdentity((prev) =>
                      prev.includes(opt.id)
                        ? prev.filter((x) => x !== opt.id)
                        : [...prev, opt.id],
                    )
                  }
                  multi
                >
                  {t(opt.label, locale)}
                </Option>
              ))}
            </div>
          </div>
          <button
            onClick={() => setStep("pull")}
            disabled={identity.length === 0}
            className="w-full h-14 mt-6 bg-primary text-primary-foreground font-black italic uppercase tracking-tight text-sm border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))] hover:shadow-[5px_5px_0_0_hsl(var(--neon-ultra))] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_hsl(var(--neon-ultra))] transition-all inline-flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            {t(COPY.struggles.cta, locale)} <ArrowRight className="h-4 w-4" />
          </button>
        </Screen>
      )}

      {/* PULL — multi */}
      {step === "pull" && (
        <Screen keyName="pull">
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4">
              {t(COPY.pull.chapter, locale)}
            </p>
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-2 whitespace-pre-line">
              {t(COPY.pull.title, locale)}
            </h1>
            <p className="text-xs text-muted-foreground/60 mb-10 font-mono uppercase tracking-wider">
              {t(COPY.struggles.hint, locale)}
            </p>
            <div className="flex flex-col gap-2">
              {PULLS.map((opt) => (
                <Option
                  key={opt.id}
                  selected={pull.includes(opt.id)}
                  onClick={() =>
                    setPull((prev) =>
                      prev.includes(opt.id)
                        ? prev.filter((x) => x !== opt.id)
                        : [...prev, opt.id],
                    )
                  }
                  multi
                >
                  {t(opt.label, locale)}
                </Option>
              ))}
            </div>
          </div>
          <button
            onClick={() => setStep("building")}
            disabled={pull.length === 0}
            className="w-full h-14 mt-6 bg-primary text-primary-foreground font-black italic uppercase tracking-tight text-sm border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))] hover:shadow-[5px_5px_0_0_hsl(var(--neon-ultra))] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_hsl(var(--neon-ultra))] transition-all inline-flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            {t(COPY.struggles.cta, locale)} <ArrowRight className="h-4 w-4" />
          </button>
        </Screen>
      )}

      {/* BUILDING — rotating statements */}
      {step === "building" && (
        <Screen keyName="building">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative mb-12">
              <div className="h-20 w-20 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 h-20 w-20 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div
                className="absolute inset-0 h-20 w-20 rounded-full"
                style={{ boxShadow: "0 0 60px hsl(var(--neon-toxic) / 0.5)" }}
              />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-5">
              {t(COPY.building.chapter, locale)}
            </p>
            <div className="h-12 flex items-center justify-center">
              <p
                key={buildIdx}
                className="type-display text-2xl sm:text-3xl leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-1 duration-700"
              >
                {COPY.building.statements[locale][buildIdx]}
              </p>
            </div>
          </div>
        </Screen>
      )}

      {/* READY */}
      {step === "ready" && (
        <Screen keyName="ready">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div
              className="h-12 w-12 rounded-full border-2 border-primary mb-8 flex items-center justify-center animate-in zoom-in-50 duration-700"
              style={{ boxShadow: "0 0 40px hsl(var(--neon-toxic) / 0.6)" }}
            >
              <Check className="h-6 w-6 text-primary" strokeWidth={3} />
            </div>
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-4 animate-in fade-in slide-in-from-bottom-2 duration-1000">
              {t(COPY.ready.title, locale)}
            </h1>
            <p
              className="text-base text-muted-foreground/80 animate-in fade-in duration-1000"
              style={{ animationDelay: "400ms", animationFillMode: "backwards" }}
            >
              {t(COPY.ready.sub, locale)}
            </p>
          </div>
        </Screen>
      )}
    </div>
  );
};

/* ---------- Inline brand glyphs ---------- */
const AppleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16.365 1.43c0 1.14-.43 2.22-1.16 3.04-.79.91-2.07 1.62-3.32 1.52-.15-1.16.42-2.36 1.13-3.13.8-.86 2.16-1.5 3.35-1.43zM20.5 17.16c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.13 3.52-1.55.02-1.95-1.01-4.05-1-2.1.01-2.54 1.02-4.09 1-1.74-.02-3.06-1.78-4.05-3.34C-.02 16.74-.31 11.69 1.84 9.04 3.36 7.16 5.76 6.07 8.02 6.07c2.3 0 3.75 1.26 5.65 1.26 1.84 0 2.96-1.27 5.62-1.27 2.01 0 4.13 1.1 5.66 3-4.97 2.72-4.16 9.83-4.45 8.1z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#EA4335"
      d="M12 11v3.27h6.6c-.27 1.4-1.79 4.1-6.6 4.1-3.97 0-7.21-3.29-7.21-7.37s3.24-7.37 7.21-7.37c2.26 0 3.78.96 4.65 1.79l3.17-3.06C17.84 1.62 15.18.5 12 .5 5.92.5 1 5.42 1 11.5S5.92 22.5 12 22.5c6.93 0 11.5-4.86 11.5-11.7 0-.79-.09-1.39-.2-1.99H12z"
    />
  </svg>
);

export default Onboarding;
