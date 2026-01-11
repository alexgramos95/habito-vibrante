import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Target, Bell, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nContext";
import { localeNames, currencyNames, type Locale, type Currency } from "@/i18n";
import { cn } from "@/lib/utils";

const Onboarding = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale, currency, setCurrency } = useI18n();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Sparkles,
      title: t.onboarding.welcome,
      description: t.onboarding.intro,
    },
    {
      icon: Target,
      title: t.onboarding.step1Title,
      description: t.onboarding.step1Description,
    },
    {
      icon: Bell,
      title: t.onboarding.step2Title,
      description: t.onboarding.step2Description,
    },
    {
      icon: Globe,
      title: t.onboarding.step3Title,
      description: t.onboarding.step3Description,
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('itero-onboarding-complete', 'true');
      navigate('/');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('itero-onboarding-complete', 'true');
    navigate('/');
  };

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Background gradient */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, hsl(174 72% 46% / 0.08) 0%, transparent 60%)'
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-2xl mb-4">
            I
          </div>
          <h1 className="text-3xl font-bold text-gradient">{t.app.name}</h1>
          <p className="text-muted-foreground mt-1">{t.app.tagline}</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-2">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === step ? "w-8 bg-primary" : "w-2 bg-border"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <Card className="glass border-border/30">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-3">{currentStep.title}</h2>
            <p className="text-muted-foreground">{currentStep.description}</p>

            {/* Settings step */}
            {step === 3 && (
              <div className="mt-6 space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.profile.language}</label>
                  <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(localeNames).map(([code, name]) => (
                        <SelectItem key={code} value={code}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.profile.currency}</label>
                  <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(currencyNames).map(([code, names]) => (
                        <SelectItem key={code} value={code}>{names[locale]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleSkip} className="flex-1">
            {t.actions.skip}
          </Button>
          <Button onClick={handleNext} className="flex-1 gap-2">
            {step === steps.length - 1 ? t.onboarding.letsGo : t.actions.next}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
