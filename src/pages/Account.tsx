import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Lock, Crown, CreditCard, Trash2, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ResetDataDialog } from "@/components/Profile/ResetDataDialog";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Account = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, subscriptionStatus, signOut, refreshSubscription } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      if (data?.display_name) {
        setDisplayName(data.display_name);
      }
    };

    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your display name has been saved.",
      });
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({
        title: "Error",
        description: "Could not save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const validatePasswordForm = () => {
    const errors: { current?: string; new?: string; confirm?: string } = {};

    if (!currentPassword) {
      errors.current = "Current password is required";
    }

    try {
      passwordSchema.parse(newPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.new = e.errors[0].message;
      }
    }

    if (newPassword !== confirmPassword) {
      errors.confirm = "Passwords do not match";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    setSavingPassword(true);
    try {
      // First verify current password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        setPasswordErrors({ current: "Current password is incorrect" });
        setSavingPassword(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
    } catch (err) {
      console.error("Error changing password:", err);
      toast({
        title: "Error",
        description: "Could not change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      console.error("Error opening customer portal:", err);
      toast({
        title: "Error",
        description: "Could not open billing portal. You may not have an active subscription.",
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Delete user data
      if (user) {
        await supabase.from("user_data").delete().eq("user_id", user.id);
        await supabase.from("profiles").delete().eq("user_id", user.id);
        await supabase.from("subscriptions").delete().eq("user_id", user.id);
        await supabase.from("feedback").delete().eq("user_id", user.id);
        await supabase.from("pro_interest").delete().eq("user_id", user.id);
      }

      // Clear local storage
      localStorage.clear();

      // Sign out
      await signOut();

      toast({
        title: "Account deleted",
        description: "Your account and data have been removed.",
      });

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Error deleting account:", err);
      toast({
        title: "Error",
        description: "Could not delete account. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get plan display info
  const getPlanInfo = () => {
    const { plan, planStatus, purchasePlan } = subscriptionStatus;
    
    let planLabel = "FREE";
    let planBadgeVariant: "default" | "secondary" | "outline" = "secondary";
    let planDescription = "3 hábitos + 3 trackers";

    if (plan === "pro") {
      planLabel = "PRO";
      planBadgeVariant = "default";
      
      if (purchasePlan === "lifetime") {
        planLabel = "PRO Vitalício";
        planDescription = "Acesso ilimitado para sempre";
      } else if (purchasePlan === "yearly") {
        planLabel = "PRO Anual";
        planDescription = "Acesso ilimitado";
      } else {
        planLabel = "PRO Mensal";
        planDescription = "Acesso ilimitado";
      }
    } else if (plan === "trial") {
      planLabel = "TRIAL";
      planBadgeVariant = "outline";
      planDescription = "Experimenta PRO por 48h";
    }

    return { planLabel, planBadgeVariant, planDescription };
  };

  const { planLabel, planBadgeVariant, planDescription } = getPlanInfo();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Conta</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Identity Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Identidade</CardTitle>
            </div>
            <CardDescription>Gere o teu perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="O teu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleSaveProfile} 
              disabled={savingProfile}
              className="w-full sm:w-auto"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Guardar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Segurança</CardTitle>
            </div>
            <CardDescription>Altera a tua password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password atual</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              {passwordErrors.current && (
                <p className="text-sm text-destructive">{passwordErrors.current}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {passwordErrors.new && (
                <p className="text-sm text-destructive">{passwordErrors.new}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {passwordErrors.confirm && (
                <p className="text-sm text-destructive">{passwordErrors.confirm}</p>
              )}
            </div>

            <Button 
              onClick={handleChangePassword} 
              disabled={savingPassword || !currentPassword || !newPassword}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A alterar...
                </>
              ) : (
                "Alterar password"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Subscrição</CardTitle>
            </div>
            <CardDescription>Gere o teu plano</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Plano atual:</span>
                  <Badge variant={planBadgeVariant}>{planLabel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{planDescription}</p>
              </div>
            </div>

            {subscriptionStatus.plan === "pro" && (
              <Button 
                onClick={handleOpenCustomerPortal} 
                disabled={openingPortal}
                variant="outline"
                className="w-full gap-2"
              >
                {openingPortal ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A abrir...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Gerir Faturação
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}

            {subscriptionStatus.trialEnd && (
              <p className="text-sm text-muted-foreground">
                Trial expira: {new Date(subscriptionStatus.trialEnd).toLocaleDateString("pt-PT")}
              </p>
            )}

            {subscriptionStatus.subscriptionEnd && (
              <p className="text-sm text-muted-foreground">
                Próxima renovação: {new Date(subscriptionStatus.subscriptionEnd).toLocaleDateString("pt-PT")}
              </p>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg text-destructive">Zona de Perigo</CardTitle>
            </div>
            <CardDescription>Ações irreversíveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => signOut()}
              className="w-full"
            >
              Terminar sessão
            </Button>

            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Apagar conta e dados
            </Button>
          </CardContent>
        </Card>
      </div>

      <ResetDataDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
};

export default Account;
