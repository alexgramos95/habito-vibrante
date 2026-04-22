import { useState, useRef, useEffect } from "react";
import { Camera, Loader2, Check, X, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface OperatorHeroProps {
  locale: string;
  level: number;
  activeHabits: number;
}

export const OperatorHero = ({ locale, level, activeHabits }: OperatorHeroProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setDisplayName(locale === "pt-PT" ? "Visitante" : "Guest");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      const name =
        data?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        (locale === "pt-PT" ? "Sem nome" : "No name");

      setDisplayName(name);
      setOriginalName(name);
      setAvatarUrl(data?.avatar_url ?? null);
    };

    loadProfile();
  }, [user, locale]);

  const displayEmail = user?.email || (locale === "pt-PT" ? "Não autenticado" : "Not signed in");

  const handleAvatarClick = () => {
    if (!user) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: locale === "pt-PT" ? "Ficheiro inválido" : "Invalid file",
        description: locale === "pt-PT" ? "Por favor seleciona uma imagem." : "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: locale === "pt-PT" ? "Imagem muito grande" : "Image too large",
        description: locale === "pt-PT" ? "O tamanho máximo é 2MB." : "Maximum size is 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      await supabase.storage.from("avatars").remove([fileName]);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);

      toast({
        title: locale === "pt-PT" ? "Foto atualizada" : "Photo updated",
      });
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast({
        title: locale === "pt-PT" ? "Erro" : "Error",
        description: locale === "pt-PT" ? "Não foi possível guardar a foto." : "Could not save photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    const trimmed = displayName.trim();

    if (trimmed.length > 100) {
      toast({
        title: locale === "pt-PT" ? "Nome muito longo" : "Name too long",
        variant: "destructive",
      });
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;

      setOriginalName(trimmed);
      setIsEditingName(false);
      toast({ title: locale === "pt-PT" ? "Nome atualizado" : "Name updated" });
    } catch (err) {
      console.error("Error saving name:", err);
      toast({
        title: locale === "pt-PT" ? "Erro ao guardar" : "Save error",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    setDisplayName(originalName);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveName();
    else if (e.key === "Escape") handleCancelEdit();
  };

  const initial = displayName[0]?.toUpperCase() || "G";

  return (
    <div className="border-2 border-primary/40 bg-card shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.4)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
        // OPERADOR
      </p>
      <div className="flex items-center gap-4">
        {/* Avatar (clickable) */}
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={!user || isUploadingAvatar}
          className={cn(
            "relative h-14 w-14 shrink-0 overflow-hidden border-2 border-primary bg-primary/15 shadow-[2px_2px_0_0_hsl(var(--neon-ultra))] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background group",
            !user && "cursor-not-allowed opacity-70",
            isUploadingAvatar && "cursor-wait"
          )}
          aria-label={locale === "pt-PT" ? "Alterar foto" : "Change photo"}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-black italic uppercase tracking-tighter text-2xl text-primary">
              {initial}
            </span>
          )}

          {user && (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity",
                isUploadingAvatar
                  ? "bg-background/80 opacity-100"
                  : "bg-black/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              )}
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Camera className="h-4 w-4 text-white" />
              )}
            </div>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Name + email + meta */}
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={locale === "pt-PT" ? "O teu nome" : "Your name"}
                className="h-8 text-sm flex-1 min-w-0 font-black italic uppercase tracking-tighter"
                autoFocus
                maxLength={50}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSaveName}
                disabled={isSavingName || !displayName.trim()}
                className="h-8 w-8 shrink-0"
              >
                {isSavingName ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-success" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isSavingName}
                className="h-8 w-8 shrink-0"
              >
                <X className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-black italic uppercase tracking-tighter text-xl text-foreground truncate flex-1 min-w-0">
                {displayName}
              </p>
              {user && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditingName(true)}
                  className="h-7 w-7 shrink-0 -mr-1"
                  title={locale === "pt-PT" ? "Editar nome" : "Edit name"}
                  aria-label={locale === "pt-PT" ? "Editar nome" : "Edit name"}
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}

          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70 truncate">
            {displayEmail}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary">
              <Star className="h-3 w-3" /> LV.{level}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {activeHabits} {locale === "pt-PT" ? "ATIVOS" : "ACTIVE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
