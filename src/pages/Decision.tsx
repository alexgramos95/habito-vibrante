import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Download, MessageSquare, Sparkles, ChevronRight, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { FeedbackFormModal } from "@/components/Feedback/FeedbackFormModal";
import { generatePDFExport } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME, FREE_LIMITS } from "@/config/billing";

const Decision = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isEmailVerified, user, refreshSubscription } = useAuth();
  const { trialStatus, isPro } = useSubscription();
  
  const [showPaywall, setShowPaywall] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [choosingFree, setChoosingFree] = useState(false);

  // If user has Pro or active trial, redirect to app
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth", { replace: true });
      return;
    }
    
    if (!isEmailVerified) {
      navigate("/auth?verify=required", { replace: true });
      return;
    }
    
    // If still on trial or is Pro, go back to app
    if (isPro || trialStatus.isActive) {
      navigate("/app", { replace: true });
    }
  }, [isAuthenticated, isEmailVerified, isPro, trialStatus.isActive, navigate]);

  const handleChooseFree = async () => {
    if (!user) return;
    
    setChoosingFree(true);
    try {
      // Update subscription to free with trial_expired status
      const { error } = await supabase
        .from("subscriptions")
        .update({ 
          plan: "free", 
          status: "trial_expired",
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Refresh subscription state in AuthContext so it reflects the new plan
      await refreshSubscription();

      toast({
        title: "Plano FREE ativado",
        description: `Podes usar ${FREE_LIMITS.maxHabits} hábitos. Atualiza a qualquer momento!`,
      });

      // Navigate to app after state is updated
      navigate("/app", { replace: true });
    } catch (err) {
      console.error("Error choosing free:", err);
      toast({
        title: "Erro",
        description: "Não foi possível ativar o plano FREE. Tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setChoosingFree(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await generatePDFExport(user?.email || undefined);
      toast({
        title: "PDF gerado",
        description: "O teu progresso está pronto para download.",
      });
    } catch (err) {
      console.error("Error exporting PDF:", err);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF. Permite popups e tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            O teu trial terminou
          </h1>
          <p className="text-muted-foreground text-lg">
            Obrigado por experimentares a {APP_NAME}. O que gostavas de fazer agora?
          </p>
        </div>

        {/* Action Cards */}
        <div className="space-y-3">
          {/* Continue with Pro - Primary */}
          <Card 
            className="border-2 border-primary bg-primary/5 cursor-pointer hover:bg-primary/8 transition-colors shadow-sm"
            onClick={() => setShowPaywall(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
                  <Crown className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">Continuar com PRO</h3>
                  <p className="text-sm text-muted-foreground">
                    Hábitos ilimitados, trackers e mais
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Continue with FREE */}
          <Card 
            className="cursor-pointer hover:bg-secondary/60 transition-colors border-border shadow-sm"
            onClick={handleChooseFree}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                  {choosingFree ? (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  ) : (
                    <Users className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">Continuar grátis</h3>
                  <p className="text-sm text-muted-foreground">
                    {FREE_LIMITS.maxHabits} hábitos, {FREE_LIMITS.maxTrackers} trackers
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Export PDF */}
          <Card 
            className="cursor-pointer hover:bg-secondary/60 transition-colors border-border shadow-sm"
            onClick={handleExportPDF}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                  {exportingPDF ? (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  ) : (
                    <Download className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">Exportar PDF</h3>
                  <p className="text-sm text-muted-foreground">
                    Faz download do teu progresso
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Give Feedback */}
          <Card 
            className="cursor-pointer hover:bg-secondary/60 transition-colors border-border shadow-sm"
            onClick={() => setShowFeedback(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">Dar feedback</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajuda-nos a melhorar a {APP_NAME}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Obrigado por fazeres parte da {APP_NAME}.
        </p>
      </div>

      {/* Modals */}
      <PaywallModal 
        open={showPaywall} 
        onClose={() => setShowPaywall(false)} 
      />
      
      <FeedbackFormModal 
        open={showFeedback} 
        onClose={() => setShowFeedback(false)} 
      />
    </div>
  );
};

export default Decision;
