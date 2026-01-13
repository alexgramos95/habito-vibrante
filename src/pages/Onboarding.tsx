import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Target,
  Sparkles,
  Globe,
  Flame,
  Dumbbell,
  Brain,
  Heart,
  DollarSign,
  Moon,
  Coffee,
  Cigarette,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nContext";
import { localeNames, currencyNames, type Locale, type Currency } from "@/i18n";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

// Improvement areas
const IMPROVEMENT_AREAS = [
  { id: "fitness", icon: Dumbbell, label: "Fitness & Exercise" },
  { id: "mindfulness", icon: Brain, label: "Mindfulness & Focus" },
  { id: "health", icon: Heart, label: "Health & Nutrition" },
  { id: "finances", icon: DollarSign, label: "Savings & Finances" },
  { id: "sleep", icon: Moon, label: "Sleep & Recovery" },
  { id: "productivity", icon: Target, label: "Productivity" },
];

// Identity vectors (who you're becoming)
const IDENTITY_VECTORS = ["Disciplined", "Focused", "Resilient", "Strong", "Calm", "Consistent", "Healthy", "Wealthy"];

// Habit presets based on areas
const HABIT_PRESETS = [
  { id: "meditation", name: "Meditation", category: "mindfulness", icon: "🧘" },
  { id: "exercise", name: "Exercise", category: "fitness", icon: "🏃" },
  { id: "reading", name: "Reading", category: "productivity", icon: "📚" },
  { id: "water", name: "Drink Water", category: "health", icon: "💧" },
  { id: "sleep8h", name: "Sleep 8h", category: "sleep", icon: "😴" },
  { id: "noPhone", name: "No Phone Morning", category: "focus", icon: "📵" },
];

// Tracker presets
const TRACKER_PRESETS = [
  { id: "coffee", name: "Coffee", icon: Coffee, type: "reduce" },
  { id: "cigarettes", name: "Cigarettes", icon: Cigarette, type: "reduce" },
  { id: "gym", name: "Gym Sessions", icon: Dumbbell, type: "increase" },
  { id: "meditation", name: "Meditation", icon: Brain, type: "increase" },
];

type Step = "welcome" | "areas" | "identity" | "presets" | "settings" | "ready";

