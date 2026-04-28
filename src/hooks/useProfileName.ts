import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * useProfileName — single source of truth for the user's name across the app.
 *
 * Priority:
 *   1. profiles.display_name (canonical, edited from Account page)
 *   2. user_metadata.full_name (set at signup / OAuth)
 *   3. email local-part (last-resort fallback)
 *
 * Returns both the full display name and a first name suitable for greetings.
 */
export const useProfileName = () => {
  const { user, isAuthenticated } = useAuth();
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setProfileName(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setProfileName(data?.display_name?.trim() || null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const metaName = (user?.user_metadata?.full_name as string | undefined)?.trim();
  const emailHandle = user?.email?.split("@")[0];

  const fullName = profileName || metaName || "";
  // Only fall back to email handle when there is truly nothing else.
  const displayName = fullName || emailHandle || "";

  // First name — split on space; never expose the email handle as a first name
  // since handles like "alexgramos95" read as a username, not a name.
  const firstName = fullName ? fullName.split(/\s+/)[0] : "";

  return {
    isAuthenticated,
    /** Best name to show in long form (header, profile). May be email handle as last resort. */
    displayName,
    /** Friendly first name for greetings. Empty string when no real name is available. */
    firstName,
    /** Raw profile-name from DB (null while loading or unset). */
    profileName,
  };
};
