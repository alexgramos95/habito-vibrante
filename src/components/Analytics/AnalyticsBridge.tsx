import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { initAnalytics, identifyUser, resetAnalyticsUser, trackPageView } from "@/lib/analytics";

/**
 * Auto-tracks page views and binds PostHog identity to the auth user.
 * Mounted once inside the router/auth providers.
 */
export const AnalyticsBridge = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => { initAnalytics(); }, []);

  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, { email: user.email });
    } else {
      resetAnalyticsUser();
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
};