const Onboarding = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale, currency, setCurrency } = useI18n();
  const { completeOnboarding } = useSubscription();

  const [step, setStep] = useState<Step>("welcome");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<string[]>([]);
  const [customIdentity, setCustomIdentity] = useState("");
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

  const steps: Step[] = ["welcome", "areas", "identity", "presets", "settings", "ready"];
  const currentStepIndex = steps.indexOf(step);
  const progress = (currentStepIndex / (steps.length - 1)) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleComplete = () => {
    // Save onboarding data to localStorage
    const payload = {
      improvementAreas: selectedAreas,
      identityVectors: [...selectedIdentity, customIdentity].filter(Boolean),
      selectedPresets,
      locale,
      currency,
    };

    try {
      localStorage.setItem("become-onboarding-data", JSON.stringify(payload));
      localStorage.setItem("become-onboarding-complete", "true");
      // Legacy key compatibility
      localStorage.setItem("itero-onboarding-complete", "true");
    } catch {
      // If localStorage fails (private mode, etc.), ignore
    }

    // Mark onboarding as completed in subscription state
    // This sets become-onboarding-state.completed = true
    completeOnboarding({
      improvementAreas: selectedAreas,
      identityVectors: [...selectedIdentity, customIdentity].filter(Boolean),
      selectedPresets,
    });

    // Navigate to auth - trial starts after login
    navigate("/auth?next=trial");
  };

  const toggleArea = (id: string) => {
    setSelectedAreas((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const toggleIdentity = (id: string) => {
    setSelectedIdentity((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const togglePreset = (id: string) => {
    setSelectedPresets((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const addCustomIdentity = () => {
    if (customIdentity.trim() && !selectedIdentity.includes(customIdentity.trim())) {
      setSelectedIdentity((prev) => [...prev, customIdentity.trim()]);
      setCustomIdentity("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, hsl(174 72% 46% / 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Progress bar */}
      {step !== "welcome" && step !== "ready" && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-border z-50">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Welcome */}
          {step === "welcome" && (
            <div className="text-center space-y-8 animate-in fade-in duration-500">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-3xl">
                B
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gradient mb-2">{t.app.name}</h1>
                <p className="text-lg text-muted-foreground">Identity-Based Discipline</p>
              </div>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Small consistent actions compound into who you become. Start shaping your identity today.
              </p>
              <Button onClick={handleNext} size="lg" className="w-full gap-2">
                Start Building
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Areas */}
          {step === "areas" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">What do you want to improve?</h2>
                <p className="text-muted-foreground">Select the areas that matter most.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {IMPROVEMENT_AREAS.map((area) => {
                  const Icon = area.icon;
                  const isSelected = selectedAreas.includes(area.id);
                  return (
                    <button
                      key={area.id}
                      onClick={() => toggleArea(area.id)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        isSelected ? "border-primary bg-primary/10" : "border-border/50 hover:border-border",
                      )}
                    >
                      <div className={cn("p-3 rounded-lg", isSelected ? "bg-primary/20" : "bg-secondary")}>
                        <Icon className={cn("h-6 w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <span className="text-sm font-medium text-center">{area.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary absolute top-2 right-2" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1" disabled={selectedAreas.length === 0}>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Identity */}
          {step === "identity" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Who are you becoming?</h2>
                <p className="text-muted-foreground">Select up to 3 identity traits.</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {IDENTITY_VECTORS.map((trait) => {
                  const isSelected = selectedIdentity.includes(trait);
                  return (
                    <button
                      key={trait}
                      onClick={() => toggleIdentity(trait)}
                      className={cn(
                        "px-4 py-2 rounded-full border-2 text-sm font-medium transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/50 hover:border-border",
                      )}
                    >
                      {trait}
                    </button>
                  );
                })}
              </div>

              {/* Custom identity input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Or add your own..."
                  value={customIdentity}
                  onChange={(e) => setCustomIdentity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomIdentity()}
                  className="flex-1"
                />
                <Button variant="outline" onClick={addCustomIdentity} disabled={!customIdentity.trim()}>
                  Add
                </Button>
              </div>

              {selectedIdentity.length > 0 && (
                <Card className="glass border-border/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">You're becoming:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedIdentity.map((trait) => (
                        <Badge key={trait} variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1" disabled={selectedIdentity.length === 0}>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Presets */}
          {step === "presets" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Start with these?</h2>
                <p className="text-muted-foreground">Select starter habits & trackers.</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Habits</p>
                <div className="grid grid-cols-2 gap-2">
                  {HABIT_PRESETS.map((preset) => {
                    const isSelected = selectedPresets.includes(`habit-${preset.id}`);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => togglePreset(`habit-${preset.id}`)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all",
                          isSelected ? "border-primary bg-primary/10" : "border-border/50 hover:border-border",
                        )}
                      >
                        <span className="text-lg">{preset.icon}</span>
                        <span className="text-sm font-medium">{preset.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Trackers</p>
                <div className="grid grid-cols-2 gap-2">
                  {TRACKER_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = selectedPresets.includes(`tracker-${preset.id}`);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => togglePreset(`tracker-${preset.id}`)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all",
                          isSelected ? "border-primary bg-primary/10" : "border-border/50 hover:border-border",
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-sm font-medium">{preset.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">You can add more later. Start small.</p>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Settings */}
          {step === "settings" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center">
                <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Preferences</h2>
                <p className="text-muted-foreground">Set your language and currency.</p>
              </div>

              <Card className="glass border-border/30">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(localeNames).map(([code, name]) => (
                          <SelectItem key={code} value={code}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(currencyNames).map(([code, names]) => (
                          <SelectItem key={code} value={code}>
                            {names[locale]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Ready */}
          {step === "ready" && (
            <div className="text-center space-y-8 animate-in fade-in duration-500">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-success to-primary">
                <Zap className="h-10 w-10 text-white" />
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-3">You’re ready to start.</h2>
                <p className="text-lg text-muted-foreground">
                  Build your streak. Your profile and preferences are set.
                </p>
              </div>

              <Card className="glass border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2 justify-center mb-4">
                    {selectedIdentity.slice(0, 3).map((trait) => (
                      <Badge key={trait} className="bg-primary/20 text-primary border-primary/30">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {trait}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    "Identity &gt; Intensity. Consistency &gt; Perfection."
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button onClick={handleComplete} size="lg" className="w-full gap-2">
                  <Flame className="h-5 w-5" />
                  Start Building
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can always change your preferences later in Settings.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
