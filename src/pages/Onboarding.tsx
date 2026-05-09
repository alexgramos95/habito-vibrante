import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n, type Locale } from "@/i18n/I18nContext";
import { writeOnboardingDraft } from "@/lib/onboardingDraft";
import { trackEvent } from "@/lib/canonicalEvents";
import { trackOnce } from "@/hooks/useAnalytics";
import { lovable } from "@/integrations/lovable/index";

/* =============================================================
   ONBOARDING — Cinematic, emotional, app-first.

   Flow:
     welcome → auth → obstacle → identity → philosophy → building → /app

   Emotion first. System second. Product third.
   ============================================================= */

type Step = "welcome" | "auth" | "obstacle" | "identity" | "philosophy" | "building";

type Bilingual = { "pt-PT": string; "en-US": string };
const pick = (b: Bilingual, locale: Locale) => b[locale] ?? b["en-US"];

const OBSTACLE_OPTIONS: { id: string; label: Bilingual }[] = [
  { id: "consistency", label: { "en-US": "Staying consistent", "pt-PT": "Manter consistência" } },
  { id: "structure", label: { "en-US": "Building routines", "pt-PT": "Construir rotinas" } },
  { id: "focus", label: { "en-US": "Staying focused", "pt-PT": "Manter o foco" } },
  { id: "restart", label: { "en-US": "Restarting every week", "pt-PT": "Recomeçar todas as semanas" } },
  { id: "motivation", label: { "en-US": "Low motivation", "pt-PT": "Pouca motivação" } },
];

