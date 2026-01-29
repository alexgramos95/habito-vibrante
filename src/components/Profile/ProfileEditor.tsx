import { useState, useRef, useEffect } from "react";
import { Camera, Loader2, Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ProfileEditorProps {
  locale: string;
}

export const ProfileEditor = ({ locale }: ProfileEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [originalName, setOriginalName] = useState("");

  // Load profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (data) {
        const name = data.display_name || user.email?.split("@")[0] || "";
        setDisplayName(name);
        setOriginalName(name);
        setAvatarUrl(data.avatar_url);
      }
    };

    loadProfile();
  }, [user]);

  const getInitials = () => {
    if (displayName) {
      return displayName[0]?.toUpperCase() || "?";
    }
    if (user?.email) {
      return user.email[0]?.toUpperCase() || "?";
    }
    return "?";
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: locale === "pt-PT" ? "Ficheiro inválido" : "Invalid file",
        description: locale === "pt-PT" 
          ? "Por favor seleciona uma imagem." 
          : "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: locale === "pt-PT" ? "Imagem muito grande" : "Image too large",
        description: locale === "pt-PT" 
          ? "O tamanho máximo é 2MB." 
          : "Maximum size is 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage.from("avatars").remove([fileName]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile in database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString() 
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);

      toast({
        title: locale === "pt-PT" ? "Foto atualizada" : "Photo updated",
        description: locale === "pt-PT" 
          ? "A tua foto de perfil foi guardada." 
          : "Your profile photo has been saved.",
      });
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast({
        title: locale === "pt-PT" ? "Erro" : "Error",
        description: locale === "pt-PT" 
          ? "Não foi possível guardar a foto. Tenta novamente." 
          : "Could not save photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;

    setIsSavingName(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          display_name: displayName.trim(),
          updated_at: new Date().toISOString() 
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setOriginalName(displayName.trim());
      setIsEditingName(false);

      toast({
        title: locale === "pt-PT" ? "Nome atualizado" : "Name updated",
        description: locale === "pt-PT" 
          ? "O teu nome foi guardado." 
          : "Your name has been saved.",
      });
    } catch (err) {
      console.error("Error saving name:", err);
      toast({
        title: locale === "pt-PT" ? "Erro" : "Error",
        description: locale === "pt-PT" 
          ? "Não foi possível guardar o nome." 
          : "Could not save name.",
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
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      {/* Avatar with upload */}
      <div className="relative">
        <button
          onClick={handleAvatarClick}
          disabled={isUploadingAvatar}
          className={cn(
            "relative group rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            isUploadingAvatar && "cursor-wait"
          )}
        >
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          {/* Overlay */}
          <div className={cn(
            "absolute inset-0 rounded-full flex items-center justify-center transition-opacity",
            isUploadingAvatar 
              ? "bg-background/80 opacity-100" 
              : "bg-black/50 opacity-0 group-hover:opacity-100"
          )}>
            {isUploadingAvatar ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Name display/edit */}
      <div className="flex-1 min-w-0">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={locale === "pt-PT" ? "O teu nome" : "Your name"}
              className="h-9"
              autoFocus
              maxLength={50}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSaveName}
              disabled={isSavingName || !displayName.trim()}
              className="h-9 w-9 shrink-0"
            >
              {isSavingName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 text-success" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={isSavingName}
              className="h-9 w-9 shrink-0"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{displayName || (locale === "pt-PT" ? "Sem nome" : "No name")}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditingName(true)}
              className="h-8 w-8 shrink-0"
              title={locale === "pt-PT" ? "Editar nome" : "Edit name"}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