const IDENTITY_OPTIONS: { id: string; label: Bilingual }[] = [
  { id: "disciplined", label: { "en-US": "Disciplined", "pt-PT": "Disciplinado" } },
  { id: "focused", label: { "en-US": "Focused", "pt-PT": "Focado" } },
  { id: "healthier", label: { "en-US": "Healthier", "pt-PT": "Mais saudável" } },
  { id: "consistent", label: { "en-US": "Consistent", "pt-PT": "Consistente" } },
  { id: "organized", label: { "en-US": "Organized", "pt-PT": "Organizado" } },
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

/* ---------- Screen wrapper (fullscreen, fade transitions) ---------- */
const Screen = ({ children, keyName }: { children: React.ReactNode; keyName: string }) => (
  <div
    key={keyName}
    className="relative z-10 flex-1 flex flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1rem)] animate-in fade-in duration-700"
  >
    <div className="max-w-md w-full mx-auto flex-1 flex flex-col">{children}</div>
  </div>
);

/* =============================================================
   COMPONENT
   ============================================================= */
const Onboarding = () => {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const { completeOnboarding } = useSubscription();

  const [step, setStep] = useState<Step>("welcome");
  const [obstacle, setObstacle] = useState<string | null>(null);
  const [identity, setIdentity] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState<null | "google" | "apple">(null);

  // Skip onboarding entirely if already completed
  useEffect(() => {
    try {
      if (localStorage.getItem("become-onboarding-complete") === "true") {
        navigate("/app", { replace: true });
      }
    } catch { /* ignore */ }
    trackEvent("onboarding_started", { source: "app" });
  }, [navigate]);

  const goToAuthOrSkip = useCallback(() => {
    setStep(isAuthenticated ? "obstacle" : "auth");
  }, [isAuthenticated]);

  // Philosophy auto-advance
  useEffect(() => {
    if (step !== "philosophy") return;
    const t = window.setTimeout(() => setStep("building"), 4200);
    return () => window.clearTimeout(t);
  }, [step]);

  // Building screen runs completion + advances
  useEffect(() => {
    if (step !== "building") return;
    const finish = async () => {
      const identityVectors = identity ? IDENTITY_TO_VECTORS[identity] ?? [] : [];
      const payload = {
        locale,
        improvementAreas: [],
        identityVectors,
        selectedPresets: [],
        identityChoice: identity,
        obstacle,
        tagline: "",
        habitsToCreate: [],
        trackersToCreate: [],
      };
      try {
        writeOnboardingDraft(payload);
        localStorage.setItem("become-onboarding-complete", "true");
        localStorage.setItem("itero-onboarding-complete", "true");
        localStorage.setItem("become-first-session", "1");
        // Hint for Day View to show first-time overlay
        localStorage.setItem("become-show-first-action-hint", "true");
      } catch { /* ignore */ }

      trackOnce("onboarding_completed", "onboarding_completed", {
        identity, obstacle, locale, source: "cinematic",
      });
      trackEvent("onboarding_completed", { identity, obstacle, locale });

      completeOnboarding({
        improvementAreas: [],
        identityVectors,
        selectedPresets: [],
      });
    };
    finish();
    const t = window.setTimeout(() => navigate("/app", { replace: true }), 3200);
    return () => window.clearTimeout(t);
  }, [step, identity, obstacle, locale, completeOnboarding, navigate]);

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
    } catch { /* ignore */ }
    setAuthBusy(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col relative overflow-hidden">
      <Backdrop />

      {step === "welcome" && (
        <Screen keyName="welcome">
          <div className="flex-1 flex flex-col justify-center text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-6">
              // Become
            </p>
            <h1 className="type-display text-5xl sm:text-6xl leading-[1.05] tracking-tight mb-6">
              Welcome to<br />Become.
            </h1>
            <p className="text-lg text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">
              This is where you stop restarting.
            </p>
          </div>
          <button
            onClick={goToAuthOrSkip}
            className="w-full h-14 bg-primary text-primary-foreground font-bold tracking-tight uppercase text-sm shadow-[0_0_40px_hsl(var(--neon-toxic)/0.35)] active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </Screen>
      )}

      {step === "auth" && (
        <Screen keyName="auth">
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4 text-center">
              // Step 1
            </p>
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-3 text-center">
              Create your<br />account
            </h1>
            <p className="text-sm text-muted-foreground/70 text-center mb-10">
              One system. Every day.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleApple}
                disabled={!!authBusy}
                className="w-full h-12 bg-foreground text-background font-semibold text-sm active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {authBusy === "apple"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><AppleIcon /> Continue with Apple</>}
              </button>
              <button
                onClick={handleGoogle}
                disabled={!!authBusy}
                className="w-full h-12 bg-foreground/[0.04] border-2 border-foreground/10 text-foreground font-semibold text-sm active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {authBusy === "google"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><GoogleIcon /> Continue with Google</>}
              </button>
              <button
                onClick={() => navigate("/auth?next=onboarding&mode=signup")}
                className="w-full h-12 bg-transparent border border-foreground/10 text-muted-foreground font-medium text-sm active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" /> Continue with Email
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground/50 text-center mt-8 leading-relaxed">
              By continuing, you agree to our Terms & Privacy.
            </p>
          </div>
        </Screen>
      )}

      {step === "obstacle" && (
        <Screen keyName="obstacle">
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4">
              // Honest check
            </p>
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-12">
              What feels hardest right now?
            </h1>
            <div className="flex flex-col gap-2">
              {OBSTACLE_OPTIONS.map((opt) => {
                const selected = obstacle === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setObstacle(opt.id);
                      window.setTimeout(() => setStep("identity"), 240);
                    }}
                    className={cn(
                      "w-full text-left px-5 py-4 border-2 transition-all duration-150 active:scale-[0.99]",
                      selected
                        ? "border-primary bg-primary/[0.10] shadow-[0_0_28px_hsl(var(--neon-toxic)/0.3)]"
                        : "border-foreground/10 hover:border-foreground/30 bg-foreground/[0.015]",
                    )}
                  >
                    <span className={cn("text-base font-semibold tracking-tight", selected && "text-primary")}>
                      {opt.label["en-US"]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Screen>
      )}

      {step === "identity" && (
        <Screen keyName="identity">
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4">
              // Direction
            </p>
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-12">
              Who do you want to become?
            </h1>
            <div className="flex flex-col gap-2">
              {IDENTITY_OPTIONS.map((opt) => {
                const selected = identity === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setIdentity(opt.id);
                      window.setTimeout(() => setStep("philosophy"), 240);
                    }}
                    className={cn(
                      "w-full text-left px-5 py-4 border-2 transition-all duration-150 active:scale-[0.99]",
                      selected
                        ? "border-primary bg-primary/[0.10] shadow-[0_0_28px_hsl(var(--neon-toxic)/0.3)]"
                        : "border-foreground/10 hover:border-foreground/30 bg-foreground/[0.015]",
                    )}
                  >
                    <span className={cn("text-base font-semibold tracking-tight", selected && "text-primary")}>
                      {pick(opt.label, locale)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Screen>
      )}

      {step === "philosophy" && (
        <Screen keyName="philosophy">
          <div className="flex-1 flex flex-col justify-center text-center">
            <h1 className="type-display text-4xl sm:text-5xl leading-[1.15] tracking-tight space-y-6">
              <span className="block animate-in fade-in slide-in-from-bottom-2 duration-700">
                Small actions.
              </span>
              <span
                className="block animate-in fade-in slide-in-from-bottom-2 duration-700"
                style={{ animationDelay: "900ms", animationFillMode: "backwards" }}
              >
                Repeated daily.
              </span>
              <span
                className="block text-primary animate-in fade-in slide-in-from-bottom-2 duration-700"
                style={{ animationDelay: "1800ms", animationFillMode: "backwards" }}
              >
                Change everything.
              </span>
            </h1>
          </div>
        </Screen>
      )}

      {step === "building" && (
        <Screen keyName="building">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative mb-10">
              <div className="h-20 w-20 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 h-20 w-20 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div
                className="absolute inset-0 h-20 w-20 rounded-full"
                style={{
                  boxShadow: "0 0 60px hsl(var(--neon-toxic) / 0.5)",
                }}
              />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4">
              // Setting things up
            </p>
            <h1 className="type-display text-3xl sm:text-4xl leading-tight tracking-tight mb-3">
              We're building<br />your system…
            </h1>
            <p className="text-sm text-muted-foreground/70">
              This is the start of something.
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
    <path fill="#EA4335" d="M12 11v3.27h6.6c-.27 1.4-1.79 4.1-6.6 4.1-3.97 0-7.21-3.29-7.21-7.37s3.24-7.37 7.21-7.37c2.26 0 3.78.96 4.65 1.79l3.17-3.06C17.84 1.62 15.18.5 12 .5 5.92.5 1 5.42 1 11.5S5.92 22.5 12 22.5c6.93 0 11.5-4.86 11.5-11.7 0-.79-.09-1.39-.2-1.99H12z" />
  </svg>
);

export default Onboarding;
